# PasswordVault — Security Model

**Status:** Native vault lifecycle implemented; security validation remains open.  
**Production gate:** NOT APPROVED for real credentials.

PasswordVault is a security-sensitive desktop application. The active architecture is React/TypeScript presentation → Tauri commands → Rust `VaultSession` → KeePass-compatible KDBX4 persistence. Implementation is not equivalent to an independent security audit.

## Security rules

- Never invent cryptography; use the established KDBX implementation.
- Never persist decrypted credentials in browser storage.
- Never commit KDBX files, credential exports, backups, passwords, recovery codes, or secrets.
- Keep sensitive session handling in Rust where possible; treat memory zeroization as best-effort, not formally audited secure memory.
- Clear native credential/session state when locking.
- Keep clipboard exposure short-lived and validate cleanup behavior on the packaged application.
- Keep auto-lock in the native layer and test idle, minimize, suspend/resume, and failure paths.
- Validate imported KDBX/XLSX inputs and recover safely from malformed files and failed writes.
- Keep Tauri capabilities minimal and define a restrictive Content Security Policy before production.

## Implemented in source (not independently approved)

- Native KDBX4 create/open/save/export and import/merge paths.
- Rust session lock and auto-lock enforcement.
- `zeroize` derives and explicit clearing for credential/session fields.
- OS keychain integration.
- Native file dialogs and frontend/native command boundary.
- Native tests are configured in CI.

See `../src-tauri/src/vault.rs`, `../src-tauri/src/lib.rs`, and `../src-tauri/tauri.conf.json`.

## Required production gate

1. KDBX4 interoperability with KeePassXC in both directions, including metadata and protected fields.
2. OS keychain behavior and failure modes on each supported OS.
3. Packaged-app auto-lock on inactivity, minimize, suspend/resume, and focus changes.
4. Clipboard clearing lifecycle and behavior when the application exits or crashes.
5. Memory exposure review across Rust, Tauri IPC, React state, logs, and error messages.
6. Import/export failure recovery, including interrupted writes and preserving the previous valid vault.
7. Restrictive CSP and least-privilege Tauri capabilities.
8. Regression tests for malformed/corrupt files, wrong passwords, concurrency, and state transitions.
9. Review current CI results and capture reproducible evidence for supported platforms.

Until every gate has evidence, PasswordVault remains **not approved for real production credentials**.
