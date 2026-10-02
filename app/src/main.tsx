import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AlertTriangle, Check, ChevronDown, Copy, Eye, EyeOff, FileDown, FileUp,
  KeyRound, LayoutDashboard, Lock, Pencil, Plus, Search, Shield, Sun,
  Trash2, Unlock, X, Zap
} from 'lucide-react';
import { nativeVault, type Credential, type VaultSummary } from './vaultApi';
import './styles.css';

type Theme = 'light' | 'dark' | 'system';
type Page = 'Dashboard' | 'Credentials' | 'Categories' | 'Security' | 'Backup';
type Importance = 'Normal' | 'High' | 'Critical';
type Modal = 'edit' | 'view' | 'master' | null;
type VaultAction = 'create' | 'open' | 'import' | 'keychain' | null;

const isTauri = '__TAURI_INTERNALS__' in window;
const categories = ['Development', 'Finance', 'Email', 'Social', 'Work', 'Gaming', 'Shopping', 'Cloud', 'Government', 'Other'];
const emptyForm = {
  service: '', category: 'Development', username: '', email: '', url: '', password: '',
  notes: '', twofa: false, importance: 'Normal' as Importance
};

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('passwordvault.theme') as Theme) || 'system');
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>('Dashboard');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [importance, setImportance] = useState<Importance | 'All'>('All');
  const [modal, setModal] = useState<Modal>(null);
  const [vaultAction, setVaultAction] = useState<VaultAction>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [selected, setSelected] = useState<Credential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formPasswordVisible, setFormPasswordVisible] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    localStorage.setItem('passwordvault.theme', theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setDark(theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    if (!isTauri) return;
    nativeVault.status().then(setSummary).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => credentials.filter((credential) => {
    const haystack = [credential.service, credential.username, credential.category, credential.url, credential.notes].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (category === 'All' || credential.category === category)
      && (importance === 'All' || credential.importance === importance);
  }), [credentials, query, category, importance]);

  const refresh = async (nextSummary?: VaultSummary) => {
    const next = nextSummary ?? await nativeVault.status();
    setSummary(next);
    if (!next.locked) setCredentials(await nativeVault.credentials());
    else setCredentials([]);
  };

  const runNative = async (operation: () => Promise<VaultSummary | void>, success: string) => {
    try {
      setError('');
      const result = await operation();
      if (result && typeof result === 'object' && 'locked' in result) await refresh(result as VaultSummary);
      else if (summary && !summary.locked) await refresh();
      setToast(success);
    } catch (cause) {
      const message = String(cause);
      setError(message);
      if (message.toLowerCase().includes('vault is locked')) {
        setCredentials([]);
        setSummary((current) => current ? { ...current, locked: true, credentialCount: 0 } : current);
      }
    }
  };

  const chooseVaultFile = async (kind: 'open' | 'save') => {
    if (!isTauri) {
      setError('Native file dialogs are available when running the Tauri desktop app.');
      return null;
    }
    return kind === 'open' ? await nativeVault.pickOpenPath() : await nativeVault.pickSavePath();
  };

  const startVaultAction = (action: VaultAction) => {
    setMasterPassword('');
    setError('');
    setVaultAction(action);
    setModal('master');
  };

  const submitMasterPassword = async () => {
    const action = vaultAction;

    if (!action) return;

    try {
      setError('');

      if (action === 'keychain') {
        if (!summary?.path) {
          setError('Open a vault path first.');
          return;
        }

        await runNative(
          () => nativeVault.openWithKeychain(summary.path!),
          'Vault unlocked with the OS keychain.',
        );
      } else {
        if (!masterPassword) {
          setError('Master password is required.');
          return;
        }

        const path = await chooseVaultFile(action === 'create' ? 'save' : 'open');
        if (!path || Array.isArray(path)) return;

        const result = action === 'create'
          ? await nativeVault.create(path, masterPassword)
          : action === 'import'
            ? await nativeVault.import(path, masterPassword)
            : await nativeVault.open(path, masterPassword);

        await refresh(result);
        setToast(action === 'create' ? 'Encrypted vault created.' : 'Encrypted vault opened.');
      }

      setModal(null);
      setVaultAction(null);
      setMasterPassword('');
    } catch (cause) {
      setError(String(cause));
    }
  };

  const openNew = () => {
    setSelected(null); setForm(emptyForm); setFormPasswordVisible(false); setModal('edit');
  };

  const openEdit = (credential: Credential) => {
    setSelected(credential);
    setForm({
      service: credential.service, category: credential.category, username: credential.username,
      url: credential.url, password: credential.password, notes: credential.notes,
      twofa: credential.twofa, importance: credential.importance
    });
    setFormPasswordVisible(false);
    setModal('edit');
  };

  const saveCredential = async () => {
    if (!form.service.trim()) { setError('Service name is required.'); return; }
    if (!form.password) { setError('Password is required.'); return; }
    const credential: Credential = {
      ...form,
      id: selected?.id || '',
      updated: new Date().toISOString()
    };
    await runNative(
      () => nativeVault.upsert(credential),
      selected ? 'Credential saved to the encrypted vault.' : 'Credential added to the encrypted vault.'
    );
    setModal(null);
  };

  const removeCredential = async (credential: Credential) => {
    if (!window.confirm('Delete "' + credential.service + '" from the encrypted vault?')) return;
    await runNative(() => nativeVault.delete(credential.id), 'Credential deleted.');
    setModal(null); setSelected(null);
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(label + ' copied. Clear the clipboard after use.');
    } catch { setError('Clipboard access is unavailable.'); }
  };

  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const values = crypto.getRandomValues(new Uint32Array(24));
    setForm((current) => ({ ...current, password: Array.from(values, (value) => alphabet[value % alphabet.length]).join('') }));
    setFormPasswordVisible(true);
  };

  const importExcel = async () => {
    const path = await nativeVault.pickImportXlsxPath();
    if (!path) return;

    if (!window.confirm('Import credentials from this Excel workbook into the encrypted vault?')) {
      return;
    }

    await runNative(
      () => nativeVault.importExcel(path),
      'Excel credentials imported into the encrypted vault.',
    );
  };

  const lockVault = async () => {
    try {
      if (isTauri) await nativeVault.lock();
      setCredentials([]);
      setSummary((current) => current ? { ...current, locked: true, credentialCount: 0 } : null);
      setSelected(null);
      setModal(null);
      setToast('Vault locked and sensitive session data cleared.');
    } catch (cause) { setError(String(cause)); }
  };

  const nav = (next: Page) => { setPage(next); setMobileNav(false); };

  if (!isTauri) {
    return <div className={'app ' + (dark ? 'dark' : '')}><div className="lockedScreen"><div className="lockedCard">
      <div className="brandMark"><Shield /></div><span className="eyebrow">PALMI-D3V / DESKTOP ONLY</span>
      <h1>Native vault required</h1>
      <p>PasswordVault now uses Tauri/Rust for encrypted KDBX storage. The browser preview does not handle credentials or create plaintext fallbacks.</p>
      <small>Run the desktop app with the Tauri development command.</small>
    </div></div></div>;
  }

  if (!summary || summary.locked) {
    return <div className={'app ' + (dark ? 'dark' : '')}>
      <div className="lockedScreen"><div className="lockedCard vaultGate">
        <div className="brandMark"><Shield /></div><span className="eyebrow">PALMI-D3V / ENCRYPTED VAULT</span>
        <h1>{summary?.path ? 'Vault locked' : 'Open your vault'}</h1>
        <p>{summary?.path ? 'Unlock the existing encrypted KDBX vault to continue.' : 'Create a new encrypted KDBX vault or open an existing KeePass database.'}</p>
        <div className="gateActions">
          <button className="primary" onClick={() => startVaultAction('create')}><Plus /> Create vault</button>
          <button onClick={() => startVaultAction('open')}><Unlock /> Open vault</button>
          <button onClick={() => startVaultAction('import')}><FileUp /> Import KDBX</button>
          {summary?.path && <button onClick={() => startVaultAction('keychain')}><KeyRound /> Unlock with keychain</button>}
        </div>
        <small>Secrets are not stored in localStorage, IndexedDB, or the browser cache.</small>
      </div></div>
      {modal === 'master' && <MasterModal action={vaultAction} value={masterPassword} setValue={setMasterPassword} onSubmit={submitMasterPassword} onClose={() => { setModal(null); setVaultAction(null); }} error={error} />}
      {toast && <div className="toast"><Check /> {toast}</div>}
    </div>;
  }

  return <div className={'app ' + (dark ? 'dark' : '')}>
    <aside className={mobileNav ? 'open' : ''}>
      <div className="brand"><Shield /><strong>Palmi PasswordVault</strong></div>
      <nav>{(['Dashboard', 'Credentials', 'Categories', 'Security', 'Backup'] as Page[]).map((item) =>
        <button key={item} className={page === item ? 'active' : ''} onClick={() => nav(item)}>
          {item === 'Dashboard' ? <LayoutDashboard /> : item === 'Credentials' ? <KeyRound /> : <Shield />}{item}
        </button>)}</nav>
      <div className="sideBottom">
        <div className="themeRow"><span><Sun /> Theme</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </div>
        <button onClick={lockVault}><Lock /> Lock vault</button>
      </div>
    </aside>

    <main>
      <header>
        <button className="mobileMenu" onClick={() => setMobileNav((value) => !value)} aria-label="Open navigation"><ChevronDown /></button>
        <div><div className="eyebrow">PALMI-D3V / ENCRYPTED KDBX</div><h1>{page}</h1></div>
        <div className="headerActions">
          <div className="search"><Search /><input aria-label="Search credentials" placeholder="Search credentials..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <button className="primary" onClick={openNew}><Plus /> New credential</button>
        </div>
      </header>

      <div className="securityBanner"><Shield /><div><strong>Encrypted native vault active.</strong>
        <span>Credentials are persisted in the KDBX vault. Master password stays in native memory and is zeroized on lock.</span>
      </div></div>
      {error && <div className="errorBanner"><AlertTriangle /><span>{error}</span><button onClick={() => setError('')}><X /></button></div>}

      {page === 'Dashboard' && <>
        <section className="cards">
          <Metric value={credentials.length} label="Total accounts" />
          <Metric value={credentials.filter((item) => item.twofa).length} label="2FA enabled" />
          <Metric value={credentials.filter((item) => !item.twofa).length} label="2FA missing" />
          <Metric value={credentials.filter((item) => item.importance === 'Critical').length} label="Critical" />
        </section>
        <div className="grid">
          <Panel title="Recent credentials" action={<button onClick={() => nav('Credentials')}>View all</button>}>
            {filtered.length ? <CredentialTable rows={filtered.slice(0, 6)} onView={(item) => { setSelected(item); setModal('view'); }} onEdit={openEdit} onDelete={removeCredential} onCopy={copyValue} /> : <Empty onAdd={openNew} />}
          </Panel>
          <Panel title="Security posture"><div className="posture">
            <div><span>2FA coverage</span><b>{credentials.length ? Math.round(credentials.filter((item) => item.twofa).length / credentials.length * 100) : 0}%</b></div>
            <div><span>Storage</span><b>KDBX encrypted</b></div>
            <div><span>Auto-lock</span><b>{summary.autoLockMinutes} min</b></div>
            <div><span>OS keychain</span><b className={summary.keychainAvailable ? 'good' : 'warningText'}>{summary.keychainAvailable ? 'Available' : 'Unavailable'}</b></div>
          </div></Panel>
        </div>
      </>}

      {page === 'Credentials' && <Panel title={'Credential vault · ' + filtered.length} action={<button className="primary" onClick={openNew}><Plus /> New</button>}>
        <div className="filters">
          <select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={importance} onChange={(event) => setImportance(event.target.value as Importance | 'All')}><option>All</option><option>Normal</option><option>High</option><option>Critical</option></select>
          {(query || category !== 'All' || importance !== 'All') && <button onClick={() => { setQuery(''); setCategory('All'); setImportance('All'); }}>Clear filters</button>}
        </div>
        {filtered.length ? <CredentialTable rows={filtered} onView={(item) => { setSelected(item); setModal('view'); }} onEdit={openEdit} onDelete={removeCredential} onCopy={copyValue} /> : <Empty onAdd={openNew} />}
      </Panel>}

      {page === 'Categories' && <Panel title="Categories"><div className="categoryGrid">{categories.map((item) => {
        const count = credentials.filter((credential) => credential.category === item).length;
        return <button key={item} className="categoryCard" onClick={() => { setCategory(item); nav('Credentials'); }}><span>{item}</span><strong>{count}</strong></button>;
      })}</div></Panel>}

      {page === 'Security' && <div className="grid">
        <Panel title="Security status"><div className="audit">
          <Audit ok text="KDBX encryption is handled by the KeePass Rust library." />
          <Audit ok text="Master password is held by the native vault session and zeroized on lock." />
          <Audit ok text="Auto-lock runs from the Rust process." />
          <Audit ok text="OS keychain integration is available when the platform store is supported." />
          <Audit ok text="Browser persistence is limited to the non-sensitive theme preference." />
          <Audit ok={false} text="Clipboard clearing is platform-dependent; PasswordVault does not claim it can erase the OS clipboard." />
        </div></Panel>
        <Panel title="Session controls"><div className="sessionControls">
          <label>Auto-lock timeout<select value={summary.autoLockMinutes} onChange={(e) => runNative(() => nativeVault.setAutoLock(Number(e.target.value)), 'Auto-lock updated.')}>
            {[5, 10, 15, 30, 60, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select></label>
          <button onClick={async () => { await runNative(() => nativeVault.keychainStore(), 'Master password stored in the OS keychain.'); await refresh(); }}><KeyRound /> Remember in OS keychain</button>
          <button onClick={async () => { await runNative(() => nativeVault.keychainClear(), 'OS keychain entry cleared.'); }}><Trash2 /> Clear OS keychain entry</button>
        </div></Panel>
      </div>}

      {page === 'Backup' && <Panel title="Vault lifecycle"><div className="lifecycle">
        <Lifecycle icon={<FileUp />} title="Import encrypted KDBX" text="Open another KDBX and make it the active vault." onClick={() => startVaultAction('import')} />
        <Lifecycle icon={<FileUp />} title="Import Excel" text="Migrate credentials from an .xlsx file into the encrypted vault." onClick={importExcel} />
        <Lifecycle icon={<FileDown />} title="Export encrypted KDBX" text="Write the active encrypted vault to another .kdbx file." onClick={async () => {
          const path = await chooseVaultFile('save'); if (path && !Array.isArray(path)) await runNative(() => nativeVault.export(path), 'Encrypted vault exported.');
        }} />
        <Lifecycle icon={<Lock />} title="Lock vault" text="Zeroize native session secrets and return to the unlock screen." onClick={lockVault} />
      </div></Panel>}

      {modal === 'edit' && <CredentialEditor form={form} setForm={setForm} visible={formPasswordVisible} setVisible={setFormPasswordVisible} onClose={() => setModal(null)} onSave={saveCredential} onGenerate={generatePassword} editing={Boolean(selected)} />}
      {modal === 'view' && selected && <CredentialViewer credential={selected} onClose={() => setModal(null)} onEdit={() => openEdit(selected)} onDelete={() => removeCredential(selected)} onCopy={copyValue} />}
    </main>

    {toast && <div className="toast"><Check /> {toast}</div>}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className="panel"><div className="panelHead"><h2>{title}</h2>{action}</div>{children}</section>; }
function Empty({ onAdd }: { onAdd: () => void }) { return <div className="empty"><KeyRound /><h3>No credentials yet</h3><p>Add a credential to explore the encrypted vault workflow.</p><button className="primary" onClick={onAdd}><Plus /> Add credential</button></div>; }

function CredentialTable({ rows, onView, onEdit, onDelete, onCopy }: {
  rows: Credential[]; onView: (item: Credential) => void; onEdit: (item: Credential) => void;
  onDelete: (item: Credential) => void; onCopy: (value: string, label: string) => void;
}) {
  return <div className="tableWrap"><table><thead><tr><th>Service</th><th>Category</th><th>Username</th><th>2FA</th><th>Importance</th><th>Updated</th><th>Actions</th></tr></thead>
    <tbody>{rows.map((item) => <tr key={item.id}>
      <td><button className="serviceButton" onClick={() => onView(item)}><strong>{item.service}</strong><small>{item.url || 'No URL'}</small></button></td>
      <td>{item.category}</td><td>{item.username || '—'}</td><td>{item.twofa ? <span className="good">✓</span> : '—'}</td>
      <td><span className={'badge ' + item.importance.toLowerCase()}>{item.importance}</span></td><td>{new Date(item.updated).toLocaleDateString()}</td>
      <td><div className="rowActions"><button title="Copy username" onClick={() => onCopy(item.username, 'Username')} disabled={!item.username}><Copy /></button>
        <button title="Edit" onClick={() => onEdit(item)}><Pencil /></button><button title="Delete" onClick={() => onDelete(item)}><Trash2 /></button></div></td>
    </tr>)}</tbody></table></div>;
}

function CredentialEditor({ form, setForm, visible, setVisible, onClose, onSave, onGenerate, editing }: {
  form: typeof emptyForm; setForm: Dispatch<SetStateAction<typeof emptyForm>>; visible: boolean;
  setVisible: (value: boolean) => void; onClose: () => void; onSave: () => void; onGenerate: () => void; editing: boolean;
}) {
  const strength = passwordStrength(form.password);
  return <Modal title={editing ? 'Edit credential' : 'New credential'} onClose={onClose}>
    <div className="form">
      <Field label="Service *"><input autoFocus value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="GitHub" /></Field>
      <Field label="Username"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="palmi" /></Field>
      <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></Field>
      <Field full label="URL"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></Field>
      <Field full label="Password"><div className="passwordInput"><input type={visible ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff /> : <Eye />}</button></div>
        <div className="strength"><span className={strength.level}>{strength.label}</span><i><b style={{ width: strength.percent + '%' }} /></i></div></Field>
      <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Importance"><select value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value as Importance })}><option>Normal</option><option>High</option><option>Critical</option></select></Field>
      <Field full label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <label className="check"><input type="checkbox" checked={form.twofa} onChange={(e) => setForm({ ...form, twofa: e.target.checked })} /> 2FA enabled</label>
    </div>
    <div className="dialogActions"><button onClick={onGenerate}><Zap /> Generate password</button><span className="spacer" /><button onClick={onClose}>Cancel</button>
      <button className="primary" onClick={onSave}>{editing ? 'Save changes' : 'Add credential'}</button></div>
  </Modal>;
}

function CredentialViewer({ credential, onClose, onEdit, onDelete, onCopy }: {
  credential: Credential; onClose: () => void; onEdit: () => void; onDelete: () => void; onCopy: (value: string, label: string) => void;
}) {
  const [show, setShow] = useState(false);
  return <Modal title={credential.service} onClose={onClose}><div className="detailGrid">
    <Detail label="Username" value={credential.username || '—'} action={credential.username ? <button onClick={() => onCopy(credential.username, 'Username')}><Copy /></button> : undefined} />
    <Detail label="Email" value={credential.email || '—'} action={credential.email ? <button onClick={() => onCopy(credential.email, 'Email')}><Copy /></button> : undefined} />
    <Detail label="Password" value={show ? credential.password : '••••••••••••'} action={<><button onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button><button onClick={() => onCopy(credential.password, 'Password')}><Copy /></button></>} />
    <Detail label="URL" value={credential.url || '—'} /><Detail label="Category" value={credential.category} />
    <Detail label="Importance" value={credential.importance} /><Detail label="2FA" value={credential.twofa ? 'Enabled' : 'Not enabled'} />
    {credential.notes && <div className="detail full"><span>Notes</span><p>{credential.notes}</p></div>}
  </div><div className="dialogActions"><button onClick={onDelete}><Trash2 /> Delete</button><span className="spacer" /><button onClick={onClose}>Close</button><button className="primary" onClick={onEdit}><Pencil /> Edit</button></div></Modal>;
}

function MasterModal({ action, value, setValue, onSubmit, onClose, error }: {
  action: VaultAction; value: string; setValue: (value: string) => void; onSubmit: () => void; onClose: () => void; error: string;
}) {
  const create = action === 'create';
  const keychain = action === 'keychain';
  return <Modal title={create ? 'Create encrypted vault' : keychain ? 'Unlock with OS keychain' : 'Unlock encrypted vault'} onClose={onClose}>
    <div className="form single">
      {!keychain && <Field label={create ? 'New master password · minimum 12 characters' : 'Master password'}><input autoFocus type="password" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmit()} /></Field>}
      <div className="nativeHint"><Shield /><span>{keychain ? 'The password will be retrieved from the native OS credential store.' : 'The password is passed to the native vault only for unlock/create and is not persisted by the React UI.'}</span></div>
      {error && <div className="errorBanner"><AlertTriangle /><span>{error}</span></div>}
    </div>
    <div className="dialogActions"><span className="spacer" /><button onClick={onClose}>Cancel</button><button className="primary" onClick={onSubmit}>{create ? 'Create & encrypt' : 'Unlock'}</button></div>
  </Modal>;
}

function Detail({ label, value, action }: { label: string; value: string; action?: ReactNode }) { return <div className="detail"><span>{label}</span><div><b>{value}</b>{action}</div></div>; }
function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return <label className={'field' + (full ? ' full' : '')}>{label}{children}</label>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog"><div className="dialogHead"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X /></button></div>{children}</div>
  </div>;
}
function Audit({ ok, text }: { ok: boolean; text: string }) { return <div className={ok ? 'auditItem ok' : 'auditItem warning'}>{ok ? <Check /> : <AlertTriangle />}<span>{text}</span></div>; }
function Lifecycle({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick?: () => void }) {
  return <button className="lifecycleCard" onClick={onClick}><span>{icon}</span><strong>{title}</strong><small>{text}</small></button>;
}
function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 12) score++; if (password.length >= 18) score++; if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++; if (/\d/.test(password)) score++; if (/[^A-Za-z0-9]/.test(password)) score++;
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return { level, label: password ? level[0].toUpperCase() + level.slice(1) : 'No password', percent: Math.min(100, score / 6 * 100) };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
