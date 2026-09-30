# 🔐 Palmi PasswordVault v1.0.0

Desktop password-manager foundation for Palmi D3v.

## 🎯 Purpose

Build a local desktop vault experience with a clear security boundary, credential organization, password generation, backup lifecycle, and a future native encrypted vault implementation.

## ✨ Current UI foundation

- 📊 Dashboard
- 🔑 Credentials
- 🗂️ Categories
- 🛡️ Security
- 💾 Backup lifecycle
- 🔄 Password generator
- 🔎 Credential search
- 🌙 Dark/light mode
- 📱 Responsive layout

## 🧱 Stack

React + TypeScript + Vite + Tailwind CSS + Lucide React + Tauri 2 + Rust.

## 🏗️ Structure

```text
app/
├── src/
│   ├── main.tsx
│   └── styles.css
├── src-tauri/
│   ├── src/lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY.md
└── package.json
```

## 🔐 Security status

This release is an architecture/UI foundation. **Do not store production credentials yet.** The native encrypted `.kdbx` vault layer is the next required security milestone.

The current React state is in-memory UI state; it is not the final encrypted persistence layer.

## 🔮 Next security milestone

- Native encrypted vault boundary
- Secure import/export lifecycle
- Session locking and memory clearing
- Validation of encrypted persistence
- Security-focused tests before production credential use

## ▶️ Development

```bash
npm install
npm run dev
npm run tauri dev
```

Tauri development requires the Rust toolchain and Windows prerequisites.

## 📌 Status

Desktop foundation in active development; the repository is not yet a production password manager.