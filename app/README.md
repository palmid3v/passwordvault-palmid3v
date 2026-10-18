# 🔐 PasswordVault · by PalmiD3v

Desktop password manager built with React, TypeScript, Vite, Tauri 2, and Rust.

## Current status

The project owner considers the functional application complete. The latest recorded GitHub Actions run passed the frontend production build and native Rust test job. No independent security audit or formal security certification is claimed.

## Features

- Dashboard and credential CRUD.
- Credential search, category and importance filters.
- Password generation, strength feedback and visibility controls.
- Clipboard actions.
- Dark, light and system themes.
- Responsive layout and locked, empty and warning states.
- Native encrypted KDBX4 vault lifecycle: create, open, save, import and export.
- Native lock and inactivity auto-lock.
- Best-effort sensitive-session cleanup.
- Optional OS keychain integration and native file dialogs.

## Stack

React + TypeScript + Vite + Tailwind CSS + Lucide React + Tauri 2 + Rust.

## Structure

```text
app/
├── src/
│   ├── main.tsx
│   ├── styles.css
│   └── vaultApi.ts
├── src-tauri/
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
└── docs/
    ├── ARCHITECTURE.md
    ├── SECURITY.md
    ├── FINALIZATION.md
    └── CONTEXT.md
```

## Development

Requirements: Node.js/npm, Rust, and Tauri 2 platform prerequisites.

```bash
npm install
npm run tauri dev
```

For frontend-only development:

```bash
npm run dev
```

## CI

The repository workflow runs `npm ci`, `npm run build`, and `cargo test`. See the [latest workflow runs](https://github.com/palmid3v/passwordvault-palmid3v/actions).

## Security limitations

PasswordVault uses an established KDBX library rather than implementing its own cryptography. Sensitive vault operations are handled by the native Rust layer. Zeroization is best-effort, not a formal secure-memory guarantee; clipboard and keychain behavior may vary by platform. Functional completion does not mean the application has been independently security-audited.

Never commit KDBX files, credential exports, backups, master passwords, recovery codes, or secrets.

See [the security model](docs/SECURITY.md) and [finalization status](docs/FINALIZATION.md).