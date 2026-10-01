use keepass::{
    db::{fields, Database},
    DatabaseKey,
};
use keyring::Entry as KeyringEntry;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::{Path, PathBuf},
    time::{Duration, Instant},
};
use zeroize::{Zeroize, ZeroizeOnDrop};

const KEYCHAIN_SERVICE: &str = "com.palmid3v.passwordvault";
const KEYCHAIN_USER: &str = "master-password";
const DEFAULT_AUTO_LOCK_MINUTES: u64 = 15;

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
#[serde(rename_all = "camelCase")]
pub struct CredentialRecord {
    pub id: String,
    pub service: String,
    pub category: String,
    pub username: String,
    pub url: String,
    pub password: String,
    pub notes: String,
    pub twofa: bool,
    pub importance: String,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSummary {
    pub locked: bool,
    pub path: Option<String>,
    pub credential_count: usize,
    pub auto_lock_minutes: u64,
    pub keychain_available: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeychainStatus {
    pub available: bool,
    pub configured: bool,
}

#[derive(Debug)]
pub enum VaultError {
    Locked,
    EmptyPassword,
    WeakPassword,
    InvalidPath,
    Io(std::io::Error),
    KeePass(String),
    Keychain(String),
    InvalidCredential(String),
}

impl VaultError {
    pub fn to_string(&self) -> String {
        match self {
            Self::Locked => "Vault is locked.".into(),
            Self::EmptyPassword => "Master password is required.".into(),
            Self::WeakPassword => "A new vault master password must contain at least 12 characters.".into(),
            Self::InvalidPath => "A valid .kdbx file path is required.".into(),
            Self::Io(error) => format!("File operation failed: {error}"),
            Self::KeePass(error) => format!("KDBX operation failed: {error}"),
            Self::Keychain(error) => format!("OS keychain operation failed: {error}"),
            Self::InvalidCredential(error) => error.clone(),
        }
    }
}

impl From<std::io::Error> for VaultError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

pub struct VaultSession {
    credentials: Vec<CredentialRecord>,
    master_password: Option<String>,
    path: Option<PathBuf>,
    auto_lock_minutes: u64,
    last_activity: Option<Instant>,
}

impl VaultSession {
    pub fn new() -> Self {
        Self {
            credentials: Vec::new(),
            master_password: None,
            path: None,
            auto_lock_minutes: DEFAULT_AUTO_LOCK_MINUTES,
            last_activity: None,
        }
    }

    pub fn summary(&self) -> Result<VaultSummary, VaultError> {
        Ok(VaultSummary {
            locked: self.master_password.is_none(),
            path: self.path.as_ref().map(|p| p.display().to_string()),
            credential_count: self.credentials.len(),
            auto_lock_minutes: self.auto_lock_minutes,
            keychain_available: Self::keychain_status()?.available,
        })
    }

    pub fn create(&mut self, path: &str, password: &str) -> Result<VaultSummary, VaultError> {
        validate_new_password(password)?;
        let normalized = normalize_kdbx_path(path)?;
        self.credentials.zeroize();
        self.credentials.clear();
        self.replace_master_password(password);
        self.path = Some(normalized);
        self.touch()?;
        self.save()
    }

    pub fn open(&mut self, path: &str, password: &str) -> Result<VaultSummary, VaultError> {
        if password.is_empty() {
            return Err(VaultError::EmptyPassword);
        }

        let normalized = normalize_kdbx_path(path)?;
        let file = File::open(&normalized)?;
        let mut reader = BufReader::new(file);
        let key = DatabaseKey::new().with_password(password);
        let database = Database::open(&mut reader, key)
            .map_err(|error| VaultError::KeePass(error.to_string()))?;

        let credentials = database
            .root
            .all_entries()
            .map(entry_to_record)
            .collect::<Result<Vec<_>, _>>()?;

        self.credentials.zeroize();
        self.credentials = credentials;
        self.replace_master_password(password);
        self.path = Some(normalized);
        self.touch()?;
        self.summary()
    }

    pub fn open_with_keychain(&mut self, path: &str) -> Result<VaultSummary, VaultError> {
        let entry = KeyringEntry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
            .map_err(|error| VaultError::Keychain(error.to_string()))?;
        let password = entry
            .get_password()
            .map_err(|error| VaultError::Keychain(error.to_string()))?;
        self.open(path, &password)
    }

    pub fn credentials(&self) -> Result<Vec<CredentialRecord>, VaultError> {
        if self.master_password.is_none() {
            return Err(VaultError::Locked);
        }
        Ok(self.credentials.clone())
    }

    pub fn upsert(&mut self, credential: CredentialRecord) -> Result<VaultSummary, VaultError> {
        if self.master_password.is_none() {
            return Err(VaultError::Locked);
        }
        validate_credential(&credential)?;
        let mut credential = credential;
        if credential.id.trim().is_empty() {
            credential.id = uuid::Uuid::new_v4().to_string();
        }
        if credential.updated.trim().is_empty() {
            credential.updated = chrono_now();
        }

        if let Some(existing) = self.credentials.iter_mut().find(|item| item.id == credential.id) {
            existing.zeroize();
            *existing = credential;
        } else {
            self.credentials.push(credential);
        }

        self.touch()?;
        self.save()
    }

    pub fn delete(&mut self, id: &str) -> Result<VaultSummary, VaultError> {
        if self.master_password.is_none() {
            return Err(VaultError::Locked);
        }
        self.credentials.retain(|item| item.id != id);
        self.touch()?;
        self.save()
    }

    pub fn save(&mut self) -> Result<VaultSummary, VaultError> {
        let password = self.master_password.as_ref().ok_or(VaultError::Locked)?;
        let path = self.path.as_ref().ok_or(VaultError::InvalidPath)?;
        write_kdbx(path, &self.credentials, password)?;
        self.touch()?;
        self.summary()
    }

    pub fn export(&self, path: &str) -> Result<VaultSummary, VaultError> {
        let password = self.master_password.as_ref().ok_or(VaultError::Locked)?;
        let normalized = normalize_kdbx_path(path)?;
        write_kdbx(&normalized, &self.credentials, password)?;
        self.summary()
    }

    pub fn lock(&mut self) -> Result<(), VaultError> {
        self.credentials.zeroize();
        self.credentials.clear();
        self.master_password.zeroize();
        self.master_password = None;
        self.last_activity = None;
        Ok(())
    }

    pub fn touch(&mut self) -> Result<(), VaultError> {
        if self.master_password.is_none() {
            return Err(VaultError::Locked);
        }
        self.last_activity = Some(Instant::now());
        Ok(())
    }

    pub fn set_auto_lock(&mut self, minutes: u64) -> Result<VaultSummary, VaultError> {
        if self.master_password.is_none() {
            return Err(VaultError::Locked);
        }
        self.auto_lock_minutes = minutes.clamp(1, 120);
        self.touch()?;
        self.summary()
    }

    pub fn enforce_auto_lock(&mut self) -> Result<(), VaultError> {
        let Some(last) = self.last_activity else {
            return Ok(());
        };
        if self.master_password.is_some()
            && last.elapsed() >= Duration::from_secs(self.auto_lock_minutes * 60)
        {
            self.lock()?;
        }
        Ok(())
    }

    pub fn store_keychain(&self) -> Result<(), VaultError> {
        let password = self.master_password.as_ref().ok_or(VaultError::Locked)?;
        let entry = KeyringEntry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
            .map_err(|error| VaultError::Keychain(error.to_string()))?;
        entry
            .set_password(password)
            .map_err(|error| VaultError::Keychain(error.to_string()))
    }

    pub fn keychain_status() -> Result<KeychainStatus, VaultError> {
        let available = KeyringEntry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).is_ok();
        let configured = if available {
            KeyringEntry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
                .map(|entry| entry.get_password().is_ok())
                .unwrap_or(false)
        } else {
            false
        };
        Ok(KeychainStatus { available, configured })
    }

    pub fn clear_keychain() -> Result<(), VaultError> {
        let entry = KeyringEntry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
            .map_err(|error| VaultError::Keychain(error.to_string()))?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(error) => {
                let message = error.to_string();
                if message.to_lowercase().contains("no entry") {
                    Ok(())
                } else {
                    Err(VaultError::Keychain(message))
                }
            }
        }
    }

    fn replace_master_password(&mut self, password: &str) {
        self.master_password.zeroize();
        self.master_password = Some(password.to_owned());
    }
}

impl Drop for VaultSession {
    fn drop(&mut self) {
        self.credentials.zeroize();
        self.master_password.zeroize();
    }
}

fn validate_new_password(password: &str) -> Result<(), VaultError> {
    if password.is_empty() {
        return Err(VaultError::EmptyPassword);
    }
    if password.chars().count() < 12 {
        return Err(VaultError::WeakPassword);
    }
    Ok(())
}

fn validate_credential(credential: &CredentialRecord) -> Result<(), VaultError> {
    if credential.service.trim().is_empty() {
        return Err(VaultError::InvalidCredential("Service name is required.".into()));
    }
    if credential.password.is_empty() {
        return Err(VaultError::InvalidCredential("Password is required.".into()));
    }
    Ok(())
}

fn normalize_kdbx_path(path: &str) -> Result<PathBuf, VaultError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(VaultError::InvalidPath);
    }
    let mut path = PathBuf::from(trimmed);
    if path.extension().is_none() {
        path.set_extension("kdbx");
    }
    if path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("kdbx")) != Some(true) {
        return Err(VaultError::InvalidPath);
    }
    Ok(path)
}

fn write_kdbx(
    path: &Path,
    credentials: &[CredentialRecord],
    password: &str,
) -> Result<(), VaultError> {
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty());
    if let Some(parent) = parent {
        fs::create_dir_all(parent)?;
    }

    let mut database = Database::new(Default::default());
    database.meta.database_name = Some("Palmi PasswordVault".to_string());

    {
        let mut root = database.root_mut();
        for credential in credentials {
            let mut entry = root.add_entry();
            entry.set_unprotected(fields::TITLE, credential.service.clone());
            entry.set_unprotected(fields::USERNAME, credential.username.clone());
            entry.set_protected(fields::PASSWORD, credential.password.clone());
            entry.set_unprotected(fields::URL, credential.url.clone());
            entry.set_unprotected(fields::NOTES, credential.notes.clone());
            entry.set_unprotected("PalmiId", credential.id.clone());
            entry.set_unprotected("PalmiCategory", credential.category.clone());
            entry.set_unprotected("PalmiImportance", credential.importance.clone());
            entry.set_unprotected("Palmi2FA", credential.twofa.to_string());
            entry.set_unprotected("PalmiUpdated", credential.updated.clone());
        }
    }

    let tmp_path = path.with_extension("kdbx.tmp");
    {
        let file = File::create(&tmp_path)?;
        let mut writer = BufWriter::new(file);
        database
            .save(&mut writer, DatabaseKey::new().with_password(password))
            .map_err(|error| VaultError::KeePass(error.to_string()))?;
        writer
            .into_inner()
            .map_err(|error| VaultError::Io(error.into_error()))?
            .sync_all()?;
    }

    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(tmp_path, path)?;
    Ok(())
}

fn entry_to_record(entry: &keepass::db::EntryRef<'_>) -> Result<CredentialRecord, VaultError> {
    let service = entry.get_title().unwrap_or("").to_string();
    let username = entry.get_username().unwrap_or("").to_string();
    let password = entry.get_password().unwrap_or("").to_string();
    let url = entry.get_url().unwrap_or("").to_string();
    let notes = entry.get("Notes").unwrap_or("").to_string();

    if service.is_empty() || password.is_empty() {
        return Err(VaultError::InvalidCredential(
            "Imported KDBX contains an entry without a service title or password.".into(),
        ));
    }

    Ok(CredentialRecord {
        id: entry.get("PalmiId").map(str::to_owned).unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        service,
        category: entry.get("PalmiCategory").unwrap_or("Other").to_string(),
        username,
        url,
        password,
        notes,
        twofa: entry.get("Palmi2FA").unwrap_or("false") == "true",
        importance: entry.get("PalmiImportance").unwrap_or("Normal").to_string(),
        updated: entry.get("PalmiUpdated").map(str::to_owned).unwrap_or_else(chrono_now),
    })
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    seconds.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_path(name: &str) -> PathBuf {
        env::temp_dir().join(format!("palmi-passwordvault-{name}-{}.kdbx", uuid::Uuid::new_v4()))
    }

    fn credential() -> CredentialRecord {
        CredentialRecord {
            id: uuid::Uuid::new_v4().to_string(),
            service: "GitHub".into(),
            category: "Development".into(),
            username: "palmi@example.com".into(),
            url: "https://github.com".into(),
            password: "correct horse battery staple".into(),
            notes: "integration-test".into(),
            twofa: true,
            importance: "High".into(),
            updated: "test".into(),
        }
    }

    #[test]
    fn creates_encrypted_kdbx_and_reopens_with_correct_password() {
        let path = temp_path("create-open");
        let mut vault = VaultSession::new();
        vault.create(path.to_str().unwrap(), "test-master-password").unwrap();
        vault.upsert(credential()).unwrap();

        let bytes = fs::read(&path).unwrap();
        assert!(bytes.windows(b"correct horse battery staple".len()).all(|window| window != b"correct horse battery staple"));

        let mut reopened = VaultSession::new();
        reopened.open(path.to_str().unwrap(), "test-master-password").unwrap();
        assert_eq!(reopened.credentials().unwrap().len(), 1);
        assert_eq!(reopened.credentials().unwrap()[0].service, "GitHub");
        assert!(reopened.open(path.to_str().unwrap(), "wrong-password").is_err());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn lock_clears_credentials_and_master_password() {
        let path = temp_path("lock");
        let mut vault = VaultSession::new();
        vault.create(path.to_str().unwrap(), "test-master-password").unwrap();
        vault.upsert(credential()).unwrap();
        vault.lock().unwrap();

        assert!(vault.credentials().is_err());
        assert!(vault.master_password.is_none());
        assert!(vault.credentials.is_empty());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn new_password_requires_twelve_characters() {
        assert!(matches!(validate_new_password("short"), Err(VaultError::WeakPassword)));
        assert!(validate_new_password("twelve-chars").is_ok());
    }
}
