# 🔐 Palmi PasswordVault

Desktop password-manager foundation for Palmi D3v, with a polished local UI and an explicit native security boundary.

## ✨ Completed UI shell

- 📊 Dashboard and security posture
- 🔑 Credential create, view, edit and delete
- 🔎 Search plus category and importance filters
- 🔄 Web Crypto password generator
- 💪 Password-strength feedback
- 📋 Username/password clipboard actions
- 👁️ Password visibility controls
- 🌙 Light / dark / system theme with persisted preference
- 📱 Responsive navigation and mobile layout
- 🔒 Session lock that clears in-memory credentials
- ⚠️ Honest security states and production warnings

## ⚠️ Security boundary

**Do not use the current application to store production credentials.**

The React UI deliberately keeps credentials in memory only. It does not pretend that this state is encrypted or persistent. The remaining production milestone is the native Tauri/Rust encrypted vault lifecycle.

Required before production:

- Encrypted vault persistence
- Master-password authentication
- KeePass-compatible .kdbx import/export
- Native auto-lock and secure session timeout
- Native secure file dialogs
- OS keychain integration where appropriate
- Security-focused integration tests
- Secure session/memory handling

## 🧱 Stack

- React
- TypeScript
- Vite
- Tailwind CSS dependency / future design-system integration
- Lucide React
- Tauri 2
- Rust

## 🏗️ Repository structure

passwordvault/
├── app/
│   ├── src/              # React application
│   ├── src-tauri/        # Native Tauri/Rust boundary
│   ├── docs/             # Architecture, security and finalization notes
│   ├── vite.config.ts
│   └── package.json
├── .github/workflows/    # Production build validation
└── archive/              # Historical material

## 📚 Documentation

- app/docs/ARCHITECTURE.md — target architecture and vault lifecycle
- app/docs/SECURITY.md — security rules and native work
- app/docs/FINALIZATION.md — completed work and production gate

## ▶️ Development

    cd app
    npm install
    npm run dev
    npm run tauri dev

Tauri development requires the Rust toolchain and Windows prerequisites.

## 🧪 Build validation

The repository includes a GitHub Actions build check that runs:

    npm ci
    npm run build

## 📌 Status

**UI shell: finalized for the current architecture.**

**Production password vault: not yet complete.** The next implementation must happen inside the native Tauri/Rust security boundary rather than by adding browser persistence to the React layer.
