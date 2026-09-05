// Zone-name strings live only here, isolated from the file-tailing logic in
// log_watcher.rs, so a non-English client can be supported later by adding
// another `LogLocale` impl rather than touching how the log is read (D21).

pub struct ZoneEnteredEvent {
    pub zone: String,
    pub raw_timestamp: String,
}

pub trait LogLocale: Send + Sync {
    fn parse_zone_entered(&self, line: &str) -> Option<ZoneEnteredEvent>;
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
}
