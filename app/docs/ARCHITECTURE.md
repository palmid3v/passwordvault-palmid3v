# Palmi PasswordVault — Architecture v1.0

## Stack
- React + TypeScript
- Vite
- Tailwind-ready styling system
- Tauri 2
- Rust native layer
- Encrypted vault target: KeePass-compatible `.kdbx`

## Security boundary
The browser UI is not the final trust boundary. Native vault operations belong in Rust/Tauri.

## Vault lifecycle
1. Application starts locked.
2. User imports an encrypted vault.
3. User authenticates with the master password.
4. Decrypted data exists only for the active session.
5. Lock/exit requires an encrypted save/export.
6. Session data is cleared before returning to the lock screen.

## Never commit
- `.kdbx`
- credential exports
- backups
- master passwords
- recovery codes
- `.env` secrets
