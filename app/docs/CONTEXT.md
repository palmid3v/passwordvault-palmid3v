# Palmi PasswordVault — Project Context

> **Purpose:** Persistent context for future development sessions.
>
> **Last updated:** 2026-09-30
>
> **Repository:** `palmid3v/passwordvault`

---

## 1. Project identity

**Name:** Palmi PasswordVault

**Type:** Local-first desktop password manager.

**Owner / brand:** Palmi D3v.

**Primary goal:** Provide a desktop password vault with a React UI and a native Rust security boundary for encrypted credential storage.

The project should not be treated as a production password manager until the remaining interoperability, platform, and security validation gates are complete.

---

## 2. Current architecture

```text
React + TypeScript + Vite
          │
          │ @tauri-apps/api/core invoke()
          ▼
      Tauri 2 commands
          │
          ▼
    Rust VaultSession
          │
     ┌────┼───────────────┐
     │    │               │
     ▼    ▼               ▼
   KDBX  Auto-lock    OS keychain
     │
     ▼
Encrypted .kdbx
```

### Trust boundary

The React application is the presentation layer.

The native Rust layer owns:

- Vault state.
- Master password session state.
- KDBX open/save/export.
- Credential persistence.
- Locking.
- Auto-lock.
- Sensitive-data cleanup.
- Optional OS keychain storage.
- Native file dialogs.

Do **not** add browser persistence for credentials.

---

## 3. Current native implementation

### Rust service

File:

```text
app/src-tauri/src/vault.rs
```

Main abstraction:

```text
VaultSession
```

It currently manages:

- `credentials`
- `master_password`
- vault path
- auto-lock timeout
- last activity timestamp

### Supported lifecycle

```text
Create
  ↓
Encrypted KDBX4
  ↓
Open with master password
  ↓
Active native session
  ↓
CRUD
  ↓
Save encrypted KDBX
  ↓
Lock / auto-lock
  ↓
Zeroize sensitive session state
```

### Tauri commands

The native layer currently exposes commands for:

- `vault_status`
- `vault_create`
- `vault_open`
- `vault_open_with_keychain`
- `vault_save`
- `vault_export`
- `vault_import`
- `vault_credentials`
- `vault_upsert`
- `vault_delete`
- `vault_lock`
- `vault_set_auto_lock`
- `keychain_status`
- `keychain_store`
- `keychain_clear`
- `pick_open_kdbx`
- `pick_save_kdbx`

Frontend wrapper:

```text
app/src/vaultApi.ts
```

---

## 4. Encryption / KDBX

The project uses the established Rust `keepass` crate with KDBX4 save support.

Dependency currently declared:

```toml
keepass = { version = "0.13.25", features = ["save_kdbx4"] }
```

The application does not implement its own encryption algorithm.

### Important

KDBX generation must be tested against actual KeePass-compatible applications before production use.

Do not claim interoperability simply because a KDBX file can be generated.

Required validation:

- Create vault.
- Open generated vault externally.
- Verify credentials.
- Modify externally.
- Reopen in PasswordVault.
- Test incorrect master password.
- Test corrupted/truncated files.
- Test import/export round trip.

---

## 5. Master password

For new vaults:

- Password must not be empty.
- Password must contain at least 12 characters.

For opening an existing vault:

- Empty password is rejected.
- The password is passed to the native KDBX library.
- Incorrect passwords fail the KDBX open operation.

The current implementation keeps the active master password in the Rust session and applies `zeroize` during replacement, lock and drop.

This is useful cleanup, but **must not be described as formally audited secure memory**.

---

## 6. Auto-lock

Default:

```text
15 minutes
```

Supported configuration:

```text
1–120 minutes
```

The native layer runs an auto-lock background loop and checks the last activity timestamp.

On timeout:

```text
credentials → zeroize + clear
master password → zeroize + clear
session → locked
```

Future work should validate:

- Real packaged-app behavior.
- Application suspension/resume.
- OS sleep/wake.
- Activity handling across all relevant commands.
- Whether clipboard contents require independent clearing.

---

## 7. OS keychain

The implementation uses the Rust `keyring` crate.

Service identifier:

```text
com.palmid3v.passwordvault
```

Key:

```text
master-password
```

The feature is intentionally explicit/opt-in.

Do not silently store the master password in the keychain.

Required future validation:

- Windows Credential Manager.
- macOS Keychain.
- Linux Secret Service/keyring.
- Failure when keychain is unavailable.
- Delete/clear behavior.
- User expectations around unlocking with keychain.

---

## 8. Secure memory

Sensitive Rust structures use `zeroize`.

Current credential record derives:

```text
Zeroize
ZeroizeOnDrop
```

`VaultSession` explicitly zeroizes:

- Credential collection.
- Master password.

### Important limitation

Zeroization is cleanup, not a complete secure-memory architecture.

Do not claim protection against:

- OS-level memory inspection.
- Swap/pagefile exposure.
- Crash dumps.
- Compiler/runtime copies.
- Clipboard exposure.
- All temporary string allocations.

Any stronger security claim requires dedicated platform-specific investigation and testing.

---

## 9. Import / export

KDBX operations are native.

### Import/open

The file picker selects a `.kdbx` file.

The Rust layer:

1. Validates the path.
2. Opens the KDBX.
3. Uses the supplied master password.
4. Parses entries.
5. Validates required credential fields.
6. Creates the active native session.

### Export

The active native vault can export to another `.kdbx` path using the active master password.

### Save safety

Writes use a temporary:

```text
*.kdbx.tmp
```

file before replacing the destination.

This reduces the chance of leaving a partially written final vault after a write failure.

---

## 10. Security tests

Current Rust tests cover:

1. Encrypted KDBX creation.
2. Reopening with the correct master password.
3. Rejection of an incorrect password.
4. Checking that plaintext credential content is not present in the generated KDBX bytes.
5. Locking.
6. Credential collection clearing.
7. Master-password state clearing.
8. Minimum master-password length.

### Still required

- KDBX interoperability.
- Corrupted vault handling.
- Import/export round trip.
- Auto-lock timing.
- Keychain integration.
- Platform-specific tests.
- Clipboard security.
- Packaged Tauri integration tests.
- Regression tests for all Tauri commands.

---

## 11. CI

Workflow:

```text
.github/workflows/passwordvault-build.yml
```

Frontend job:

```text
npm ci
npm run build
```

Native job:

```text
Install Tauri Linux dependencies
cargo test
```

The Linux job needs system libraries because Tauri/WebKit dependencies are not supplied by Cargo alone.

A previous failure was caused by missing:

```text
glib-2.0 >= 2.70
```

The workflow was updated to install the required Linux Tauri dependencies before running Rust tests.

---

## 12. Frontend rules

Credentials must not be persisted with:

- localStorage
- sessionStorage
- IndexedDB
- browser database libraries
- plain JSON files
- frontend persistence plugins

Theme preference is allowed to persist because it is not secret data.

The React layer should call `nativeVault` for native vault operations.

---

## 13. UI status

Completed:

- Dashboard
- Credentials CRUD
- Search
- Filters
- Password generator
- Password strength
- Clipboard actions
- Password visibility
- Light mode
- Dark mode
- System theme
- Responsive layout
- Empty states
- Warning/security states
- Native lock flow
- Native vault API integration

---

## 14. Production gate

PasswordVault is **not yet production-safe**.

Before real credentials are used, complete:

### Priority 1 — Native validation

- [ ] CI `cargo test` passes.
- [ ] KDBX create/open/save round trip.
- [ ] KeePass interoperability.
- [ ] KeePassXC interoperability.
- [ ] Wrong-password behavior.
- [ ] Corrupted-file behavior.

### Priority 2 — Platform security

- [ ] Windows keychain.
- [ ] macOS keychain.
- [ ] Linux keyring.
- [ ] Packaged Tauri application.
- [ ] Auto-lock after sleep/resume.
- [ ] Clipboard lifecycle.

### Priority 3 — Security review

- [ ] Audit all Tauri commands.
- [ ] Review sensitive data copies.
- [ ] Review error messages for secret leakage.
- [ ] Review logs/debug output.
- [ ] Review file permissions.
- [ ] Review temporary-file behavior.
- [ ] Review crash/recovery behavior.

### Priority 4 — Release

- [ ] Final README status.
- [ ] Security documentation.
- [ ] Release build.
- [ ] Version/tag.
- [ ] Final security audit.

---

## 15. Rules for future implementation

1. **Never invent cryptography.**
2. **Never put decrypted credentials into browser persistence.**
3. **Never commit real credentials or KDBX files.**
4. **Keep native security operations in Rust.**
5. **Prefer established libraries over custom security code.**
6. **Do not call a feature production-safe until it has tests.**
7. **Do not claim KDBX interoperability without testing against real KeePass-compatible software.**
8. **Do not treat zeroization as a complete secure-memory guarantee.**
9. **Do not silently enable OS keychain storage.**
10. **Any new credential-related feature must preserve the React → Tauri → Rust security boundary.**

---

## 16. Recommended next work

The next development session should focus on **validation rather than adding more UI**:

```text
CI
 ↓
cargo tests
 ↓
KDBX interoperability
 ↓
Keychain validation
 ↓
Auto-lock validation
 ↓
Clipboard review
 ↓
Security audit
 ↓
Release candidate
```

Avoid adding unrelated features until the native vault lifecycle is validated.
