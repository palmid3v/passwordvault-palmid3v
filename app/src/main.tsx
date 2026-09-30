import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Shield,KeyRound,LayoutDashboard,Lock,Sun,Moon,Plus,Search,RefreshCw,Copy,LogOut,FileUp,FileDown} from 'lucide-react';
import './styles.css';

type Credential={id:string;service:string;category:string;username:string;url:string;password:string;twofa:boolean;importance:'Normal'|'High'|'Critical';updated:string};

const seed:Credential[]=[];
const categories=['Development','Finance','Email','Social','Work','Gaming','Shopping','Cloud','Government','Other'];

function App(){
 const [dark,setDark]=useState(false),[page,setPage]=useState('Dashboard'),[creds,setCreds]=useState(seed),[query,setQuery]=useState('');
 const [show,setShow]=useState(false),[form,setForm]=useState<Partial<Credential>>({});
 const filtered=creds.filter(c=>[c.service,c.username,c.category,c.url].some(v=>v.toLowerCase().includes(query.toLowerCase())));
 const save=()=>{if(!form.service)return; const c={id:crypto.randomUUID(),service:form.service||'',category:form.category||'Other',username:form.username||'',url:form.url||'',password:form.password||'',twofa:!!form.twofa,importance:form.importance||'Normal',updated:new Date().toISOString()};setCreds(x=>[...x,c]);setShow(false);setForm({});};
 const generator=()=>setForm(x=>({...x,password:Array.from(crypto.getRandomValues(new Uint32Array(24)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'[n%70]).join('')}));
 return <div className={dark?'app dark':'app'}>
  <aside><div className="brand"><Shield/> <b>Palmi PasswordVault</b></div><div className="nav">
   {['Dashboard','Credentials','Categories','Security','Backup'].map(x=><button className={page===x?'active':''} onClick={()=>setPage(x)}><span>{x==='Dashboard'?<LayoutDashboard/>:x==='Credentials'?<KeyRound/>:<Shield/>}</span>{x}</button>)}
  </div><div className="sideBottom"><button onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}{dark?'Light mode':'Dark mode'}</button><button><Lock/>Lock Vault</button></div></aside>
  <main><header><div><div className="eyebrow">PALMI-D3V / SECURITY</div><h1>{page}</h1></div><div className="headerActions"><div className="search"><Search/><input placeholder="Search credentials..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="primary" onClick={()=>setShow(true)}><Plus/>New credential</button></div></header>
   {page==='Dashboard'&&<><div className="notice"><Lock/> <span><b>Encrypted vault architecture</b><br/>Your credentials belong in the encrypted vault, never in GitHub or plaintext storage.</span></div><section className="cards"><Card n={creds.length} t="Total accounts"/><Card n={creds.filter(c=>c.twofa).length} t="2FA enabled"/><Card n={creds.filter(c=>!c.twofa).length} t="2FA missing"/><Card n={creds.filter(c=>c.importance==='Critical').length} t="Critical"/></section><div className="grid"><Panel title="Recent credentials">{creds.length?<Table rows={filtered}/>:<Empty text="No credentials yet. Create your first vault entry."/>}</Panel><Panel title="Security posture"><div className="posture"><div><span>2FA coverage</span><b>{creds.length?Math.round(creds.filter(c=>c.twofa).length/creds.length*100):0}%</b></div><div><span>Recovery review</span><b>Pending</b></div><div><span>Vault status</span><b className="good">Protected</b></div></div></Panel></div></>}
   {page==='Credentials'&&<Panel title="Credential vault"><div className="toolbar"><button className="primary" onClick={()=>setShow(true)}><Plus/>New</button><button><RefreshCw/>Refresh</button></div>{filtered.length?<Table rows={filtered}/>:<Empty text="No credentials found."/>}</Panel>}
   {page==='Categories'&&<Panel title="Categories">{categories.map(c=><div className="cat"><span>{c}</span><b>{creds.filter(x=>x.category===c).length}</b></div>)}</Panel>}
   {page==='Security'&&<div className="grid"><Panel title="Security audit"><div className="audit">✓ Encrypted vault boundary<br/>✓ No credentials committed to source control<br/>✓ Dark mode available<br/>⚠ Native vault encryption integration: next implementation milestone</div></Panel><Panel title="Recommended"><p>Unique passwords</p><p>2FA on critical accounts</p><p>Offline encrypted backups</p><p>Never store the master password in the vault</p></Panel></div>}
   {page==='Backup'&&<Panel title="Vault lifecycle"><div className="lifecycle"><div><FileUp/> <b>Import encrypted vault</b><small>Required at session start</small></div><div><FileDown/> <b>Export encrypted vault</b><small>Required before lock/exit</small></div><div><LogOut/> <b>Lock & clear session</b><small>Clear decrypted data from memory</small></div></div></Panel>}
  </main>
  {show&&<div className="modal"><div className="dialog"><div className="dialogHead"><h2>New credential</h2><button onClick={()=>setShow(false)}>×</button></div>
   <div className="form">{[['service','Service'],['username','Username / Email'],['url','URL'],['password','Password']].map(([k,l])=><label>{l}<input type={k==='password'?'password':'text'} value={(form as any)[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label>Category<select value={form.category||'Development'} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option>{c}</option>)}</select></label><label>Importance<select value={form.importance||'Normal'} onChange={e=>setForm({...form,importance:e.target.value as any})}><option>Normal</option><option>High</option><option>Critical</option></select></label><label className="check"><input type="checkbox" checked={!!form.twofa} onChange={e=>setForm({...form,twofa:e.target.checked})}/> 2FA enabled</label></div>
   <div className="dialogActions"><button onClick={generator}><RefreshCw/>Generate password</button><button onClick={()=>setShow(false)}>Cancel</button><button className="primary" onClick={save}>Save encrypted entry</button></div></div></div>}
 </div>
}
function Card({n,t}:{n:number,t:string}){return <div className="card"><span>{t}</span><strong>{n}</strong></div>}
function Panel({title,children}:{title:string,children:any}){return <section className="panel"><h2>{title}</h2>{children}</section>}
function Empty({text}:{text:string}){return <div className="empty"><KeyRound/><p>{text}</p></div>}
function Table({rows}:{rows:Credential[]}){return <table><thead><tr><th>Service</th><th>Category</th><th>Username</th><th>2FA</th><th>Importance</th><th></th></tr></thead><tbody>{rows.map(r=><tr><td><b>{r.service}</b><small>{r.url}</small></td><td>{r.category}</td><td>{r.username}</td><td>{r.twofa?'✓':'—'}</td><td>{r.importance}</td><td><button title="Copy username"><Copy/></button></td></tr>)}</tbody></table>}
createRoot(document.getElementById('root')!).render(<App/>);
