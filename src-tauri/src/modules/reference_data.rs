// Core service: fetches the hosted reference-data feed (quest rewards,
// vendor stock, item bases, gambling vendor list) at runtime and caches the
// last successful fetch locally, so the app still works mid-race without
// internet (spec: Data Model & Storage, D15/D16). Never bundled with the
// app — that's the point, a patch correction is a commit to this repo's
// reference-data/ folder, not a new release.

use super::app_data_dir;
use crate::storage;
use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

const STORE_NAME: &str = "reference_data";

const REFERENCE_DATA_URL: &str = "https://raw.githubusercontent.com/mikelibman/poe-league-start-companion/master/reference-data/reference-data.json";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceDataResult {
    data: Value,
    source: &'static str,
    cached_at_unix_seconds: Option<u64>,
}

async fn fetch_json(url: &str) -> Result<Value, String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("unexpected status: {}", response.status()));
    }
    response
        .json::<Value>()
        .await
        .map_err(|e| format!("invalid JSON: {e}"))
}

fn wrap_for_cache(data: &Value, cached_at_unix_seconds: u64) -> Value {
    serde_json::json!({ "data": data, "cachedAtUnixSeconds": cached_at_unix_seconds })
}

fn unwrap_cache(envelope: &Value) -> Option<(Value, u64)> {
    let data = envelope.get("data")?.clone();
    let cached_at = envelope.get("cachedAtUnixSeconds")?.as_u64()?;
    Some((data, cached_at))
}

fn now_unix_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub async fn refdata_load(app: AppHandle) -> Result<ReferenceDataResult, String> {
    match fetch_json(REFERENCE_DATA_URL).await {
        Ok(data) => {
            let cached_at = now_unix_seconds();
            let data_dir = app_data_dir(&app)?;
            let envelope = wrap_for_cache(&data, cached_at);
            storage::write_store(&data_dir, STORE_NAME, &envelope).map_err(|e| e.to_string())?;
            Ok(ReferenceDataResult {
                data,
                source: "network",
                cached_at_unix_seconds: Some(cached_at),
            })
        }
        Err(fetch_err) => {
            let data_dir = app_data_dir(&app)?;
            let cached = storage::read_store(&data_dir, STORE_NAME).map_err(|e| e.to_string())?;
            match unwrap_cache(&cached) {
                Some((data, cached_at)) => Ok(ReferenceDataResult {
                    data,
                    source: "cache",
                    cached_at_unix_seconds: Some(cached_at),
                }),
                None => Err(format!(
                    "couldn't reach the reference data server and no offline cache exists yet: {fetch_err}"
                )),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn serve_once(response: String) -> std::net::SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        std::thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut buf = [0u8; 1024];
                let _ = stream.read(&mut buf);
                let _ = stream.write_all(response.as_bytes());
            }
        });
        addr
    }

    #[tokio::test]
    async fn fetches_and_parses_json_over_http() {
        let body = r#"{"questRewards":[],"vendorStock":[],"itemBases":[],"gamblingVendors":[]}"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let addr = serve_once(response);
        let data = fetch_json(&format!("http://{addr}/reference-data.json"))
            .await
            .unwrap();
        assert_eq!(data["questRewards"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn returns_error_on_http_error_status() {
        let addr = serve_once(
            "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".to_string(),
        );
        let result = fetch_json(&format!("http://{addr}/missing.json")).await;
        assert!(result.is_err());
    }

    #[test]
    fn wrap_and_unwrap_cache_roundtrips() {
        let data = serde_json::json!({ "a": 1 });
        let envelope = wrap_for_cache(&data, 12345);
        let (unwrapped, cached_at) = unwrap_cache(&envelope).unwrap();
        assert_eq!(unwrapped, data);
        assert_eq!(cached_at, 12345);
    }

    #[test]
    fn unwrap_cache_rejects_a_missing_or_malformed_envelope() {
        assert!(unwrap_cache(&Value::Null).is_none());
        assert!(unwrap_cache(&serde_json::json!({ "data": {} })).is_none());
    }
}
