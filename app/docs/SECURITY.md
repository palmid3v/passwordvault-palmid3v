# PasswordVault — Security Model

**Functional status:** Project owner reports the manual functional checks as passed.  
**Security status:** Source implementation and functional checks are not equivalent to an independent security audit.

PasswordVault is a security-sensitive desktop application. The architecture is React/TypeScript presentation → Tauri commands → Rust `VaultSession` → KeePass-compatible KDBX4 persistence.

## Security rules

- Never invent cryptography; use the established KDBX implementation.
- Never persist decrypted credentials in browser storage.
- Never commit KDBX files, credential exports, backups, passwords, recovery codes, or secrets.
- Keep sensitive session handling in Rust where possible; treat memory zeroization as best-effort, not formally audited secure memory.
- Clear native credential/session state when locking.
- Treat clipboard behavior as platform-dependent; document the actual observed behavior and do not promise OS-wide clipboard erasure unless verified.
- Keep auto-lock in the native layer and test idle, minimize, suspend/resume, and failure paths.
- Validate imported KDBX/XLSX inputs and recover safely from malformed files and failed writes.
- Keep Tauri capabilities minimal and verify the restrictive Content Security Policy in packaged builds.

## Implemented in source

- Native KDBX4 create/open/save/export and import/merge paths.
- Rust session lock and auto-lock enforcement.
- `zeroize` derives and explicit clearing for credential/session fields.
- OS keychain integration.
- Native file dialogs and frontend/native command boundary.
- Native tests configured in CI.
- CSP configured in `../src-tauri/tauri.conf.json`.

## Manual checks reported as passed by the project owner

- Vault creation, save, reopen, persistence, and rejection of an incorrect master password.
- Auto-lock.
- Clipboard behavior.
- OS keychain storage/retrieval/clearing.
- KDBX4 interoperability with KeePassXC.

These are owner-reported results, not independent audit findings.

## Technical release checks to retain as evidence

1. Verify current CI results on the latest `main` commit.
2. Verify CSP and least-privilege Tauri capabilities in a packaged build.
3. Review memory exposure across Rust, Tauri IPC, React state, logs, and error messages.
4. Verify malformed/corrupt input, wrong-password, import/export recovery, and concurrency regressions.
5. Review interrupted-write recovery and cross-platform crash consistency. The save path uses a unique same-directory temporary file and attempts to restore the previous vault when replacement fails; this does not prove crash-atomic durability.
6. Capture supported OS, packaged version, and toolchain details with reproducible evidence.

Until these technical checks have evidence, do not describe the product as independently security-audited or claim formal secure-memory or crash-atomic guarantees.
