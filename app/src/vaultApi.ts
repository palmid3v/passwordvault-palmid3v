import { invoke } from '@tauri-apps/api/core';

export type Credential = {
  id: string;
  service: string;
  category: string;
  username: string;
  email: string;
  url: string;
  password: string;
  notes: string;
  twofa: boolean;
  importance: 'Normal' | 'High' | 'Critical';
  updated: string;
};

export type VaultSummary = {
  locked: boolean;
  path: string | null;
  credentialCount: number;
  autoLockMinutes: number;
  keychainAvailable: boolean;
};

export type KeychainStatus = {
  available: boolean;
  configured: boolean;
};

export const nativeVault = {
  status: () => invoke<VaultSummary>('vault_status'),
  create: (path: string, masterPassword: string) => invoke<VaultSummary>('vault_create', { path, masterPassword }),
  open: (path: string, masterPassword: string) => invoke<VaultSummary>('vault_open', { path, masterPassword }),
  openWithKeychain: (path: string) => invoke<VaultSummary>('vault_open_with_keychain', { path }),
  save: () => invoke<VaultSummary>('vault_save'),
  export: (path: string) => invoke<VaultSummary>('vault_export', { path }),
  mergeKdbx: (path: string, masterPassword: string) => invoke<VaultSummary>('vault_merge_kdbx', { path, masterPassword }),
  credentials: () => invoke<Credential[]>('vault_credentials'),
  upsert: (credential: Credential) => invoke<VaultSummary>('vault_upsert', { credential }),
  delete: (id: string) => invoke<VaultSummary>('vault_delete', { id }),
  lock: () => invoke<void>('vault_lock'),
  setAutoLock: (minutes: number) => invoke<VaultSummary>('vault_set_auto_lock', { minutes }),
  keychainStatus: () => invoke<KeychainStatus>('keychain_status'),
  keychainStore: () => invoke<void>('keychain_store'),
  keychainClear: () => invoke<void>('keychain_clear'),
  pickOpenPath: () => invoke<string | null>('pick_open_kdbx'),
  pickImportXlsxPath: () => invoke<string | null>('pick_import_xlsx'),
  pickSavePath: () => invoke<string | null>('pick_save_kdbx'),
  importExcel: (path: string) => invoke<VaultSummary>('vault_import_excel', { path }),
};
