# PasswordVault — Architecture

## Stack
- React + TypeScript
- Vite
- Tailwind-ready styling system
- Tauri 2
- Rust native layer
- Encrypted vault format: KeePass-compatible `.kdbx`

## Security boundary
The browser UI is not the final trust boundary. Native vault operations belong in Rust/Tauri.

## Vault lifecycle
1. Application starts in its locked state.
2. User creates or opens an encrypted vault.
3. User authenticates with the master password.
4. Decrypted credential data is available to the active session through the native bridge.
5. Vault changes are persisted through native KDBX operations.
6. Locking clears sensitive native session fields on a best-effort basis.

## Never commit
- `.kdbx`
- credential exports
- backups
- master passwords
- recovery codes
- `.env` secrets
