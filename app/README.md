# Palmi PasswordVault v1.0.0

Desktop PasswordVault foundation for Palmi D3v.

## Stack
React + TypeScript + Vite + Tauri 2 + Rust.

## Current
The UI foundation is implemented with:
- Dashboard
- Credentials
- Categories
- Security
- Backup lifecycle
- Password Generator
- Dark/Light mode
- Responsive layout

## Security status
This release is an architecture/UI foundation. Do not store production credentials yet. The native encrypted `.kdbx` vault layer is the next required security milestone.

## Development
```bash
npm install
npm run dev
```

For Tauri development, install Rust and Tauri prerequisites for Windows, then:
```bash
npm run tauri dev
```
