# PasswordVault — Finalization Status

## Completed in the UI shell

- Light, dark and system themes with persisted theme preference.
- Responsive navigation and mobile layout.
- Credential create, view, edit and delete flows.
- Search, category and importance filters.
- Password visibility controls and Web Crypto password generation.
- Basic password-strength feedback.
- Username/password clipboard actions.
- Empty, warning, audit and locked-session states.
- Session lock clears all in-memory credential state.
- Backup screen clearly distinguishes unavailable native operations.
- Security screen no longer claims that the UI is encrypted.

## Intentionally not implemented

The following must not be simulated in React:

1. Encrypted vault persistence.
2. Master-password authentication.
3. KeePass-compatible .kdbx import/export.
4. Native auto-lock and secure session timeout.
5. Secure memory cleanup beyond clearing JavaScript references.
6. OS keychain integration.
7. Native secure file dialogs.
8. Security-focused integration tests around the encrypted vault boundary.

## Production gate

PasswordVault must remain marked **not production safe** until the native Tauri/Rust layer owns the encrypted vault lifecycle and that lifecycle is validated with security-focused tests.

## Recommended native architecture

React UI -> Tauri commands -> Rust vault service -> established encrypted vault library

Do not invent cryptography or move decrypted credentials into localStorage, IndexedDB, or other browser persistence.
