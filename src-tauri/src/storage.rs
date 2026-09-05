// Local JSON storage: one file per named store under the app's data directory.
// Writes are atomic (write to a sibling temp file, fsync, then rename) so a crash
// or power loss mid-write can never leave a store file truncated or corrupted.

use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum StorageError {
    InvalidStoreName(String),
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StorageError::InvalidStoreName(name) => {
                write!(f, "invalid store name: {name}")
            }
            StorageError::Io(e) => write!(f, "storage io error: {e}"),
            StorageError::Json(e) => write!(f, "storage json error: {e}"),
        }
    }
}

impl From<std::io::Error> for StorageError {
    fn from(e: std::io::Error) -> Self {
        StorageError::Io(e)
    }
}

impl From<serde_json::Error> for StorageError {
    fn from(e: serde_json::Error) -> Self {
        StorageError::Json(e)
    }
}

/// Store names become file names on disk, so only allow a conservative
/// character set to rule out path traversal (`..`, `/`, `\`) entirely.
fn validate_store_name(name: &str) -> Result<(), StorageError> {
    let valid = !name.is_empty()
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if valid {
        Ok(())
    } else {
        Err(StorageError::InvalidStoreName(name.to_string()))
    }
}

fn store_path(data_dir: &Path, store: &str) -> Result<PathBuf, StorageError> {
    validate_store_name(store)?;
    Ok(data_dir.join("store").join(format!("{store}.json")))
}

/// Reads a named store, returning `null` if it has never been written yet.
pub fn read_store(data_dir: &Path, store: &str) -> Result<Value, StorageError> {
    let path = store_path(data_dir, store)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(serde_json::from_str(&contents)?),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Value::Null),
        Err(e) => Err(StorageError::Io(e)),
    }
}

/// Writes a named store atomically: serialize to a temp file in the same
/// directory, flush + fsync it, then rename over the real file. `rename` on
/// both Windows and Unix is atomic with respect to readers, so a reader never
/// observes a partially-written file.
pub fn write_store(data_dir: &Path, store: &str, value: &Value) -> Result<(), StorageError> {
    let path = store_path(data_dir, store)?;
    let dir = path
        .parent()
        .expect("store_path always has a parent directory");
    fs::create_dir_all(dir)?;

    let tmp_path = dir.join(format!(".{store}.json.tmp"));
    let serialized = serde_json::to_string_pretty(value)?;

    {
        let mut file = fs::File::create(&tmp_path)?;
        file.write_all(serialized.as_bytes())?;
        file.sync_all()?;
    }

    fs::rename(&tmp_path, &path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn read_missing_store_returns_null() {
        let dir = tempfile::tempdir().unwrap();
        let value = read_store(dir.path(), "nonexistent").unwrap();
        assert_eq!(value, Value::Null);
    }

    #[test]
    fn write_then_read_roundtrips() {
        let dir = tempfile::tempdir().unwrap();
        let value = json!({ "disabledModules": ["timer"] });
        write_store(dir.path(), "settings", &value).unwrap();
        let read_back = read_store(dir.path(), "settings").unwrap();
        assert_eq!(read_back, value);
    }

    #[test]
    fn write_leaves_no_temp_file_behind() {
        let dir = tempfile::tempdir().unwrap();
        write_store(dir.path(), "settings", &json!({ "a": 1 })).unwrap();
        let store_dir = dir.path().join("store");
        let names: Vec<_> = fs::read_dir(&store_dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        assert_eq!(names, vec!["settings.json"]);
    }

    #[test]
    fn rejects_path_traversal_in_store_name() {
        let dir = tempfile::tempdir().unwrap();
        let result = write_store(dir.path(), "../escape", &json!({}));
        assert!(matches!(result, Err(StorageError::InvalidStoreName(_))));
    }
}
