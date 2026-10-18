# 🔐 PasswordVault

**PasswordVault · by PalmiD3v** is a local-first desktop password manager built with React, TypeScript, Vite, Tauri 2, and Rust.

> **Project status:** Functional implementation and UI are considered complete by the project owner. The latest GitHub Actions run passed both the frontend production build and the native Rust test job. This is not a claim of independent security audit or formal security certification.

## Product

PasswordVault is designed to keep vault operations in the native layer rather than treating the browser UI as the security boundary.

```text
React + TypeScript
       │
       ▼
Tauri commands
       │
       ▼
Rust VaultSession
  ├─ KDBX4 encrypted vault
  ├─ save / import / export
  ├─ lock / inactivity auto-lock
  ├─ sensitive-session cleanup
  └─ optional OS keychain
```

## Features

### Desktop experience
- Dashboard and credential management (create, view, edit, delete).
- Search, category and importance filters.
- Password generation and strength feedback.
- Password visibility controls and clipboard actions.
- Dark, light and system theme options.
- Responsive application layout and locked, empty and warning states.
- Native file dialogs.

### Vault lifecycle
- KeePass-compatible KDBX4 create, open, save, import and export flows.
- Native Rust session and lock handling.
- Configurable inactivity auto-lock.
- Best-effort zeroization of sensitive session fields.
- Optional OS keychain integration.

## Technology

| Technology | Role |
| --- | --- |
| React + TypeScript | User interface |
| Vite | Frontend build |
| Tauri 2 | Desktop runtime and native bridge |
| Rust | Vault/session operations |
| KeePass-compatible KDBX library | Encrypted vault format |
| zeroize | Best-effort cleanup of sensitive memory |

## Repository map

```text
passwordvault-palmid3v/
├── app/
│   ├── src/              # React/TypeScript UI and native API wrapper
│   ├── src-tauri/        # Rust/Tauri desktop application
│   └── docs/             # Architecture, security and finalization notes
├── .github/workflows/    # Frontend build and native test CI
├── archive/
├── CONTEXT.md
└── README.md
```

## Run locally

Requirements: Node.js/npm, Rust, and the platform prerequisites for Tauri 2.

From the repository root:

```bash
cd app
npm install
npm run tauri dev
```

Frontend-only development:

```bash
cd app
npm run dev
```

## CI status

GitHub Actions workflow: [PasswordVault Build](https://github.com/palmid3v/passwordvault-palmid3v/actions/workflows/passwordvault-build.yml).

The latest recorded run on `main` passed:
- `npm ci` and `npm run build`
- `cargo test`

These CI results confirm those jobs passed on the recorded commit; they do not replace owner-reported desktop checks or establish an independent security audit.

## Security notes

- The owner has reported successful functional checks using a test vault and fictitious credentials.
- Sensitive vault operations remain in the Rust/Tauri layer.
- Zeroization is best-effort and is not a formal secure-memory guarantee.
- Clipboard clearing and OS keychain behavior can vary by platform.
- Do not commit vault files, credential exports, backups, passwords, recovery codes, or secrets.
- Do not describe PasswordVault as independently security-audited or certified.

The project owner has chosen to close the functional development phase without additional manual CLI or security-audit work. This documents that project decision; it does not claim that every platform-specific security property has been independently verified.

## Documentation

- [Architecture](app/docs/ARCHITECTURE.md)
- [Security model and limitations](app/docs/SECURITY.md)
- [Finalization status](app/docs/FINALIZATION.md)
- [Project context](CONTEXT.md)

---

**PasswordVault** · by PalmiD3v