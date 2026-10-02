# CONTEXT — PALMI PasswordVault

## Identity

- Product: PasswordVault
- Type: Desktop password-manager foundation
- Developer: PALMI-D3V
- Security sensitivity: High

## Purpose

Build a local-first desktop vault with a native security boundary. React is the presentation layer; Tauri commands connect to a Rust VaultSession.

## Current architecture

~~~text
React
  → Tauri commands
    → Rust VaultSession
      → encrypted KDBX4
      → optional OS keychain
~~~

## Current capabilities

- Credential CRUD
- Search and filters
- Password generation
- Clipboard actions
- Themes
- Responsive UI
- KDBX4 encrypted persistence
- Vault open/save/import/export
- Native lock
- Native auto-lock
- Rust zeroization
- OS keychain integration
- Native security tests

## Security rules

- No credentials in browser persistence.
- No real KDBX files in Git.
- No secrets in Git.
- Do not invent cryptography.
- Use established encrypted-vault implementations.
- Treat secure-memory behavior as not formally audited.
- Validate platform keychain behavior.

## Production gate

Required before real credential use:
- KDBX interoperability
- keychain validation
- packaged Tauri validation
- clipboard lifecycle review
- memory/security review
- import/export failure recovery
- regression testing
- final security audit

## Development

~~~bash
cd app
npm install
npm run dev
~~~

Desktop:

~~~bash
cd app
npm run tauri dev
~~~

Native tests:

~~~bash
cd app/src-tauri
cargo test
~~~

## Documentation

See app/docs/ARCHITECTURE.md, app/docs/SECURITY.md, and app/docs/FINALIZATION.md.

## Rule for future work

Any credential, encryption, persistence, import/export, locking, or key-management feature must preserve the React → Tauri → Rust security boundary.
