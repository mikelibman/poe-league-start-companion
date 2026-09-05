// Zone-name strings live only here, isolated from the file-tailing logic in
// log_watcher.rs, so a non-English client can be supported later by adding
// another `LogLocale` impl rather than touching how the log is read (D21).

pub struct ZoneEnteredEvent {
    pub zone: String,
    pub raw_timestamp: String,
}

// The player's own level-up broadcast — "<Name> (<Class>) is now level <N>"
// — confirmed against a real Client.txt: it's the one reliable place the
// client logs the local character's own name (Client.txt never logs it on
// the zone-entry line itself, or anywhere at character-select/login). It
// fires within the first minute or two of a run, well before the league's
// exact identity matters, so it's used as a name/class suggestion rather
// than a guarantee — the user still confirms it (see useRunTracker.ts).
pub struct CharacterLevelEvent {
    pub name: String,
    pub class: String,
    pub level: u32,
}

pub trait LogLocale: Send + Sync {
    fn parse_zone_entered(&self, line: &str) -> Option<ZoneEnteredEvent>;
    fn parse_character_level(&self, line: &str) -> Option<CharacterLevelEvent>;
}

pub struct EnglishLocale;

impl LogLocale for EnglishLocale {
    fn parse_zone_entered(&self, line: &str) -> Option<ZoneEnteredEvent> {
        const MARKER: &str = "] : You have entered ";
        let marker_idx = line.find(MARKER)?;
        let raw_timestamp = line.get(0..19)?.to_string();
        let zone_part = &line[marker_idx + MARKER.len()..];
        let zone = zone_part.strip_suffix('.')?.trim().to_string();
        if zone.is_empty() {
            return None;
        }
        Some(ZoneEnteredEvent { zone, raw_timestamp })
    }

    fn parse_character_level(&self, line: &str) -> Option<CharacterLevelEvent> {
        const MARKER: &str = "] : ";
        const IS_NOW_LEVEL: &str = ") is now level ";

        let marker_idx = line.find(MARKER)?;
        let message = &line[marker_idx + MARKER.len()..];

        let is_now_level_idx = message.find(IS_NOW_LEVEL)?;
        let level: u32 = message[is_now_level_idx + IS_NOW_LEVEL.len()..]
            .trim()
            .parse()
            .ok()?;

        let before = &message[..is_now_level_idx];
        let open_paren_idx = before.rfind('(')?;
        let name = before[..open_paren_idx].trim().to_string();
        let class = before[open_paren_idx + 1..].trim().to_string();

        if name.is_empty() || class.is_empty() {
            return None;
        }

        Some(CharacterLevelEvent { name, class, level })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_real_zone_entered_line() {
        let line = "2021/05/22 14:35:26 158538765 cff28422 [INFO Client 1234] : You have entered Lioneye's Watch.";
        let event = EnglishLocale.parse_zone_entered(line).unwrap();
        assert_eq!(event.zone, "Lioneye's Watch");
        assert_eq!(event.raw_timestamp, "2021/05/22 14:35:26");
    }

    #[test]
    fn ignores_unrelated_lines() {
        let line = "2021/05/22 14:35:26 158538765 cff28422 [INFO Client 1234] : Connecting to instance server at 1.2.3.4:6112";
        assert!(EnglishLocale.parse_zone_entered(line).is_none());
    }

    #[test]
    fn ignores_town_hideout_lines_missing_trailing_period() {
        let line = "2021/05/22 14:35:26 158538765 cff28422 [INFO Client 1234] : You have entered a broken line without a period";
        assert!(EnglishLocale.parse_zone_entered(line).is_none());
    }

    #[test]
    fn parses_a_real_level_up_line() {
        // Verified against a real Client.txt.
        let line = "2025/06/08 15:45:57 73024375 cff94598 [INFO Client 45700] : WolfTestOne (Witch) is now level 2";
        let event = EnglishLocale.parse_character_level(line).unwrap();
        assert_eq!(event.name, "WolfTestOne");
        assert_eq!(event.class, "Witch");
        assert_eq!(event.level, 2);
    }

    #[test]
    fn parses_an_ascendancy_class_after_respec() {
        let line = "2025/06/08 18:43:19 83666375 cff94598 [INFO Client 45700] : WolfTestOne (Elementalist) is now level 34";
        let event = EnglishLocale.parse_character_level(line).unwrap();
        assert_eq!(event.class, "Elementalist");
        assert_eq!(event.level, 34);
    }

    #[test]
    fn ignores_death_lines() {
        let line = "2025/06/08 16:51:14 76941546 cff94598 [INFO Client 45700] : WolfTestOne has been slain.";
        assert!(EnglishLocale.parse_character_level(line).is_none());
    }

    #[test]
    fn ignores_zone_entered_lines_as_level_events() {
        let line = "2021/05/22 14:35:26 158538765 cff28422 [INFO Client 1234] : You have entered Lioneye's Watch.";
        assert!(EnglishLocale.parse_character_level(line).is_none());
    }
}
