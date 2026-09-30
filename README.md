# 🔐 Palmi PasswordVault

A desktop password-manager foundation for Palmi D3v, designed around a local UI, credential organization, password generation, vault lifecycle, and a future encrypted native vault boundary.

## ✨ Current UI foundation

- 📊 Dashboard
- 🔑 Credentials
- 🗂️ Categories
- 🛡️ Security view
- 💾 Backup lifecycle UI
- 🔄 Password generator
- 🔎 Credential search
- 🌙 Dark/light mode
- 📱 Responsive interface

## ⚠️ Security boundary

The current release is an architecture/UI foundation. **Do not use it to store production credentials yet.** The native encrypted `.kdbx` vault layer remains the required security milestone before treating the application as a real password manager.

## 🧱 Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Tauri 2
- Rust

## 🏗️ Repository structure

```text
passwordvault/
├── app/       # Current desktop application + security documentation
└── archive/   # Historical material
```

The frontend is under `app/src/`; the native Tauri layer is under `app/src-tauri/`.

## 📚 Documentation

Current security and architecture notes live under `app/docs/`.

## ▶️ Development

```bash
cd app
npm install
npm run dev
npm run tauri dev
```

Tauri development also requires the Rust toolchain and Windows prerequisites.

## 📌 Project status

The project is intentionally not production-ready as a credential vault. The next major milestone is implementing and validating the encrypted native vault lifecycle, import/export boundary, session locking, and secure memory handling.