import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function api(path, options = {}) {
  const token = localStorage.getItem("audit_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function App() {
  const [page, setPage] = useState(localStorage.getItem("audit_token") ? "dashboard" : "landing");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("audit_user") || "null"));
  const [agents, setAgents] = useState([]);
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [toast, setToast] = useState("");
  const [auditProgress, setAuditProgress] = useState({});
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const socket = useMemo(() => io(API, { autoConnect: false }), []);

  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit("join:user", user.id);
    socket.on("audit:progress", event => {
      setAuditProgress(prev => ({ ...prev, [event.auditId]: event.progress }));
      setAudits(prev => prev.map(a => a._id === event.auditId ? { ...a, progress: event.progress, status: event.status } : a));
    });
    socket.on("audit:completed", audit => {
      setAudits(prev => prev.map(a => a._id === audit._id ? audit : a));
      setSelectedAudit(audit);
      setToast("Audit completed.");
    });
    return () => {
      socket.off("audit:progress");
      socket.off("audit:completed");
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [a, au] = await Promise.all([api("/api/agents"), api("/api/audits")]);
      setAgents(a);
      setAudits(au);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function submitAuth(e) {
    e.preventDefault();
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("audit_token", data.token);
      localStorage.setItem("audit_user", JSON.stringify(data.user));
      setUser(data.user);
      setPage("dashboard");
      setForm({ name: "", email: "", password: "" });
    } catch (e) {
      setToast(e.message);
    }
  }

  function logout() {
    localStorage.removeItem("audit_token");
    localStorage.removeItem("audit_user");
    setUser(null);
    setPage("landing");
  }

  if (page === "landing" && !user) return <Landing onStart={() => { setAuthMode("login"); setPage("auth"); }} />;
  if (page === "auth" && !user) return <Auth mode={authMode} setMode={setAuthMode} form={form} setForm={setForm} onSubmit={submitAuth} onBack={() => setPage("landing")} />;

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div className="brand" onClick={() => setPage("dashboard")}>
          <span className="brand-icon"><i className="bi bi-shield-check"></i></span>
          <span>AI Agent Audit</span>
        </div>
        <div className="nav-links">
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Dashboard</button>
          <button className={page === "agents" ? "active" : ""} onClick={() => setPage("agents")}>My Agents</button>
          <button className={page === "audits" ? "active" : ""} onClick={() => setPage("audits")}>Audits</button>
          <button className={page === "reports" ? "active" : ""} onClick={() => setPage("reports")}>Reports</button>
        </div>
        <div className="user-area">
          <span className="d-none d-md-inline">Hi, {user?.name}</span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <main className="container-fluid px-3 px-lg-5 py-4">
        {toast && <div className="alert alert-info d-flex justify-content-between"><span>{toast}</span><button className="btn-close" onClick={() => setToast("")}></button></div>}

        {page === "dashboard" && <Dashboard agents={agents} audits={audits} onAdd={() => setPage("agents")} onAudit={() => setPage("audits")} />}
        {page === "agents" && <Agents agents={agents} reload={loadData} setToast={setToast} />}
        {page === "audits" && <Audits agents={agents} audits={audits} progress={auditProgress} reload={loadData} setToast={setToast} />}
        {page === "reports" && <Reports audits={audits} selected={selectedAudit} setSelected={setSelectedAudit} />}
      </main>
    </div>
  );
}

function Landing({ onStart }) {
  return <div className="landing">
    <nav className="topbar landing-nav">
      <div className="brand"><span className="brand-icon"><i className="bi bi-shield-check"></i></span>AI Agent Audit</div>
      <button className="btn btn-primary" onClick={onStart}>Get Started</button>
    </nav>
    <section className="hero container">
      <div className="hero-copy">
        <span className="pill">REAL-TIME AI AGENT AUDITING</span>
        <h1>Audit your AI agents with <span>confidence.</span></h1>
        <p>Manage agents, run live audits, track progress in real time, and keep audit reports in one secure dashboard.</p>
        <button className="btn btn-primary btn-lg" onClick={onStart}>Start Auditing <i className="bi bi-arrow-right ms-2"></i></button>
      </div>
      <div className="hero-card">
        <div className="window-head"><span></span><span></span><span></span><b>Live Audit</b></div>
        <div className="score-ring"><strong>92</strong><small>Audit Score</small></div>
        <div className="mini-row"><span>Security</span><b>PASS</b></div>
        <div className="mini-row"><span>Reliability</span><b>PASS</b></div>
        <div className="mini-row"><span>Configuration</span><b>REVIEW</b></div>
      </div>
    </section>
    <section className="container features">
      {[
        ["bi-lightning-charge","Real-time audits","Watch audit progress update instantly with Socket.IO."],
        ["bi-database-check","Persistent reports","Store users, agents, audits and findings in MongoDB."],
        ["bi-lock","Secure authentication","Passwords are hashed and API routes are protected with JWT."]
      ].map(x => <div className="feature" key={x[0]}><i className={`bi ${x[0]}`}></i><h4>{x[1]}</h4><p>{x[2]}</p></div>)}
    </section>
  </div>;
}

function Auth({ mode, setMode, form, setForm, onSubmit, onBack }) {
  return <div className="auth-page">
    <div className="auth-card">
      <button className="back-btn" onClick={onBack}><i className="bi bi-arrow-left"></i> Back</button>
      <div className="brand justify-content-center mb-4"><span className="brand-icon"><i className="bi bi-shield-check"></i></span>AI Agent Audit</div>
      <div className="auth-toggle"><button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Sign In</button><button className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>Create Account</button></div>
      <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      <p className="muted">{mode === "login" ? "Sign in to continue auditing." : "Start using the audit dashboard."}</p>
      <form onSubmit={onSubmit}>
        {mode === "register" && <input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />}
        <input required type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
        <input required minLength="6" type="password" placeholder="Password (6+ characters)" value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
        <button className="btn btn-primary w-100 py-2">{mode === "login" ? "Sign In" : "Create Account"}</button>
      </form>
    </div>
  </div>;
}

function Dashboard({ agents, audits, onAdd, onAudit }) {
  const completed = audits.filter(a => a.status === "completed");
  const avg = completed.length ? Math.round(completed.reduce((s,a)=>s+(a.score||0),0)/completed.length) : 0;
  return <div>
    <div className="page-title"><div><span className="pill">OVERVIEW</span><h1>Audit Dashboard</h1><p>Monitor your AI agents and their audit health.</p></div><button className="btn btn-primary" onClick={onAudit}><i className="bi bi-play-fill me-1"></i> Run Audit</button></div>
    <div className="stats-grid">
      <Stat icon="bi-robot" label="AI Agents" value={agents.length} />
      <Stat icon="bi-activity" label="Total Audits" value={audits.length} />
      <Stat icon="bi-shield-check" label="Average Score" value={`${avg}/100`} />
      <Stat icon="bi-check2-circle" label="Completed" value={completed.length} />
    </div>
    <div className="panel-grid">
      <div className="panel"><div className="panel-head"><h4>Recent Audits</h4><button onClick={onAudit}>View all</button></div>
        {audits.slice(0,5).map(a => <AuditRow key={a._id} audit={a} />)}
        {!audits.length && <Empty text="No audits yet. Add an agent and run your first audit." onClick={onAdd} />}
      </div>
      <div className="panel"><div className="panel-head"><h4>Quick Start</h4></div>
        <div className="quick"><b>1</b><span><strong>Add an AI agent</strong><small>Give your agent a name and endpoint.</small></span></div>
        <div className="quick"><b>2</b><span><strong>Start an audit</strong><small>Track progress live from the dashboard.</small></span></div>
        <div className="quick"><b>3</b><span><strong>Review the report</strong><small>Inspect findings and score.</small></span></div>
      </div>
    </div>
  </div>;
}

function Stat({icon,label,value}) {
  return <div className="stat"><i className={`bi ${icon}`}></i><span>{label}</span><strong>{value}</strong></div>;
}

function Agents({ agents, reload, setToast }) {
  const [form, setForm] = useState({name:"", endpoint:"", type:"AI Agent"});
  async function add(e) {
    e.preventDefault();
    try { await api("/api/agents",{method:"POST",body:JSON.stringify(form)}); setForm({name:"",endpoint:"",type:"AI Agent"}); await reload(); setToast("Agent added."); }
    catch(e){setToast(e.message);}
  }
  async function remove(id) {
    try { await api(`/api/agents/${id}`,{method:"DELETE"}); await reload(); setToast("Agent deleted."); }
    catch(e){setToast(e.message);}
  }
  return <div>
    <div className="page-title"><div><span className="pill">AGENTS</span><h1>My AI Agents</h1><p>Register endpoints you are authorized to audit.</p></div></div>
    <div className="panel form-panel"><h4>Add AI Agent</h4><form className="row g-3" onSubmit={add}>
      <div className="col-md-4"><label>Agent name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Customer Support Agent"/></div>
      <div className="col-md-5"><label>Endpoint</label><input required value={form.endpoint} onChange={e=>setForm({...form,endpoint:e.target.value})} placeholder="https://example.com/v1/agent"/></div>
      <div className="col-md-3"><label>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>AI Agent</option><option>Chatbot</option><option>API Agent</option></select></div>
      <div className="col-12"><button className="btn btn-primary">Add Agent</button></div>
    </form></div>
    <div className="agents-grid">{agents.map(a=><div className="agent-card" key={a._id}><div className="agent-icon"><i className="bi bi-robot"></i></div><div><h4>{a.name}</h4><p>{a.endpoint}</p><span className="status"><i></i>{a.status || "Ready"}</span></div><button className="icon-btn" onClick={()=>remove(a._id)} title="Delete"><i className="bi bi-trash"></i></button></div>)}</div>
  </div>;
}

function Audits({agents,audits,progress,reload,setToast}) {
  const [agentId,setAgentId]=useState(agents[0]?._id||"");
  useEffect(()=>{ if(!agentId && agents[0]) setAgentId(agents[0]._id); },[agents]);
  async function run() {
    if(!agentId) return setToast("Add an agent first.");
    try { await api("/api/audits",{method:"POST",body:JSON.stringify({agentId})}); await reload(); setToast("Audit started — live progress is enabled."); }
    catch(e){setToast(e.message);}
  }
  return <div>
    <div className="page-title"><div><span className="pill">REAL-TIME</span><h1>Audits</h1><p>Run an authorized audit and watch its progress live.</p></div></div>
    <div className="panel run-panel"><div><h4>Start a new audit</h4><p>Select an agent and start the backend audit engine.</p></div><div className="run-controls"><select value={agentId} onChange={e=>setAgentId(e.target.value)}><option value="">Select agent</option>{agents.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}</select><button className="btn btn-primary" onClick={run}><i className="bi bi-play-fill"></i> Start Audit</button></div></div>
    <div className="panel"><div className="panel-head"><h4>Audit history</h4></div>{audits.map(a=><AuditRow key={a._id} audit={a} progress={progress[a._id]} />)}{!audits.length&&<p className="muted">No audits yet.</p>}</div>
  </div>;
}

function AuditRow({audit,progress}) {
  const p=progress ?? audit.progress ?? 0;
  return <div className="audit-row"><div className="audit-status"><i className={`bi ${audit.status==="completed"?"bi-check-circle-fill":"bi-arrow-repeat spin"}`}></i></div><div className="audit-main"><strong>{audit.agentName || "AI Agent"}</strong><span>{audit.status} · {new Date(audit.startedAt).toLocaleString()}</span>{audit.status!=="completed"&&<div className="progress mt-2"><div className="progress-bar" style={{width:`${p}%`}}></div></div>}</div><div className="score">{audit.status==="completed"?`${audit.score}/100`:`${p}%`}</div></div>;
}

function Reports({audits,selected,setSelected}) {
  const audit=selected || audits.find(a=>a.status==="completed");
  return <div>
    <div className="page-title"><div><span className="pill">REPORTS</span><h1>Audit Reports</h1><p>Review completed audit findings.</p></div></div>
    <div className="reports-layout"><div className="panel report-list">{audits.filter(a=>a.status==="completed").map(a=><button key={a._id} onClick={()=>setSelected(a)} className={audit?._id===a._id?"report-item selected":"report-item"}><span>{a.agentName}</span><b>{a.score}/100</b></button>)}{!audits.some(a=>a.status==="completed")&&<p className="muted">Completed reports will appear here.</p>}</div>
    {audit&&<div className="panel report-detail"><div className="report-score"><strong>{audit.score}</strong><span>/100</span><small>Audit score</small></div><h3>{audit.agentName}</h3><p className="muted">Completed {new Date(audit.completedAt || audit.startedAt).toLocaleString()}</p><div className="findings">{(audit.findings||[]).map((f,i)=><div className="finding" key={i}><span className={`badge-${f.status}`}>{f.status}</span><div><b>{f.title}</b><small>{f.category} · {f.severity}</small><p>{f.detail}</p></div></div>)}</div></div>}</div>
  </div>;
}

function Empty({text,onClick}) { return <div className="empty"><i className="bi bi-inbox"></i><p>{text}</p><button className="btn btn-primary" onClick={onClick}>Get Started</button></div>; }

export default App;
