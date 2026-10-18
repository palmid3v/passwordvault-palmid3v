# CONTEXT — PasswordVault

## Identity
- Product: PasswordVault
- Signature: PasswordVault · by PalmiD3v
- Type: Local-first desktop password manager
- Repository: https://github.com/palmid3v/passwordvault-palmid3v
- Default branch: `main`

## Current project status

The project owner has approved functional completion based on their reported desktop usage and has asked not to carry out additional manual CLI or security-audit work as part of this close-out.

The latest recorded GitHub Actions run for commit `cddab74906db11c95011770947b214528a0126eb` passed both the frontend build and native Rust test jobs:
https://github.com/palmid3v/passwordvault-palmid3v/actions/runs/39156510514

This status records functional project closure, not an independent security audit, formal certification, or a guarantee for every operating system.

## Architecture

```text
React + TypeScript
  → Tauri 2 commands
    → Rust VaultSession
      → encrypted KDBX4
      → optional OS keychain
```

The native Rust layer owns sensitive vault operations, persistence, lock/auto-lock, and session cleanup. Do not add plaintext credential persistence to browser storage.

## Implemented product scope

- Dashboard and credential CRUD.
- Search, category and importance filters.
- Password generation, strength feedback, visibility and clipboard actions.
- Dark/light/system themes and responsive UI.
- KDBX4 create/open/save/import/export.
- Native session lock and inactivity auto-lock.
- Best-effort zeroization and optional OS keychain integration.
- Native file dialogs and React-to-Rust API wrapper.
- Tauri content security policy and GitHub Actions workflow.

## Functional checks reported by the owner

Using a test vault and fictitious credentials, the owner reported that the app opens, creates a vault, saves and persists credentials across restart, rejects an incorrect master password without modifying the vault, and locks after inactivity. Clipboard behavior, keychain behavior, and KDBX4 interoperability were also reported as tested by the owner. These outcomes were not independently observed by this documentation update.

## Security and release wording

- Do not claim independent security audit or certification.
- Describe zeroization as best-effort, not a formal secure-memory guarantee.
- Clipboard and keychain behavior can vary by operating system.
- Do not promise crash-atomic durability without platform-specific evidence.
- Never commit KDBX files, credential exports, backups, passwords, recovery codes, or secrets.
- Keep sensitive operations in Rust and preserve the React → Tauri → Rust boundary.

## Development

```bash
cd app
npm install
npm run tauri dev
```

Frontend-only:

```bash
cd app
npm run dev
```

## Documentation

- `app/docs/ARCHITECTURE.md`
- `app/docs/SECURITY.md`
- `app/docs/FINALIZATION.md`
- `app/docs/CONTEXT.md`

Future work should be limited to concrete issues or platform/release requirements rather than adding unrelated features.

## Documentation checkpoint — 2026-10-18

README.md actualizado con la arquitectura Tauri/Rust y el formato KDBX4. Estado funcional registrado por el proyecto y CI documentada como pasada; no afirmar auditoría independiente, certificación formal ni garantía de seguridad absoluta. Evitar nuevos claims sin evidencia.

Status labels describe the latest documented evidence, not a guarantee that every workflow is complete. Update this checkpoint when new validation results arrive.