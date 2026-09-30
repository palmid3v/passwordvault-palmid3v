# Security Model

This project is a security-sensitive application. The v1 UI is a migration foundation, not a completed audited password manager.

## Rules
- Never invent cryptography.
- Prefer established vault formats and audited cryptographic libraries.
- Never store decrypted credentials in localStorage.
- Never commit vault files to GitHub.
- Clear session state on lock.
- Keep clipboard exposure short-lived.
- Implement auto-lock in the native layer.
- Validate imported vaults before decrypting or displaying data.

## Planned native work
- `.kdbx` encryption/decryption
- OS keychain integration where appropriate
- secure file dialogs
- secure clipboard lifecycle
- auto-lock
- memory/session cleanup
