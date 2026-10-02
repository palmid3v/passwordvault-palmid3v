mod vault;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::State;
use tauri_plugin_dialog::DialogExt;
use vault::{
    CredentialRecord, KeychainStatus, VaultError, VaultSession, VaultSummary,
};

type SharedVault = Arc<Mutex<VaultSession>>;

fn shared<'a>(state: &'a State<'_, SharedVault>) -> Result<std::sync::MutexGuard<'a, VaultSession>, String> {
    state
        .lock()
        .map_err(|_| "Vault state lock poisoned".to_string())
}

#[tauri::command]
async fn pick_open_kdbx(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("KeePass database", &["kdbx"])
        .blocking_pick_file();

    selected
        .map(|file| file.into_path().map(|path| path.display().to_string()).map_err(|error| error.to_string()))
        .transpose()
}

#[tauri::command]
async fn pick_save_kdbx(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("KeePass database", &["kdbx"])
        .set_file_name("Palmi PasswordVault.kdbx")
        .blocking_save_file();

    selected
        .map(|file| file.into_path().map(|path| path.display().to_string()).map_err(|error| error.to_string()))
        .transpose()
}

#[tauri::command]
fn vault_status(state: State<'_, SharedVault>) -> Result<VaultSummary, String> {
    shared(&state)?.summary().map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_create(
    state: State<'_, SharedVault>,
    path: String,
    master_password: String,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.create(&path, &master_password).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_open(
    state: State<'_, SharedVault>,
    path: String,
    master_password: String,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.open(&path, &master_password).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_open_with_keychain(
    state: State<'_, SharedVault>,
    path: String,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.open_with_keychain(&path).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_save(state: State<'_, SharedVault>) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.save().map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_export(
    state: State<'_, SharedVault>,
    path: String,
) -> Result<VaultSummary, String> {
    let vault = shared(&state)?;
    vault.export(&path).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_import(
    state: State<'_, SharedVault>,
    path: String,
    master_password: String,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.open(&path, &master_password).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_credentials(state: State<'_, SharedVault>) -> Result<Vec<CredentialRecord>, String> {
    let mut vault = shared(&state)?;
    vault.touch().map_err(VaultError::to_string)?;
    vault.credentials().map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_upsert(
    state: State<'_, SharedVault>,
    credential: CredentialRecord,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.upsert(credential).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_delete(
    state: State<'_, SharedVault>,
    id: String,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.delete(&id).map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_lock(state: State<'_, SharedVault>) -> Result<(), String> {
    let mut vault = shared(&state)?;
    vault.lock().map_err(VaultError::to_string)
}

#[tauri::command]
fn vault_set_auto_lock(
    state: State<'_, SharedVault>,
    minutes: u64,
) -> Result<VaultSummary, String> {
    let mut vault = shared(&state)?;
    vault.set_auto_lock(minutes).map_err(VaultError::to_string)
}

#[tauri::command]
fn keychain_status() -> Result<KeychainStatus, String> {
    VaultSession::keychain_status().map_err(|error| error.to_string())
}

#[tauri::command]
fn keychain_store(state: State<'_, SharedVault>) -> Result<(), String> {
    let vault = shared(&state)?;
    vault.store_keychain().map_err(VaultError::to_string)
}

#[tauri::command]
fn keychain_clear() -> Result<(), String> {
    VaultSession::clear_keychain().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_vault: SharedVault = Arc::new(Mutex::new(VaultSession::new()));
    let background_vault = Arc::clone(&shared_vault);

    std::thread::Builder::new()
        .name("passwordvault-auto-lock".into())
        .spawn(move || loop {
            std::thread::sleep(Duration::from_secs(5));
            if let Ok(mut vault) = background_vault.lock() {
                let _ = vault.enforce_auto_lock();
            }
        })
        .expect("failed to start PasswordVault auto-lock thread");

    tauri::Builder::default()
        .manage(shared_vault)
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            pick_open_kdbx,
            pick_save_kdbx,
            vault_status,
            vault_create,
            vault_open,
            vault_open_with_keychain,
            vault_save,
            vault_export,
            vault_import,
            vault_credentials,
            vault_upsert,
            vault_delete,
            vault_lock,
            vault_set_auto_lock,
            keychain_status,
            keychain_store,
            keychain_clear
        ])
        .run(tauri::generate_context!())
        .expect("error while running Palmi PasswordVault");
}
