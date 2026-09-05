// Gem plan module: the one bit of backend work is decoding a pasted Path
// of Building export code into a list of gem names. PoB's export format
// (base64 -> raw DEFLATE -> XML with <Gem nameSpec="..."> elements) is a
// stable, widely-documented convention across the PoB tooling ecosystem,
// but — per the spec's accepted PoB-format risk (D28) — this has NOT been
// verified against a real PoB export string in this environment. Treat it
// as best-understanding-of-the-format until confirmed against a real code.

use base64::Engine;
use quick_xml::events::{BytesStart, Event};
use quick_xml::reader::Reader;
use quick_xml::XmlVersion;
use serde::Serialize;
use std::collections::BTreeSet;
use std::io::Read;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PobImportResult {
    gem_names: Vec<String>,
}

fn decode_pob_code(code: &str) -> Result<Vec<u8>, String> {
    use base64::engine::general_purpose::{STANDARD, STANDARD_NO_PAD, URL_SAFE, URL_SAFE_NO_PAD};

    URL_SAFE_NO_PAD
        .decode(code)
        .or_else(|_| URL_SAFE.decode(code))
        .or_else(|_| STANDARD_NO_PAD.decode(code))
        .or_else(|_| STANDARD.decode(code))
        .map_err(|_| {
            "couldn't base64-decode this code — check you copied the full export string"
                .to_string()
        })
}

fn decompress_pob(bytes: &[u8]) -> Result<String, String> {
    let mut decoder = flate2::read::DeflateDecoder::new(bytes);
    let mut xml = String::new();
    decoder
        .read_to_string(&mut xml)
        .map_err(|e| format!("couldn't decompress the decoded data: {e}"))?;
    Ok(xml)
}

fn find_attr(tag: &BytesStart, key: &[u8]) -> Option<String> {
    tag.attributes()
        .flatten()
        .find(|a| a.key.as_ref() == key)
        .and_then(|a| {
            a.normalized_value(XmlVersion::Implicit1_0)
                .ok()
                .map(|v| v.into_owned())
        })
}

/// Scans for every `<Gem>` element anywhere in the document (regardless of
/// nesting under `<SkillSet>`/`<Skill>`, which varies across PoB versions)
/// and reads its display name. Deliberately permissive rather than tied to
/// one exact schema shape.
fn extract_gem_names(xml: &str) -> Result<Vec<String>, String> {
    let mut reader = Reader::from_str(xml);
    let mut names = BTreeSet::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Eof) => break,
            Ok(Event::Start(tag)) | Ok(Event::Empty(tag)) if tag.name().as_ref() == b"Gem" => {
                if let Some(name) =
                    find_attr(&tag, b"nameSpec").or_else(|| find_attr(&tag, b"skillId"))
                {
                    if !name.is_empty() {
                        names.insert(name);
                    }
                }
            }
            Ok(_) => {}
            Err(e) => return Err(format!("invalid XML after decompression: {e}")),
        }
        buf.clear();
    }

    Ok(names.into_iter().collect())
}

#[tauri::command]
pub fn gemplan_parse_pob(code: String) -> Result<PobImportResult, String> {
    let trimmed = code.trim();
    if trimmed.is_empty() {
        return Err("paste a Path of Building export code first".to_string());
    }
    let bytes = decode_pob_code(trimmed)?;
    let xml = decompress_pob(&bytes)?;
    let gem_names = extract_gem_names(&xml)?;
    if gem_names.is_empty() {
        return Err(
            "no <Gem> elements found — this doesn't look like a Path of Building export code"
                .to_string(),
        );
    }
    Ok(PobImportResult { gem_names })
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use std::io::Write;

    /// Builds a fake PoB-shaped export code the same way PoB itself would
    /// (raw-deflate the XML, then URL-safe-base64 it), so this test proves
    /// the decode pipeline is internally consistent. It does NOT prove the
    /// assumed XML schema (<Gem nameSpec="...">) matches a real PoB export —
    /// that half is unverified (see module doc comment).
    fn make_pob_code(xml: &str) -> String {
        let mut encoder =
            flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
        encoder.write_all(xml.as_bytes()).unwrap();
        let compressed = encoder.finish().unwrap();
        URL_SAFE_NO_PAD.encode(compressed)
    }

    #[test]
    fn parses_gem_names_from_a_synthetic_pob_export() {
        let xml = r#"<PathOfBuilding>
            <Skills>
                <SkillSet id="1">
                    <Skill enabled="true">
                        <Gem nameSpec="Fireball" level="20" quality="20" enabled="true"/>
                        <Gem nameSpec="Added Fire Damage Support" level="20" quality="20" enabled="true"/>
                    </Skill>
                </SkillSet>
            </Skills>
        </PathOfBuilding>"#;
        let code = make_pob_code(xml);

        let result = gemplan_parse_pob(code).unwrap();
        assert_eq!(
            result.gem_names,
            vec!["Added Fire Damage Support".to_string(), "Fireball".to_string()]
        );
    }

    #[test]
    fn falls_back_to_skill_id_when_name_spec_is_missing() {
        let xml = r#"<PathOfBuilding><Gem skillId="Spark" enabled="true"/></PathOfBuilding>"#;
        let code = make_pob_code(xml);
        let result = gemplan_parse_pob(code).unwrap();
        assert_eq!(result.gem_names, vec!["Spark".to_string()]);
    }

    #[test]
    fn rejects_empty_input() {
        assert!(gemplan_parse_pob("".to_string()).is_err());
        assert!(gemplan_parse_pob("   ".to_string()).is_err());
    }

    #[test]
    fn rejects_garbage_that_is_not_base64() {
        let result = gemplan_parse_pob("not valid base64!!! @@@".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn rejects_valid_base64_with_no_gems() {
        let code = make_pob_code("<PathOfBuilding><Build/></PathOfBuilding>");
        let result = gemplan_parse_pob(code);
        assert!(result.is_err());
    }
}
