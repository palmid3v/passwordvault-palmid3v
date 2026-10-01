import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AlertTriangle, Check, ChevronDown, Copy, Eye, EyeOff, FileDown, FileUp,
  KeyRound, LayoutDashboard, Lock, Pencil, Plus, Search,
  Shield, Sun, Trash2, Unlock, X, Zap
} from 'lucide-react';
import './styles.css';

type Theme = 'light' | 'dark' | 'system';
type Page = 'Dashboard' | 'Credentials' | 'Categories' | 'Security' | 'Backup';
type Importance = 'Normal' | 'High' | 'Critical';

type Credential = {
  id: string; service: string; category: string; username: string; url: string;
  password: string; notes: string; twofa: boolean; importance: Importance; updated: string;
};

const categories = ['Development', 'Finance', 'Email', 'Social', 'Work', 'Gaming', 'Shopping', 'Cloud', 'Government', 'Other'];
const emptyForm: Omit<Credential, 'id' | 'updated'> = {
  service: '', category: 'Development', username: '', url: '', password: '', notes: '', twofa: false, importance: 'Normal'
};

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('passwordvault.theme') as Theme) || 'system');
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>('Dashboard');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [importance, setImportance] = useState<Importance | 'All'>('All');
  const [modal, setModal] = useState<'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<Credential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formPasswordVisible, setFormPasswordVisible] = useState(false);
  const [toast, setToast] = useState('');
  const [locked, setLocked] = useState(false);
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => credentials.filter((credential) => {
    const haystack = [credential.service, credential.username, credential.category, credential.url, credential.notes].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (category === 'All' || credential.category === category)
      && (importance === 'All' || credential.importance === importance);
  }), [credentials, query, category, importance]);

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

  const saveCredential = () => {
    if (!form.service.trim()) { setToast('Service name is required.'); return; }
    if (selected) {
      setCredentials((items) => items.map((item) => item.id === selected.id
        ? { ...item, ...form, updated: new Date().toISOString() } : item));
      setToast('Credential updated in this session.');
    } else {
      setCredentials((items) => [...items, { ...form, id: crypto.randomUUID(), updated: new Date().toISOString() }]);
      setToast('Credential added to this session.');
    }
    setModal(null);
  };

  const removeCredential = (credential: Credential) => {
    if (!window.confirm('Delete "' + credential.service + '" from this session?')) return;
    setCredentials((items) => items.filter((item) => item.id !== credential.id));
    setModal(null); setSelected(null); setToast('Credential deleted.');
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(label + ' copied. Clipboard should be cleared manually after use.');
    } catch { setToast('Clipboard access is unavailable.'); }
  };

  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const values = crypto.getRandomValues(new Uint32Array(24));
    setForm((current) => ({ ...current, password: Array.from(values, (value) => alphabet[value % alphabet.length]).join('') }));
    setFormPasswordVisible(true);
  };

  const lockVault = () => {
    setCredentials([]); setSelected(null); setModal(null); setLocked(true);
    setToast('Session cleared. Native encrypted vault unlock is still required.');
  };

  const nav = (next: Page) => { setPage(next); setMobileNav(false); };

  if (locked) {
    return <div className={'app ' + (dark ? 'dark' : '')}>
      <div className="lockedScreen"><div className="lockedCard">
        <div className="brandMark"><Shield /></div><span className="eyebrow">PALMI-D3V / LOCKED</span>
        <h1>Vault locked</h1>
        <p>The active in-memory session has been cleared. Reopening the encrypted vault requires the native Tauri/Rust vault layer.</p>
        <button className="primary" onClick={() => setLocked(false)}><Unlock /> Return to shell</button>
        <small>Development shell only — no credentials are persisted by this UI.</small>
      </div></div>
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
        <button onClick={lockVault}><Lock /> Lock session</button>
      </div>
    </aside>

    <main>
      <header>
        <button className="mobileMenu" onClick={() => setMobileNav((value) => !value)} aria-label="Open navigation"><ChevronDown /></button>
        <div><div className="eyebrow">PALMI-D3V / SECURITY</div><h1>{page}</h1></div>
        <div className="headerActions">
          <div className="search"><Search /><input aria-label="Search credentials" placeholder="Search credentials..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <button className="primary" onClick={openNew}><Plus /> New credential</button>
        </div>
      </header>

      <div className="securityBanner"><AlertTriangle /><div><strong>Development vault — not production safe.</strong>
        <span>Credentials exist only in the current React session. Encryption, persistence and native unlock are intentionally not simulated.</span>
      </div></div>

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
            <div><span>Session storage</span><b>Memory only</b></div>
            <div><span>Encryption</span><b className="warningText">Pending native vault</b></div>
            <div><span>Lock action</span><b className="good">Available</b></div>
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
          <Audit ok text="Secrets stay in React memory during this UI session." />
          <Audit ok text="Theme preference is the only persisted browser setting." />
          <Audit ok text="Password generation uses the Web Crypto API." />
          <Audit ok={false} text="Encrypted native vault is not implemented yet." />
          <Audit ok={false} text="Master-password authentication is not implemented yet." />
          <Audit ok={false} text="Auto-lock and secure memory cleanup require native integration." />
        </div></Panel>
        <Panel title="Recommended before production"><ul className="recommendations">
          <li>Use an established encrypted vault format/library.</li><li>Keep decrypted data outside browser persistence.</li>
          <li>Implement native auto-lock and session timeout.</li><li>Minimize clipboard exposure and clear it where the platform permits.</li>
          <li>Validate imports before exposing decrypted records to the UI.</li>
        </ul></Panel>
      </div>}

      {page === 'Backup' && <Panel title="Vault lifecycle"><div className="lifecycle">
        <Lifecycle icon={<FileUp />} title="Import encrypted vault" text="Blocked until native vault support is available." disabled />
        <Lifecycle icon={<FileDown />} title="Export encrypted vault" text="Blocked until native vault support is available." disabled />
        <Lifecycle icon={<Lock />} title="Lock & clear session" text="Available now; clears all in-memory credentials." onClick={lockVault} />
      </div></Panel>}
    </main>

    {modal === 'edit' && <CredentialEditor form={form} setForm={setForm} visible={formPasswordVisible} setVisible={setFormPasswordVisible} onClose={() => setModal(null)} onSave={saveCredential} onGenerate={generatePassword} editing={Boolean(selected)} />}
    {modal === 'view' && selected && <CredentialViewer credential={selected} onClose={() => setModal(null)} onEdit={() => openEdit(selected)} onDelete={() => removeCredential(selected)} onCopy={copyValue} />}
    {toast && <div className="toast"><Check /> {toast}</div>}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panelHead"><h2>{title}</h2>{action}</div>{children}</section>;
}
function Empty({ onAdd }: { onAdd: () => void }) {
  return <div className="empty"><KeyRound /><h3>No credentials yet</h3><p>Add a credential to explore the vault workflow.</p><button className="primary" onClick={onAdd}><Plus /> Add credential</button></div>;
}
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
      <Field label="Username / Email"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="you@example.com" /></Field>
      <Field label="URL"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></Field>
      <Field label="Password"><div className="passwordInput"><input type={visible ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff /> : <Eye />}</button></div>
        <div className="strength"><span className={strength.level}>{strength.label}</span><i><b style={{ width: strength.percent + '%' }} /></i></div></Field>
      <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Importance"><select value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value as Importance })}><option>Normal</option><option>High</option><option>Critical</option></select></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
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
    <Detail label="Password" value={show ? credential.password : '••••••••••••'} action={<><button onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button><button onClick={() => onCopy(credential.password, 'Password')}><Copy /></button></>} />
    <Detail label="URL" value={credential.url || '—'} /><Detail label="Category" value={credential.category} />
    <Detail label="Importance" value={credential.importance} /><Detail label="2FA" value={credential.twofa ? 'Enabled' : 'Not enabled'} />
    {credential.notes && <div className="detail full"><span>Notes</span><p>{credential.notes}</p></div>}
  </div><div className="dialogActions"><button onClick={onDelete}><Trash2 /> Delete</button><span className="spacer" /><button onClick={onClose}>Close</button><button className="primary" onClick={onEdit}><Pencil /> Edit</button></div></Modal>;
}
function Detail({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return <div className="detail"><span>{label}</span><div><b>{value}</b>{action}</div></div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field">{label}{children}</label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog"><div className="dialogHead"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X /></button></div>{children}</div>
  </div>;
}
function Audit({ ok, text }: { ok: boolean; text: string }) {
  return <div className={ok ? 'auditItem ok' : 'auditItem warning'}>{ok ? <Check /> : <AlertTriangle />}<span>{text}</span></div>;
}
function Lifecycle({ icon, title, text, disabled, onClick }: { icon: ReactNode; title: string; text: string; disabled?: boolean; onClick?: () => void }) {
  return <button className={'lifecycleCard ' + (disabled ? 'disabled' : '')} disabled={disabled} onClick={onClick}><span>{icon}</span><strong>{title}</strong><small>{text}</small></button>;
}
function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 12) score++; if (password.length >= 18) score++; if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++; if (/\d/.test(password)) score++; if (/[^A-Za-z0-9]/.test(password)) score++;
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return { level, label: password ? level[0].toUpperCase() + level.slice(1) : 'No password', percent: Math.min(100, score / 6 * 100) };
}
export default App;
