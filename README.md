# 🔐 Palmi PasswordVault

Desktop password manager built with React + TypeScript + Vite + Tauri 2 + Rust.

PasswordVault is designed around a strict security boundary:

```text
React UI
   │
   │ Tauri commands
   ▼
Rust VaultSession
   │
   ├── Master password
   ├── Encrypted KDBX4 persistence
   ├── Auto-lock
   ├── Zeroized session secrets
   └── OS keychain integration
   │
   ▼
KeePass-compatible .kdbx
```

## 🎯 Purpose

Build a local-first desktop password manager where sensitive vault operations are handled by the native Rust layer instead of browser persistence.

The project intentionally avoids storing credentials in `localStorage`, `IndexedDB`, or other browser persistence mechanisms.

> ⚠️ **Production security status:** PasswordVault is still under security validation and should not be used for real production credentials until the native vault lifecycle, interoperability, platform behavior, and security tests have been fully validated.

---

## ✨ Current capabilities

### UI

- 📊 Dashboard and security posture
- 🔑 Credential create, view, edit and delete
- 🔎 Search
- 🗂️ Category and importance filters
- 🔄 Cryptographically secure password generation using Web Crypto
- 💪 Password-strength feedback
- 📋 Username/password clipboard actions
- 👁️ Password visibility controls
- 🌙 Light / dark / system theme
- 📱 Responsive desktop/mobile layout
- ⚠️ Empty, warning and locked-session states

### Native vault

- 🔐 Encrypted KeePass-compatible KDBX4 persistence
- 🔑 Master-password protected vault creation/opening
- 📥 KDBX import/open lifecycle
- 📤 Encrypted KDBX export
- 💾 Native save lifecycle
- 🔒 Native lock operation
- ⏱️ Native auto-lock with configurable timeout
- 🧹 Zeroization of sensitive Rust session data
- 🗝️ OS keychain integration for optional master-password storage
- 📁 Native KDBX file dialogs
- 🔄 React CRUD connected to the Rust vault service
- 🧪 Native vault integration tests

---

## 🔐 Security model

PasswordVault treats the browser UI as an untrusted presentation layer.

Sensitive lifecycle:

```text
User
 │
 ▼
React UI
 │
 │ invoke()
 ▼
Tauri command boundary
 │
 ▼
Rust VaultSession
 │
 ├── decrypt/open KDBX
 ├── hold active session
 ├── modify credentials
 ├── save encrypted KDBX
 └── lock + zeroize
```

### Security rules

- Never invent cryptography.
- Use an established KeePass/KDBX implementation.
- Never persist decrypted credentials in browser storage.
- Never commit real `.kdbx` files to Git.
- Never commit master passwords or recovery material.
- Keep sensitive session data inside the native boundary wherever possible.
- Auto-lock is implemented in Rust rather than relying only on JavaScript timers.
- Lock clears the native credential collection and master-password state.
- KDBX writes use a temporary file followed by replacement to reduce partial-write risk.
- Imported credentials are validated before becoming active session records.
- OS keychain storage is explicit and opt-in.

### Important limitation

The current Rust session necessarily holds decrypted credential data in memory while the vault is unlocked. The implementation uses `zeroize` for cleanup, but this is **not equivalent to a formally audited secure-memory subsystem**.

Likewise, OS keychain behavior depends on the platform's native keychain implementation and must be validated on every supported target.

---

## 🧱 Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind-ready styling
- Lucide React
- Web Crypto API

### Desktop/native

- Tauri 2
- Rust
- `keepass` crate with KDBX4 save support
- `keyring` crate
- `zeroize`
- `uuid`
- Tauri Dialog plugin

### Vault format

- KeePass-compatible `.kdbx`
- KDBX4 write path

The KDBX writer must continue to be tested against real KeePass/KeePassXC interoperability before production release.

---

## 🏗️ Repository structure

```text
passwordvault/
├── app/
│   ├── src/
│   │   ├── main.tsx          # React application
│   │   ├── styles.css        # UI styling
│   │   └── vaultApi.ts       # Tauri/Rust API boundary
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── lib.rs        # Tauri command registration
│   │   │   └── vault.rs      # Native vault/session service
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── docs/
│   │   ├── ARCHITECTURE.md
│   │   ├── SECURITY.md
│   │   └── FINALIZATION.md
│   ├── vite.config.ts
│   └── package.json
├── .github/
│   └── workflows/
│       └── passwordvault-build.yml
├── CONTEXT.md
├── README.md
└── archive/
```

---

## 📚 Documentation

- `CONTEXT.md` — current project context, architecture, decisions and next steps
- `app/docs/ARCHITECTURE.md` — native vault architecture and lifecycle
- `app/docs/SECURITY.md` — security model and rules
- `app/docs/FINALIZATION.md` — UI finalization and production gate

---

## ▶️ Development

From the project directory:

```bash
cd app
npm install
npm run dev
```

For the desktop application:

```bash
cd app
npm run tauri dev
```

Tauri development requires the Rust toolchain and the platform-specific Tauri prerequisites.

---

## 🧪 Validation

Frontend:

```bash
cd app
npm ci
npm run build
```

Native Rust:

```bash
cd app/src-tauri
cargo test
```

The GitHub Actions workflow validates both frontend and native security builds.

The native CI job installs the Linux system dependencies required by Tauri/WebKit before running Rust tests.

---

## 🧪 Native security tests

The current native test suite covers:

- Creating an encrypted KDBX.
- Reopening the vault with the correct master password.
- Rejecting an incorrect master password.
- Verifying that a plaintext credential is not present in the generated KDBX bytes.
- Locking the vault.
- Clearing the credential collection on lock.
- Clearing the master-password session state on lock.
- Enforcing the minimum master-password length for new vaults.

Additional production validation is still required for:

- KDBX interoperability with KeePass/KeePassXC.
- OS keychain behavior on supported operating systems.
- Auto-lock behavior in the packaged desktop application.
- Clipboard lifecycle.
- Secure-memory behavior under real platform conditions.
- Import/export compatibility and failure recovery.
- Security regression testing.

---

## 📌 Project status

### Completed

| Area | Status |
|---|---|
| UI shell | ✅ |
| Credential CRUD | ✅ |
| Search / filters | ✅ |
| Password generator | ✅ |
| Clipboard actions | ✅ |
| Themes | ✅ |
| Responsive UI | ✅ |
| Native Tauri shell | ✅ |
| Encrypted KDBX4 vault | ✅ |
| Master password | ✅ |
| KDBX open/save/export | ✅ |
| Native file dialogs | ✅ |
| Native auto-lock | ✅ |
| Rust zeroization | ✅ |
| OS keychain integration | ✅ |
| Native security tests | ✅ |
| CI frontend validation | ✅ |
| CI native validation | 🔄 / under validation |

### Remaining production gate

- 🔬 Complete cross-platform KDBX interoperability testing.
- 🔬 Validate keychain behavior on each supported OS.
- 🔬 Validate packaged Tauri application behavior.
- 🔬 Review clipboard and memory exposure.
- 🔬 Complete security regression testing.
- 🔬 Perform a final security audit before real credential use.

---

## 🚫 Never commit

```text
.kdbx
credential exports
vault backups
master passwords
recovery codes
.env secrets
real credentials
```

---

## 🧭 Development principle

**Do not solve security-sensitive problems by moving secrets into the browser.**

Preferred architecture:

```text
React UI
  → Tauri commands
    → Rust VaultSession
      → established encrypted-vault library
        → .kdbx
```

Any future feature involving credentials, encryption, persistence, import/export, locking or key management should respect this boundary.
