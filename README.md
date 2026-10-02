# 🔐 PALMI PasswordVault

Desktop password-manager foundation built with React, TypeScript, Vite, Tauri 2, and Rust.

> **Current status:** Native encrypted KDBX4 lifecycle, native lock/auto-lock, zeroization, OS keychain integration, KDBX import/export, and native security tests are implemented. The project remains under security validation and is not approved for real production credentials yet.

## 🎯 Product scope

PasswordVault is a local-first desktop vault designed around a strict security boundary:

~~~text
React UI
   │
   ▼
Tauri command boundary
   │
   ▼
Rust VaultSession
   │
   ├── master password
   ├── encrypted KDBX4 persistence
   ├── auto-lock
   ├── zeroized session data
   └── optional OS keychain
~~~

Sensitive vault operations stay on the native side whenever possible.

## ✨ Current capabilities

### UI

- 📊 Dashboard/security posture
- 🔑 Credential CRUD
- 🔎 Search
- 🗂️ Category and importance filters
- 🔄 Web Crypto password generation
- 💪 Password-strength feedback
- 📋 Clipboard actions
- 👁️ Password visibility controls
- 🌙 Light/dark/system theme
- 📱 Responsive UI
- ⚠️ Empty/warning/locked states

### Native vault

- 🔐 KeePass-compatible KDBX4 persistence
- 🔑 Master-password creation/opening
- 📥 KDBX import/open
- 📤 KDBX export
- 💾 Native save lifecycle
- 🔒 Native lock
- ⏱️ Native auto-lock
- 🧹 Rust zeroization
- 🗝️ Optional OS keychain storage
- 📁 Native file dialogs
- 🔄 React ↔ Rust CRUD integration
- 🧪 Native vault tests

## 🛡️ Security boundary

Rules:

- Never invent cryptography.
- Never persist decrypted credentials in browser storage.
- Never commit KDBX files, credentials, master passwords, or recovery material.
- Keep sensitive session handling in Rust where possible.
- Treat the current memory handling as not formally audited secure memory.
- Validate KDBX interoperability and platform keychain behavior before production use.

## 🛠️ Technology

| Technology | Role |
| --- | --- |
| React | UI |
| TypeScript | Application language |
| Vite | Frontend tooling |
| Tauri 2 | Desktop bridge |
| Rust | Native security layer |
| KeePass/KDBX library | Encrypted vault format |
| zeroize | Sensitive memory cleanup |
| keyring | OS keychain integration |

## 📁 Repository structure

~~~text
passwordvault-palmid3v/
├── app/
│   ├── src/              # React client
│   ├── src-tauri/        # Rust/Tauri native layer
│   ├── docs/             # Architecture/security/finalization docs
│   └── package.json
├── .github/              # Native/frontend CI
├── archive/
├── CONTEXT.md
└── README.md
~~~

## 📚 Documentation

- app/docs/ARCHITECTURE.md
- app/docs/SECURITY.md
- app/docs/FINALIZATION.md
- CONTEXT.md

## 🚀 Development

~~~bash
cd app
npm install
npm run dev
~~~

For the desktop app:

~~~bash
cd app
npm run tauri dev
~~~

Tauri development requires the Rust toolchain and platform prerequisites.

## 🧪 Validation

Frontend:

~~~bash
cd app
npm ci
npm run build
~~~

Native:

~~~bash
cd app/src-tauri
cargo test
~~~

## 📌 Production gate

Remaining validation includes KDBX interoperability, OS keychain behavior, packaged-app auto-lock, clipboard lifecycle, secure-memory review, import/export failure recovery, and security regression testing.

## 🚫 Never commit

~~~text
.kdbx
credential exports
vault backups
master passwords
recovery codes
.env secrets
real credentials
~~~

## 📚 Project context

See CONTEXT.md for the security boundary, current lifecycle, and production-gate rules.

---

**PALMI-D3V** · PasswordVault · 2026