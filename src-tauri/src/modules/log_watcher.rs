// Core service: detects and tails Client.txt, emitting parsed zone-entry
// events to the frontend. This — plus manual user input elsewhere in the
// app — is the *only* data source the app ever reads; it never touches
// PoE's process memory (spec Constraints, D8).

use super::app_data_dir;
use super::log_locale::{EnglishLocale, LogLocale};
use crate::storage;
use serde::Serialize;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const STORE_NAME: &str = "log_watcher";
const ZONE_ENTERED_EVENT: &str = "log-watcher://zone-entered";
const CHARACTER_LEVEL_EVENT: &str = "log-watcher://character-level";
const ERROR_EVENT: &str = "log-watcher://error";

#[derive(Default)]
pub struct WatcherHandle {
    running: Arc<AtomicBool>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ZoneEnteredPayload {
    zone: String,
    raw_timestamp: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CharacterLevelPayload {
    name: String,
    character_class: String,
    level: u32,
}

/// Common Steam/standalone install locations, checked in order. Not
/// exhaustive — a custom Steam library or install path falls back to the
/// manual browse/override (D20).
fn candidate_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    for drive in ["C:", "D:", "E:"] {
        candidates.push(PathBuf::from(format!(
            "{drive}\\Program Files (x86)\\Grinding Gear Games\\Path of Exile\\logs\\Client.txt"
        )));
        candidates.push(PathBuf::from(format!(
            "{drive}\\Program Files\\Grinding Gear Games\\Path of Exile\\logs\\Client.txt"
        )));
        candidates.push(PathBuf::from(format!(
            "{drive}\\Steam\\steamapps\\common\\Path of Exile\\logs\\Client.txt"
        )));
        candidates.push(PathBuf::from(format!(
            "{drive}\\Program Files (x86)\\Steam\\steamapps\\common\\Path of Exile\\logs\\Client.txt"
        )));
        candidates.push(PathBuf::from(format!(
            "{drive}\\SteamLibrary\\steamapps\\common\\Path of Exile\\logs\\Client.txt"
        )));
    }
    candidates
}

#[tauri::command]
pub fn logwatcher_detect_path() -> Option<String> {
    candidate_paths()
        .into_iter()
        .find(|p| p.is_file())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn logwatcher_get_path(app: AppHandle) -> Result<Option<String>, String> {
    let data_dir = app_data_dir(&app)?;
    let value = storage::read_store(&data_dir, STORE_NAME).map_err(|e| e.to_string())?;
    Ok(value
        .get("path")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string()))
}

#[tauri::command]
pub fn logwatcher_set_path(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).is_file() {
        return Err(format!("no such file: {path}"));
    }
    let data_dir = app_data_dir(&app)?;
    let value = serde_json::json!({ "path": path });
    storage::write_store(&data_dir, STORE_NAME, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn logwatcher_start(
    app: AppHandle,
    handle: State<WatcherHandle>,
    path: String,
) -> Result<(), String> {
    if handle.running.swap(true, Ordering::SeqCst) {
        return Ok(()); // already watching
    }
    let running = handle.running.clone();
    std::thread::spawn(move || tail_loop(app, path, running));
    Ok(())
}

#[tauri::command]
pub fn logwatcher_stop(handle: State<WatcherHandle>) {
    handle.running.store(false, Ordering::SeqCst);
}

/// Starts tailing automatically on launch if a path was already configured,
/// so a restart doesn't require the user to re-select Client.txt every time.
pub fn autostart(app: &AppHandle, handle: &WatcherHandle) {
    let Ok(Some(path)) = logwatcher_get_path(app.clone()) else {
        return;
    };
    if !Path::new(&path).is_file() {
        return;
    }
    if handle.running.swap(true, Ordering::SeqCst) {
        return;
    }
    let running = handle.running.clone();
    let app = app.clone();
    std::thread::spawn(move || tail_loop(app, path, running));
}

fn tail_loop(app: AppHandle, path: String, running: Arc<AtomicBool>) {
    let locale = EnglishLocale;

    let mut file = match std::fs::File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            let _ = app.emit(ERROR_EVENT, format!("could not open log file: {e}"));
            running.store(false, Ordering::SeqCst);
            return;
        }
    };

    // A live tool cares about what happens next, not history — start
    // reading from the current end of file rather than replaying it.
    let mut position = match file.seek(SeekFrom::End(0)) {
        Ok(p) => p,
        Err(e) => {
            let _ = app.emit(ERROR_EVENT, format!("could not seek log file: {e}"));
            running.store(false, Ordering::SeqCst);
            return;
        }
    };

    let mut leftover = String::new();

    while running.load(Ordering::SeqCst) {
        std::thread::sleep(Duration::from_millis(250));

        let metadata = match file.metadata() {
            Ok(m) => m,
            Err(e) => {
                let _ = app.emit(ERROR_EVENT, format!("log read failure: {e}"));
                break;
            }
        };

        // File shrank (cleared/rotated mid-session): an accepted v1 edge
        // case, surfaced as an error with no auto-recovery attempt (D22).
        if metadata.len() < position {
            let _ = app.emit(
                ERROR_EVENT,
                "log file was truncated or rotated; restart the watcher".to_string(),
            );
            break;
        }

        if metadata.len() == position {
            continue;
        }

        if let Err(e) = file.seek(SeekFrom::Start(position)) {
            let _ = app.emit(ERROR_EVENT, format!("log read failure: {e}"));
            break;
        }

        let mut buf = Vec::new();
        if let Err(e) = file.read_to_end(&mut buf) {
            let _ = app.emit(ERROR_EVENT, format!("log read failure: {e}"));
            break;
        }
        position = metadata.len();

        let chunk = String::from_utf8_lossy(&buf);
        for event in extract_log_events(&mut leftover, &chunk, &locale) {
            match event {
                ParsedEvent::Zone(zone) => {
                    let _ = app.emit(
                        ZONE_ENTERED_EVENT,
                        ZoneEnteredPayload {
                            zone: zone.zone,
                            raw_timestamp: zone.raw_timestamp,
                        },
                    );
                }
                ParsedEvent::CharacterLevel(level) => {
                    let _ = app.emit(
                        CHARACTER_LEVEL_EVENT,
                        CharacterLevelPayload {
                            name: level.name,
                            character_class: level.class,
                            level: level.level,
                        },
                    );
                }
            }
        }
    }

    running.store(false, Ordering::SeqCst);
}

enum ParsedEvent {
    Zone(super::log_locale::ZoneEnteredEvent),
    CharacterLevel(super::log_locale::CharacterLevelEvent),
}

/// Appends `chunk` to `leftover`, splits out every complete line, and parses
/// each one — leaving any trailing partial line (a chunk boundary can land
/// mid-line) in `leftover` for the next call. Kept pure and file-I/O-free so
/// the line-buffering behavior is unit-testable without a real file handle.
fn extract_log_events(
    leftover: &mut String,
    chunk: &str,
    locale: &dyn LogLocale,
) -> Vec<ParsedEvent> {
    leftover.push_str(chunk);
    let mut events = Vec::new();
    while let Some(newline_idx) = leftover.find('\n') {
        let line: String = leftover.drain(..=newline_idx).collect();
        let line = line.trim_end_matches(['\r', '\n']);
        if let Some(event) = locale.parse_zone_entered(line) {
            events.push(ParsedEvent::Zone(event));
        } else if let Some(event) = locale.parse_character_level(line) {
            events.push(ParsedEvent::CharacterLevel(event));
        }
    }
    events
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::log_locale::EnglishLocale;

    fn zone_names(events: &[ParsedEvent]) -> Vec<&str> {
        events
            .iter()
            .filter_map(|e| match e {
                ParsedEvent::Zone(z) => Some(z.zone.as_str()),
                ParsedEvent::CharacterLevel(_) => None,
            })
            .collect()
    }

    #[test]
    fn parses_a_complete_line_delivered_in_one_chunk() {
        let mut leftover = String::new();
        let chunk = "2021/05/22 14:35:26 1 a [INFO Client 1] : You have entered Lioneye's Watch.\n";
        let events = extract_log_events(&mut leftover, chunk, &EnglishLocale);
        assert_eq!(zone_names(&events), vec!["Lioneye's Watch"]);
        assert_eq!(leftover, "");
    }

    #[test]
    fn buffers_a_line_split_across_two_chunks() {
        let mut leftover = String::new();
        let first_half = "2021/05/22 14:35:26 1 a [INFO Client 1] : You have entered Lion";
        let second_half = "eye's Watch.\n";

        let events = extract_log_events(&mut leftover, first_half, &EnglishLocale);
        assert!(events.is_empty());
        assert_eq!(leftover, first_half);

        let events = extract_log_events(&mut leftover, second_half, &EnglishLocale);
        assert_eq!(zone_names(&events), vec!["Lioneye's Watch"]);
        assert_eq!(leftover, "");
    }

    #[test]
    fn parses_multiple_lines_in_one_chunk_and_keeps_trailing_partial() {
        let mut leftover = String::new();
        let chunk = "2021/05/22 14:35:26 1 a [INFO Client 1] : You have entered Town.\n\
             2021/05/22 14:36:00 1 a [INFO Client 1] : You have entered The Coast.\n\
             2021/05/22 14:36:01 1 a [INFO Client 1] : partial next line without newline";
        let events = extract_log_events(&mut leftover, chunk, &EnglishLocale);
        assert_eq!(zone_names(&events), vec!["Town", "The Coast"]);
        assert_eq!(leftover, "2021/05/22 14:36:01 1 a [INFO Client 1] : partial next line without newline");
    }

    #[test]
    fn parses_a_character_level_line() {
        let mut leftover = String::new();
        let chunk = "2025/06/08 15:45:57 1 a [INFO Client 1] : WolfTestOne (Witch) is now level 2\n";
        let events = extract_log_events(&mut leftover, chunk, &EnglishLocale);
        assert_eq!(events.len(), 1);
        match &events[0] {
            ParsedEvent::CharacterLevel(e) => {
                assert_eq!(e.name, "WolfTestOne");
                assert_eq!(e.class, "Witch");
                assert_eq!(e.level, 2);
            }
            ParsedEvent::Zone(_) => panic!("expected a CharacterLevel event"),
        }
    }

    #[test]
    fn parses_a_mixed_chunk_of_zone_and_level_events_in_order() {
        let mut leftover = String::new();
        let chunk = "2025/06/08 15:44:49 1 a [INFO Client 1] : You have entered The Twilight Strand.\n\
             2025/06/08 15:45:57 1 a [INFO Client 1] : WolfTestOne (Witch) is now level 2\n\
             2025/06/08 15:48:00 1 a [INFO Client 1] : You have entered The Coast.\n";
        let events = extract_log_events(&mut leftover, chunk, &EnglishLocale);
        assert_eq!(events.len(), 3);
        assert!(matches!(&events[0], ParsedEvent::Zone(z) if z.zone == "The Twilight Strand"));
        assert!(matches!(&events[1], ParsedEvent::CharacterLevel(c) if c.name == "WolfTestOne"));
        assert!(matches!(&events[2], ParsedEvent::Zone(z) if z.zone == "The Coast"));
    }

    #[test]
    fn parses_an_unmodified_excerpt_from_a_real_client_txt() {
        // Verbatim lines 925-944 from a real Client.txt (shared by the
        // user), covering a Twilight Strand entry through the first
        // level-up, with all the real surrounding noise line types
        // (bracketed [SCENE]/[Item Filter]/[InGameAudioManager] tags etc.)
        // in between — proving those don't false-positive against the
        // `] : ` marker both parsers look for.
        let chunk = "2025/06/08 15:44:48 72955625 1186a040 [DEBUG Client 45700] Client-Safe Instance ID = 1789811065\n\
2025/06/08 15:44:48 72955625 1186a062 [DEBUG Client 45700] Generating level 1 area \"1_1_1\" with seed 563695978\n\
2025/06/08 15:44:48 72956000 f22b69e1 [INFO Client 45700] Tile hash: 3656364838\n\
2025/06/08 15:44:48 72956000 f22b69e6 [INFO Client 45700] Doodad hash: 2558741989\n\
2025/06/08 15:44:48 72956015 e0343728 [DEBUG Client 45700] [SCENE] Height Map Texture: 780 x 420\n\
2025/06/08 15:44:48 72956046 e0345004 [DEBUG Client 45700] [SCENE] Walkability Texture: 598 x 322\n\
2025/06/08 15:44:49 72956468 1187ac47 [DEBUG Client 45700] Joined guild named Insanity with 8 members \n\
2025/06/08 15:44:49 72956562 cff94598 [INFO Client 45700] : You have entered The Twilight Strand.\n\
2025/06/08 15:44:49 72956671 cff94598 [INFO Client 45700] : You have joined trade chat channel 820 English.\n\
2025/06/08 15:44:49 72956687 cff94598 [INFO Client 45700] : You have joined global chat channel 666 English.\n\
2025/06/08 15:44:49 72956734 d5c98b06 [INFO Client 45700] [SHADER] Delay: ON\n\
2025/06/08 15:44:49 72956765 374e0d23 [INFO Client 45700] [Item Filter] Preparing to download online filter 78qOyRhP\n\
2025/06/08 15:44:49 72956765 374e0cc2 [INFO Client 45700] [Item Filter] Hash for online filter 78qOyRhP is: 707033b2bdf973965301177e517e16c0\n\
2025/06/08 15:44:49 72956921 374e0cc8 [INFO Client 45700] [Item Filter] Online item filter 78qOyRhP returned status: 200\n\
2025/06/08 15:44:49 72956921 374e0ce4 [DEBUG Client 45700] [Item Filter] Online item filter request resolved to: 24.200.0.169\n\
2025/06/08 15:44:49 72956921 374df809 [INFO Client 45700] [Item Filter] Successfully saved online filter 78qOyRhP. Hash is now: 707033b2bdf973965301177e517e16c0\n\
2025/06/08 15:44:49 72956921 78847524 [INFO Client 45700] [Item Filter] Finished reloading online filter 78qOyRhP. Result: true. Hash: 707033b2bdf973965301177e517e16c0. Type: Normal. Message: \n\
2025/06/08 15:45:16 72984125 19dc40 [DEBUG Client 45700] [InGameAudioManager] TalkingPetAudioEvent 'Bored' triggered\n\
2025/06/08 15:45:57 73024375 cff94598 [INFO Client 45700] : WolfTestOne (Witch) is now level 2\n\
2025/06/08 15:45:57 73024406 19dc40 [DEBUG Client 45700] [InGameAudioManager] TalkingPetAudioEvent 'LevelUp' triggered\n";

        let mut leftover = String::new();
        let events = extract_log_events(&mut leftover, chunk, &EnglishLocale);

        assert_eq!(events.len(), 2, "expected exactly one zone + one level event, got {}", events.len());
        assert!(matches!(&events[0], ParsedEvent::Zone(z) if z.zone == "The Twilight Strand"));
        match &events[1] {
            ParsedEvent::CharacterLevel(c) => {
                assert_eq!(c.name, "WolfTestOne");
                assert_eq!(c.class, "Witch");
                assert_eq!(c.level, 2);
            }
            ParsedEvent::Zone(_) => panic!("expected the level-up line to parse as CharacterLevel"),
        }
    }
}
