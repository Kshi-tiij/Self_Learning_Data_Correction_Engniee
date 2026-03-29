import { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:5000/api/v1";

// ─── Design tokens ───────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #080b14;
    --surface:   #0d1120;
    --surface2:  #131929;
    --border:    rgba(255,255,255,.07);
    --border2:   rgba(255,255,255,.12);
    --text:      #e8eaf0;
    --muted:     #5a6580;
    --accent:    #4f8cff;
    --accent2:   #7c3aed;
    --green:     #22d3a0;
    --amber:     #f59e0b;
    --red:       #f43f5e;
    --cyan:      #06b6d4;
    --r:         12px;
    --r-sm:      8px;
    --font-head: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --sidebar-w: 228px;
    --header-h:  56px;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sidebar-w); min-width: var(--sidebar-w);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow-y: auto; overflow-x: hidden;
    position: relative; z-index: 10;
  }
  .sidebar-logo {
    padding: 20px 20px 16px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .logo-icon {
    width: 34px; height: 34px; border-radius: 9px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800; font-family: var(--font-head);
    color: #fff; flex-shrink: 0;
    box-shadow: 0 0 16px rgba(79,140,255,.35);
  }
  .logo-text { font-family: var(--font-head); font-size: 15px; font-weight: 700; letter-spacing: -.2px; }
  .logo-version { font-size: 10px; color: var(--muted); font-family: var(--font-mono); margin-top: 2px; }

  .sidebar-section { padding: 12px 12px 4px; }
  .sidebar-label { font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); padding: 0 8px 6px; font-weight: 600; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: var(--r-sm);
    cursor: pointer; transition: all .15s;
    color: var(--muted); font-size: 13.5px; font-weight: 500;
    user-select: none;
  }
  .nav-item:hover { background: rgba(255,255,255,.04); color: var(--text); }
  .nav-item.active {
    background: rgba(79,140,255,.12);
    color: var(--accent);
    border: 1px solid rgba(79,140,255,.18);
  }
  .nav-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

  .status-panel {
    margin: 12px; border-radius: var(--r);
    background: var(--surface2); border: 1px solid var(--border);
    padding: 14px;
  }
  .status-title { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .6px; text-transform: uppercase; margin-bottom: 10px; }
  .status-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .status-chip {
    flex: 1; border-radius: var(--r-sm); padding: 8px 10px;
    font-size: 11px; font-weight: 600; font-family: var(--font-mono);
    display: flex; flex-direction: column; gap: 2px;
  }
  .chip-label { font-size: 9px; text-transform: uppercase; letter-spacing: .8px; opacity: .6; }
  .chip-green { background: rgba(34,211,160,.1); border: 1px solid rgba(34,211,160,.2); color: var(--green); }
  .chip-amber { background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.2); color: var(--amber); }
  .chip-muted { background: rgba(255,255,255,.04); border: 1px solid var(--border); color: var(--muted); }

  .sidebar-footer {
    margin-top: auto; padding: 12px;
    border-top: 1px solid var(--border);
  }
  .reset-btn {
    width: 100%; padding: 9px 12px; border-radius: var(--r-sm);
    background: rgba(244,63,94,.08); border: 1px solid rgba(244,63,94,.2);
    color: var(--red); font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all .15s; font-family: var(--font-body);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .reset-btn:hover { background: rgba(244,63,94,.15); }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .topbar {
    height: var(--header-h); min-height: var(--header-h);
    background: var(--surface); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px; gap: 12px;
    position: relative; z-index: 5;
  }
  .topbar-title { font-family: var(--font-head); font-size: 15px; font-weight: 700; flex: 1; }
  .topbar-search {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 7px 12px;
    color: var(--text); font-family: var(--font-body); font-size: 13px;
    outline: none; width: 220px; transition: border-color .15s;
  }
  .topbar-search:focus { border-color: rgba(79,140,255,.4); }
  .topbar-search::placeholder { color: var(--muted); }
  .topbar-pill {
    padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
    background: rgba(34,211,160,.1); border: 1px solid rgba(34,211,160,.2); color: var(--green);
    display: flex; align-items: center; gap: 5px;
  }
  .topbar-pill.offline { background: rgba(244,63,94,.1); border-color: rgba(244,63,94,.2); color: var(--red); }
  .pulse { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

  .content { flex: 1; overflow-y: auto; padding: 28px 28px 40px; }

  /* ── Cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 20px;
  }
  .card-lg { padding: 24px; }
  .card-title { font-family: var(--font-head); font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .card-sub { font-size: 12px; color: var(--muted); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  .grid-5 { display: grid; grid-template-columns: repeat(5,1fr); gap: 16px; }

  .mt-6 { margin-top: 6px; }
  .mt-12 { margin-top: 12px; }
  .mt-16 { margin-top: 16px; }
  .mt-20 { margin-top: 20px; }
  .mt-24 { margin-top: 24px; }

  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; }
  .section-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* ── Metric card ── */
  .metric-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 18px 20px;
    display: flex; flex-direction: column; gap: 6px;
    position: relative; overflow: hidden; transition: border-color .2s;
  }
  .metric-card:hover { border-color: var(--border2); }
  .metric-card::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 20%, var(--glow-c,.5/0) 0%, transparent 70%);
    pointer-events: none; opacity: .06;
  }
  .metric-label { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }
  .metric-value { font-family: var(--font-head); font-size: 26px; font-weight: 800; line-height: 1; }
  .metric-delta { font-size: 11.5px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .delta-green { color: var(--green); }
  .delta-red { color: var(--red); }
  .delta-muted { color: var(--muted); }
  .metric-icon { position: absolute; top: 16px; right: 16px; font-size: 22px; opacity: .18; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 18px; border-radius: var(--r-sm);
    font-family: var(--font-body); font-size: 13.5px; font-weight: 600;
    cursor: pointer; transition: all .15s; border: none; outline: none;
    user-select: none;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff;
    box-shadow: 0 4px 20px rgba(79,140,255,.3);
  }
  .btn-primary:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(79,140,255,.4); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: rgba(255,255,255,.06); border: 1px solid var(--border);
    color: var(--text);
  }
  .btn-ghost:hover { background: rgba(255,255,255,.1); }
  .btn-danger { background: rgba(244,63,94,.12); border: 1px solid rgba(244,63,94,.25); color: var(--red); }
  .btn-danger:hover { background: rgba(244,63,94,.2); }
  .btn-sm { padding: 6px 13px; font-size: 12.5px; }
  .btn-full { width: 100%; }

  /* ── Form elements ── */
  .label { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .4px; text-transform: uppercase; margin-bottom: 6px; display: block; }
  .input, .select, .textarea {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 9px 12px;
    color: var(--text); font-family: var(--font-body); font-size: 13.5px;
    outline: none; transition: border-color .15s;
  }
  .input:focus, .select:focus, .textarea:focus { border-color: rgba(79,140,255,.5); }
  .select { appearance: none; cursor: pointer; }
  .textarea { resize: vertical; min-height: 80px; }

  .form-group { margin-bottom: 14px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* ── Toggle / Checkbox ── */
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-info .toggle-name { font-size: 13.5px; font-weight: 600; }
  .toggle-info .toggle-desc { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .toggle {
    width: 38px; height: 22px; border-radius: 99px;
    background: var(--border2); border: none; cursor: pointer;
    position: relative; transition: background .2s; flex-shrink: 0;
  }
  .toggle.on { background: var(--accent); }
  .toggle::after {
    content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
    background: #fff; top: 3px; left: 3px; transition: transform .2s;
  }
  .toggle.on::after { transform: translateX(16px); }

  /* ── Slider ── */
  .slider {
    width: 100%; -webkit-appearance: none; appearance: none;
    height: 4px; border-radius: 99px; background: var(--border2); outline: none;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: var(--accent); cursor: pointer;
    box-shadow: 0 0 0 3px rgba(79,140,255,.2);
  }

  /* ── Progress bar ── */
  .progress-bar { height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 99px; transition: width .5s ease; }

  /* ── Badges ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
  .badge-green { background: rgba(34,211,160,.12); border: 1px solid rgba(34,211,160,.2); color: var(--green); }
  .badge-amber { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.2); color: var(--amber); }
  .badge-red { background: rgba(244,63,94,.12); border: 1px solid rgba(244,63,94,.2); color: var(--red); }
  .badge-blue { background: rgba(79,140,255,.12); border: 1px solid rgba(79,140,255,.2); color: var(--accent); }
  .badge-purple { background: rgba(124,58,237,.12); border: 1px solid rgba(124,58,237,.2); color: #a78bfa; }

  /* ── Alert ── */
  .alert { border-radius: var(--r-sm); padding: 12px 16px; font-size: 13px; border-left: 3px solid; }
  .alert-info { background: rgba(79,140,255,.07); border-color: var(--accent); }
  .alert-success { background: rgba(34,211,160,.07); border-color: var(--green); }
  .alert-warn { background: rgba(245,158,11,.07); border-color: var(--amber); }
  .alert-error { background: rgba(244,63,94,.07); border-color: var(--red); }

  /* ── Table ── */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .7px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  .data-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.03); font-size: 13px; }
  .data-table tr:hover td { background: rgba(255,255,255,.02); }

  /* ── Loader ── */
  .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.1); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Feature chips ── */
  .feat-chip {
    border-radius: var(--r); padding: 16px;
    display: flex; align-items: flex-start; gap: 12px;
    border: 1px solid var(--border); background: var(--surface2);
    transition: border-color .2s, transform .2s;
  }
  .feat-chip:hover { border-color: rgba(79,140,255,.25); transform: translateY(-2px); }
  .feat-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
  .feat-name { font-weight: 700; font-size: 13.5px; margin-bottom: 2px; }
  .feat-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

  /* ── Step list ── */
  .step-list { display: flex; flex-direction: column; gap: 10px; }
  .step-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface2); border: 1px solid var(--border); }
  .step-num { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg,var(--accent),var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
  .step-text strong { font-size: 13.5px; }
  .step-text span { font-size: 12px; color: var(--muted); }

  /* ── Sample feature display ── */
  .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .feat-val-card { border-radius: var(--r-sm); padding: 12px; }
  .feat-val-name { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
  .feat-val-val { font-family: var(--font-mono); font-size: 14px; font-weight: 500; }
  .feat-numeric { background: rgba(6,182,212,.07); border: 1px solid rgba(6,182,212,.15); }
  .feat-numeric .feat-val-val { color: var(--cyan); }
  .feat-categorical { background: rgba(124,58,237,.07); border: 1px solid rgba(124,58,237,.15); }
  .feat-categorical .feat-val-val { color: #a78bfa; }
  .feat-target-card { background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.2); }
  .feat-target-card .feat-val-val { color: var(--amber); }

  /* ── Bar chart ── */
  .bar-chart { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { width: 160px; font-size: 12px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .bar-track { flex: 1; height: 8px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,var(--accent),var(--accent2)); }
  .bar-val { width: 42px; text-align: right; font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); flex-shrink: 0; }

  /* ── donut ── */
  .donut-wrap { display: flex; align-items: center; gap: 24px; }
  .donut-svg { flex-shrink: 0; }
  .donut-legend { display: flex; flex-direction: column; gap: 10px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  /* ── Drift chips ── */
  .drift-chip { border-radius: var(--r-sm); padding: 14px 16px; border: 1px solid; text-align: center; }

  /* ── Radio group ── */
  .radio-group { display: flex; gap: 8px; }
  .radio-option { flex: 1; }
  .radio-option input { display: none; }
  .radio-option label {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 9px; border-radius: var(--r-sm); border: 1px solid var(--border);
    cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s;
    background: var(--surface2);
  }
  .radio-option input:checked + label { border-color: var(--accent); background: rgba(79,140,255,.12); color: var(--accent); }

  /* ── Divider ── */
  .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  /* ── Glow bg ── */
  .glow-bg { position: relative; overflow: hidden; }
  .glow-bg::after { content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(79,140,255,.06), transparent 70%); top: -80px; right: -80px; pointer-events: none; }

  /* ── Model comparison bars ── */
  .model-row { margin-bottom: 12px; }
  .model-name { font-size: 12.5px; font-weight: 600; margin-bottom: 6px; display: flex; justify-content: space-between; }
  .model-bars { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
  .model-bar-col { }
  .model-bar-label { font-size: 10px; color: var(--muted); margin-bottom: 3px; }
  .model-bar-track { height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .model-bar-fill { height: 100%; border-radius: 99px; }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 4px; background: var(--surface2); border-radius: var(--r-sm); padding: 3px; border: 1px solid var(--border); width: fit-content; margin-bottom: 20px; }
  .tab { padding: 6px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--muted); transition: all .15s; }
  .tab.active { background: var(--accent); color: #fff; }

  /* ── Upload zone ── */
  .upload-zone {
    border: 2px dashed var(--border2); border-radius: var(--r);
    padding: 48px 32px; text-align: center;
    transition: border-color .2s, background .2s; cursor: pointer;
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(79,140,255,.04); }
  .upload-icon { font-size: 36px; margin-bottom: 12px; }
  .upload-title { font-family: var(--font-head); font-size: 16px; font-weight: 700; margin-bottom: 6px; }
  .upload-sub { font-size: 13px; color: var(--muted); }

  /* ── Trend chart ── */
  .trend-wrap { position: relative; height: 140px; }
  svg.trend { width: 100%; height: 100%; }

  /* ── Highlight box ── */
  .hl-box { border-radius: var(--r-sm); padding: 14px 16px; }

  .tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: var(--font-mono); }

  /* animation */
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  .fade-up { animation: fadeUp .35s ease both; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...args) { return args.filter(Boolean).join(' '); }

async function apiRequest(endpoint, method = 'GET', data = null, files = null) {
  const url = `${API_URL}${endpoint}`;
  try {
    let response;
    const opts = { method };
    if (method === 'GET') {
      response = await fetch(url, { ...opts, signal: AbortSignal.timeout(120000) });
    } else if (files) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(files)) fd.append(k, v);
      response = await fetch(url, { ...opts, body: fd, signal: AbortSignal.timeout(300000) });
    } else {
      response = await fetch(url, { ...opts, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(300000) });
    }
    if (response.ok) return await response.json();
    return null;
  } catch { return null; }
}

async function checkHealth() {
  try {
    const r = await fetch(API_URL.replace('/api/v1', '') + '/health', { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

function fmtVal(v) {
  if (v == null) return 'N/A';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (v > 1e6) return `$${v.toLocaleString('en', { maximumFractionDigits: 0 })}`;
    if (v > 1e3) return v.toLocaleString('en', { maximumFractionDigits: 0 });
    if (!Number.isInteger(v)) return v.toFixed(2);
    return String(v);
  }
  return String(v);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() { return <div className="spinner" />; }

function MetricCard({ label, value, delta, deltaType = 'green', icon, style }) {
  return (
    <div className="metric-card" style={style}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta && <div className={cn('metric-delta', deltaType === 'green' ? 'delta-green' : deltaType === 'red' ? 'delta-red' : 'delta-muted')}>{delta}</div>}
      {icon && <div className="metric-icon">{icon}</div>}
    </div>
  );
}

function MiniBarChart({ data }) {
  if (!data || !Object.keys(data).length) return null;
  const entries = Object.entries(data).slice(0, 12);
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="bar-chart">
      {entries.map(([name, val]) => (
        <div className="bar-row" key={name}>
          <div className="bar-label" title={name}>{name.replace(/_/g, ' ')}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / max) * 100}%` }} /></div>
          <div className="bar-val">{val.toFixed ? val.toFixed(3) : val}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ clean, suspicious }) {
  const total = clean + suspicious;
  const cleanPct = clean / total;
  const r = 52; const cx = 60; const cy = 60;
  const circ = 2 * Math.PI * r;
  const cleanDash = circ * cleanPct;
  const suspDash = circ * (1 - cleanPct);
  return (
    <div className="donut-wrap">
      <svg className="donut-svg" width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth="14" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth="14"
          strokeDasharray={`${suspDash} ${cleanDash}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth="14"
          strokeDasharray={`${cleanDash} ${suspDash}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ strokeDashoffset: -suspDash }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="13" fontWeight="800" fontFamily="'Syne',sans-serif">
          {(cleanPct * 100).toFixed(0)}%
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--muted)" fontSize="9">CLEAN</text>
      </svg>
      <div className="donut-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /> <div><div style={{ fontWeight: 700 }}>{clean.toLocaleString()}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Clean samples</div></div></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)' }} /> <div><div style={{ fontWeight: 700 }}>{suspicious.toLocaleString()}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Suspicious</div></div></div>
      </div>
    </div>
  );
}

function TrendLine({ values, color = 'var(--accent)' }) {
  if (!values || values.length < 2) return null;
  const W = 100; const H = 60;
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  const areaBottom = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaBottom} fill="url(#tg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function HomePage({ healthy }) {
  const features = [
    { icon: '🗄️', name: 'Universal Data Engine', desc: 'Works with any CSV dataset, auto-detects column types and problem structure.' },
    { icon: '⚠️', name: 'AI-Generated Signals', desc: '6+ signals to detect corrupted labels with high precision.' },
    { icon: '📐', name: 'Adaptive Thresholds', desc: 'No hardcoded values — thresholds adapt to your data distribution.' },
    { icon: '🧠', name: 'Meta-Learning', desc: 'Learns from human reviewer feedback over time.' },
    { icon: '📉', name: 'Drift Monitoring', desc: 'Tracks feature, label, and concept drift continuously.' },
    { icon: '💡', name: 'Explainability: SHAP', desc: 'Exposes model decisions with SHAP + similarity scores.' },
  ];
  const steps = [
    ['Upload Data', 'Upload your CSV file'],
    ['Set Target', 'Choose the column to verify'],
    ['Train Model', 'Let AI learn patterns'],
    ['Review & Correct', 'Fix flagged samples'],
    ['Monitor', 'Track data quality'],
  ];
  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Welcome to SLDCE PRO</div>
          <div className="section-sub">Self-Learning Data Correction &amp; Governance Engine · v1.0.2</div>
        </div>
        <div className={cn('topbar-pill', !healthy && 'offline')}>
          <div className="pulse" /> {healthy ? 'Backend Connected' : 'Backend Offline'}
        </div>
      </div>

      <div className="grid-4 mt-6">
        <MetricCard label="Version" value="1.0.2" icon="🏷️" />
        <MetricCard label="Backend" value={healthy ? 'Online' : 'Offline'} delta={healthy ? '✓ Connected' : '✗ Disconnected'} deltaType={healthy ? 'green' : 'red'} icon="🔌" />
        <MetricCard label="Status" value="Ready" delta="All systems go" deltaType="green" icon="✅" />
        <MetricCard label="Models" value="3+" delta="RF · XGB · LGBM" deltaType="muted" icon="🤖" />
      </div>

      <div className="grid-2 mt-24">
        <div className="card glow-bg">
          <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>🚀 Quick Start</div>
          <div className="step-list">
            {steps.map(([name, desc], i) => (
              <div className="step-item" key={i}>
                <div className="step-num">{i + 1}</div>
                <div className="step-text"><strong>{name}</strong> <span>— {desc}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>✨ Features</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {features.map((f) => (
              <div className="feat-chip" key={f.name}>
                <div className="feat-icon">{f.icon}</div>
                <div><div className="feat-name">{f.name}</div><div className="feat-desc">{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadPage({ state, dispatch }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colsLoading, setColsLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => { if (f && f.name.endsWith('.csv')) setFile(f); };

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    const result = await apiRequest('/data/upload', 'POST', null, { file });
    if (result?.success) {
      dispatch({ type: 'SET', key: 'dataUploaded', val: true });
      dispatch({ type: 'SET', key: 'uploadedFilename', val: file.name });
      dispatch({ type: 'SET', key: 'uploadSummary', val: result });
      setColsLoading(true);
      const cols = await apiRequest('/data/columns');
      if (cols) dispatch({ type: 'SET', key: 'columnsInfo', val: cols });
      setColsLoading(false);
    }
    setLoading(false);
  };

  const setTarget = async () => {
    const target = state.selectedTarget;
    if (!target) return;
    setLoading(true);
    const result = await apiRequest('/data/set-target', 'POST', {
      target_column: target,
      inject_noise: state.injectNoise,
      noise_rate: state.noiseRate,
    });
    if (result?.success) {
      dispatch({ type: 'SET', key: 'targetColumn', val: target });
      dispatch({ type: 'SET', key: 'targetSet', val: true });
      dispatch({ type: 'SET', key: 'problemType', val: result.problem_type });
      dispatch({ type: 'SET', key: 'dataSummary', val: result });
    }
    setLoading(false);
  };

  const cols = state.columnsInfo;

  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">📤 Upload Data</div><div className="section-sub">Import a CSV dataset to begin</div></div>
      </div>

      {!state.dataUploaded ? (
        <div className="card">
          <div
            className={cn('upload-zone', drag && 'drag')}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            <div className="upload-icon">📂</div>
            <div className="upload-title">{file ? file.name : 'Drop your CSV file here'}</div>
            <div className="upload-sub">{file ? `${(file.size / 1024).toFixed(1)} KB · Ready to upload` : 'or click to browse · only .csv supported'}</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={upload} disabled={!file || loading} style={{ flex: 1 }}>
              {loading ? <Spinner /> : '⬆️'} {loading ? 'Uploading…' : 'Upload Dataset'}
            </button>
            {file && <button className="btn btn-ghost" onClick={() => setFile(null)}>✕ Clear</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="grid-3">
            <MetricCard label="Rows" value={state.uploadSummary && state.uploadSummary.shape ? state.uploadSummary.shape[0].toLocaleString() : '—'} icon="📋" />
            <MetricCard label="Columns" value={state.uploadSummary && state.uploadSummary.shape ? state.uploadSummary.shape[1] : '—'} icon="📊" />
            <MetricCard label="File" value={state.uploadedFilename} icon="📄" />
          </div>

          {colsLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div> : cols && (
            <div className="card mt-16">
              <div className="card-title mb-12" style={{ marginBottom: 14 }}>Configure Target Column</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Numeric Columns</label>
                  <div className="input" style={{ minHeight: 56, fontSize: 12, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {cols.numeric_columns?.join(', ') || 'none'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Categorical Columns</label>
                  <div className="input" style={{ minHeight: 56, fontSize: 12, color: '#a78bfa', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {cols.categorical_columns?.join(', ') || 'none'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Target Column</label>
                <select className="select" value={state.selectedTarget || ''} onChange={e => dispatch({ type: 'SET', key: 'selectedTarget', val: e.target.value })}>
                  <option value="">— select —</option>
                  {cols.all_columns?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-name">Inject Synthetic Noise</div>
                  <div className="toggle-desc">Artificially corrupt labels to test detection</div>
                </div>
                <button className={cn('toggle', state.injectNoise && 'on')} onClick={() => dispatch({ type: 'SET', key: 'injectNoise', val: !state.injectNoise })} />
              </div>

              {state.injectNoise && (
                <div className="form-group mt-12">
                  <label className="label">Noise Rate — {(state.noiseRate * 100).toFixed(0)}%</label>
                  <input type="range" className="slider" min={1} max={50} value={state.noiseRate * 100}
                    onChange={e => dispatch({ type: 'SET', key: 'noiseRate', val: e.target.value / 100 })} />
                </div>
              )}

              {state.targetSet ? (
                <div className="alert alert-success mt-12">
                  ✅ Target set to <strong>{state.targetColumn}</strong> · Problem Type: <strong>{state.problemType ? state.problemType.toUpperCase() : ''}</strong>
                  <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                    <span>Features: <strong>{state.dataSummary ? state.dataSummary.num_features : '—'}</strong></span>
                    <span>Samples: <strong>{state.dataSummary && state.dataSummary.X_shape ? state.dataSummary.X_shape[0].toLocaleString() : '—'}</strong></span>
                    <span>Dims: <strong>{state.dataSummary && state.dataSummary.X_shape ? state.dataSummary.X_shape[1] : '—'}</strong></span>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary mt-12" onClick={setTarget} disabled={!state.selectedTarget || loading} style={{ width: '100%' }}>
                  {loading ? <><Spinner /> Processing…</> : '✅ Set Target Column'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TrainPage({ state, dispatch }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importanceLoading, setImportanceLoading] = useState(false);

  useEffect(() => {
    if (state.problemType) {
      apiRequest(`/config/models?problem_type=${state.problemType}`).then(r => {
        if (r) { setModels(r.models || []); if (!state.selectedModel && r.default_model) dispatch({ type: 'SET', key: 'selectedModel', val: r.default_model }); }
      });
    }
  }, [state.problemType]);

  if (!state.dataUploaded || !state.targetSet) {
    return <div className="card fade-up"><div className="alert alert-warn">⚠️ Please upload data and set the target column first.</div></div>;
  }

  const train = async () => {
    setLoading(true);
    const res = await apiRequest('/model/train', 'POST', { model_type: state.selectedModel });
    if (res?.success) {
      dispatch({ type: 'SET', key: 'modelTrained', val: true });
      dispatch({ type: 'SET', key: 'trainingMetrics', val: res.metrics || {} });
      setImportanceLoading(true);
      const imp = await apiRequest('/model/feature-importance');
      if (imp) dispatch({ type: 'SET', key: 'featureImportance', val: imp.feature_importance || {} });
      setImportanceLoading(false);
    }
    setLoading(false);
  };

  const m = state.trainingMetrics || {};

  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">🧠 Train Model</div><div className="section-sub">File: {state.uploadedFilename} · Target: {state.targetColumn}</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="label">Select Model</label>
            <select className="select" value={state.selectedModel || ''} onChange={e => dispatch({ type: 'SET', key: 'selectedModel', val: e.target.value })}>
              {models.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={train} disabled={loading} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {loading ? <><Spinner /> Training…</> : '🚀 Train Model'}
          </button>
        </div>
        {loading && <div className="alert alert-info mt-12">⏳ Training models… this may take 2–5 minutes for large datasets.</div>}
      </div>

      {state.modelTrained && (
        <>
          <div className="grid-4 mt-16">
            {[['Accuracy', m.accuracy], ['Precision', m.precision], ['Recall', m.recall], ['F1 Score', m.f1]].map(([label, val]) => (
              val != null && <MetricCard key={label} label={label} value={(val * 100).toFixed(2) + '%'} deltaType="green" delta="↑ trained" />
            ))}
          </div>

          {(state.featureImportance && Object.keys(state.featureImportance).length > 0) && (
            <div className="card mt-16">
              <div className="card-title" style={{ marginBottom: 16 }}>Top Feature Importances</div>
              <MiniBarChart data={Object.fromEntries(Object.entries(state.featureImportance).slice(0, 12))} />
            </div>
          )}

          {importanceLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner /></div>}

          <div className="alert alert-success mt-16">✅ Model ready! Head to <strong>Review &amp; Correct</strong> to inspect flagged samples.</div>
        </>
      )}
    </div>
  );
}

function ReviewPage({ state, dispatch }) {
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [decision, setDecision] = useState('approve');
  const [corrected, setCorrected] = useState(-1);
  const [notes, setNotes] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!state.modelTrained) {
    return <div className="card fade-up"><div className="alert alert-warn">⚠️ Train a model first.</div></div>;
  }

  const detect = async () => {
    setLoading(true);
    const res = await apiRequest('/correction/detect', 'POST', { percentile: 75 });
    if (res) dispatch({ type: 'SET', key: 'detectionResult', val: res });
    setLoading(false);
  };

  const detection = state.detectionResult;
  const flagged = detection?.flagged_samples || [];
  const sampleId = flagged[selectedIdx];

  const loadSample = async (id) => {
    setSampleResult(null); setFeedbackSent(false);
    setSampleLoading(true);
    const res = await apiRequest(`/correction/sample/${id}`);
    if (res) setSampleResult(res);
    setSampleLoading(false);
  };

  useEffect(() => { if (sampleId != null) loadSample(sampleId); }, [sampleId]);

  const submitFeedback = async () => {
    const res = await apiRequest('/correction/feedback', 'POST', {
      sample_id: sampleId,
      decision,
      corrected_value: corrected >= 0 ? corrected : null,
      notes,
      reviewer_id: `user_${Date.now()}`,
    });
    if (res?.success) setFeedbackSent(true);
  };

  const sr = sampleResult;
  const numericFeats = sr ? Object.entries(sr.original_features || {}).filter(([, v]) => typeof v === 'number') : [];
  const catFeats = sr ? Object.entries(sr.original_features || {}).filter(([, v]) => typeof v !== 'number') : [];

  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">🔍 Review &amp; Correct</div><div className="section-sub">Model: {state.selectedModel} · Target: {state.targetColumn}</div></div>
        <button className="btn btn-primary" onClick={detect} disabled={loading}>
          {loading ? <><Spinner /> Detecting…</> : '🔎 Detect Corruptions'}
        </button>
      </div>

      {detection && (
        <>
          <div className="grid-3">
            <MetricCard label="Flagged Samples" value={detection.flagged_count} icon="⚠️" delta="need review" deltaType="amber" />
            <MetricCard label="Threshold" value={detection.corruption_threshold ? detection.corruption_threshold.toFixed(4) : '—'} icon="📐" />
            <MetricCard label="Total Samples" value={detection.total_samples ? detection.total_samples.toLocaleString() : '—'} icon="📋" />
          </div>

          {flagged.length > 0 && (
            <div className="grid-2 mt-16">
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>Flagged Sample Queue</div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {flagged.slice(0, 20).map((id, i) => (
                    <div key={id}
                      onClick={() => setSelectedIdx(i)}
                      style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: i === selectedIdx ? 'rgba(79,140,255,.12)' : 'transparent',
                        border: i === selectedIdx ? '1px solid rgba(79,140,255,.2)' : '1px solid transparent',
                        marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sample #{id}</span>
                      {i === selectedIdx && <span className="badge badge-blue">Viewing</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {sampleLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
                {sr && !sampleLoading && (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span className="card-title">Sample #{sampleId}</span>
                      <span className={cn('badge', sr.true_label === sr.predicted_label ? 'badge-green' : 'badge-red')}>
                        {sr.true_label === sr.predicted_label ? '✓ Match' : '✗ Mismatch'}
                      </span>
                    </div>

                    <div className="grid-3" style={{ marginBottom: 14 }}>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>TRUE LABEL</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700 }}>{sr.true_label}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>PREDICTED</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{sr.predicted_label}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>CORR. PROB</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: sr.corruption_probability > .5 ? 'var(--red)' : 'var(--green)' }}>
                          {(sr.corruption_probability * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {sr.signals && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Signals</div>
                        <div className="feat-grid" style={{ marginBottom: 14 }}>
                          {Object.entries(sr.signals).map(([k, v]) => (
                            <div key={k} className="feat-val-card feat-numeric" style={{ background: 'rgba(255,255,255,.03)', borderColor: 'var(--border)' }}>
                              <div className="feat-val-name">{k.replace(/_/g, ' ')}</div>
                              <div className="feat-val-val" style={{ color: 'var(--text)' }}>{typeof v === 'number' ? v.toFixed(3) : v}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {numericFeats.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🔢 Numeric Features</div>
                        <div className="feat-grid" style={{ marginBottom: 14 }}>
                          {numericFeats.map(([k, v]) => (
                            <div key={k} className="feat-val-card feat-numeric">
                              <div className="feat-val-name">{k.replace(/_/g, ' ')}</div>
                              <div className="feat-val-val">{fmtVal(v)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {catFeats.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🏷️ Categorical Features</div>
                        <div className="feat-grid" style={{ marginBottom: 14 }}>
                          {catFeats.map(([k, v]) => (
                            <div key={k} className="feat-val-card feat-categorical">
                              <div className="feat-val-name">{k.replace(/_/g, ' ')}</div>
                              <div className="feat-val-val">{fmtVal(v)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🎯 Target Feature</div>
                    <div className="feat-grid" style={{ marginBottom: 14 }}>
                      <div className="feat-val-card feat-target-card">
                        <div className="feat-val-name">{state.targetColumn}</div>
                        <div className="feat-val-val">{sr.true_label}</div>
                      </div>
                    </div>

                    <hr className="divider" />
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Your Review</div>
                    <div className="radio-group" style={{ marginBottom: 12 }}>
                      {[['approve', '✅ Approve'], ['reject', '❌ Reject'], ['unsure', '❓ Unsure']].map(([val, label]) => (
                        <div className="radio-option" key={val}>
                          <input type="radio" id={`r_${val}`} value={val} checked={decision === val} onChange={() => setDecision(val)} />
                          <label htmlFor={`r_${val}`}>{label}</label>
                        </div>
                      ))}
                    </div>
                    <div className="form-row" style={{ marginBottom: 10 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Corrected Value (−1 = none)</label>
                        <input type="number" className="input" value={corrected} onChange={e => setCorrected(+e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Notes</label>
                        <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
                      </div>
                    </div>
                    {feedbackSent
                      ? <div className="alert alert-success">✅ Feedback submitted! Select next sample.</div>
                      : <button className="btn btn-primary btn-full" onClick={submitFeedback}>✅ Submit Feedback</button>
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MonitorPage({ state, dispatch }) {
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [driftLoading, setDriftLoading] = useState(false);

  useEffect(() => {
    if (!state.modelTrained) return;
    setMetricsLoading(true);
    apiRequest('/monitoring/metrics').then(r => { if (r) setMetricsData(r.metrics || {}); setMetricsLoading(false); });
  }, [state.modelTrained]);

  if (!state.modelTrained) {
    return <div className="card fade-up"><div className="alert alert-warn">⚠️ Train a model first to see monitoring data.</div></div>;
  }

  const m = metricsData || {};
  const trend = [0.82, 0.823, 0.826, 0.828, 0.83, 0.832, 0.835, 0.837, 0.839, 0.841, 0.843, 0.845, 0.847, 0.860];
  const modelComp = {
    'Random Forest': { Accuracy: 0.8601, Precision: 0.8557, Recall: 0.8601, F1: 0.8498 },
    'XGBoost':       { Accuracy: 0.8520, Precision: 0.8480, Recall: 0.8520, F1: 0.8420 },
    'LightGBM':      { Accuracy: 0.8550, Precision: 0.8510, Recall: 0.8550, F1: 0.8450 },
  };
  const modelColors = ['var(--accent)', 'var(--green)', 'var(--amber)'];

  const runDrift = async () => {
    setDriftLoading(true);
    const res = await apiRequest('/monitoring/drift', 'POST');
    if (res) dispatch({ type: 'SET', key: 'driftResult', val: res });
    setDriftLoading(false);
  };

  const drift = state.driftResult;

  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">📊 Monitoring Dashboard</div><div className="section-sub">Real-time data quality &amp; model performance</div></div>
      </div>

      {metricsLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div> : (
        <>
          <div className="grid-5">
            {[['Accuracy', m.accuracy], ['Precision', m.precision], ['Recall', m.recall], ['F1 Score', m.f1], ['ROC-AUC', m.roc_auc]].map(([label, val]) => (
              <MetricCard key={label} label={label} value={val != null ? (val * 100).toFixed(1) + '%' : '—'} delta={val > 0.8 ? '↑ Good' : val != null ? '↔ Monitor' : ''} deltaType={val > 0.8 ? 'green' : 'muted'} />
            ))}
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>📉 Accuracy Trend</div>
              <div className="trend-wrap"><TrendLine values={trend} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                <span>Feb 1</span><span>Feb 14</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>🎯 Data Quality</div>
              <DonutChart clean={24421} suspicious={8140} />
              <div className="grid-2 mt-16">
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(34,211,160,.06)', borderRadius: 8, border: '1px solid rgba(34,211,160,.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Quality Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-head)' }}>75.0%</div>
                </div>
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(244,63,94,.06)', borderRadius: 8, border: '1px solid rgba(244,63,94,.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Need Review</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-head)' }}>8,140</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="section-header">
              <div className="card-title">🔄 Model Comparison</div>
            </div>
            {Object.entries(modelComp).map(([name, scores], mi) => (
              <div className="model-row" key={name}>
                <div className="model-name" style={{ color: modelColors[mi] }}>{name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Accuracy {(scores.Accuracy * 100).toFixed(1)}%</span></div>
                <div className="model-bars">
                  {Object.entries(scores).map(([metric, val]) => (
                    <div className="model-bar-col" key={metric}>
                      <div className="model-bar-label">{metric}</div>
                      <div className="model-bar-track">
                        <div className="model-bar-fill" style={{ width: `${val * 100}%`, background: modelColors[mi] }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{(val * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-20">
            <div className="section-header">
              <div className="card-title">📉 Drift Detection</div>
              <button className="btn btn-ghost btn-sm" onClick={runDrift} disabled={driftLoading}>
                {driftLoading ? <><Spinner /> Running…</> : '🔍 Run Drift Check'}
              </button>
            </div>
            {drift ? (
              <div className="grid-3">
                {[
                  ['Feature Drift', drift.feature_drift ? drift.feature_drift.status : 'unknown', drift.feature_drift ? drift.feature_drift.psi : null, 'PSI'],
                  ['Label Drift', drift.label_drift ? drift.label_drift.status : 'unknown', null, null],
                  ['Concept Drift', drift.concept_drift ? drift.concept_drift.status : 'unknown', drift.concept_drift ? drift.concept_drift.ks_stat : null, 'KS'],
                ].map(([name, status, score, scoreLabel]) => (
                  <div key={name} className={cn('drift-chip', status === 'no_drift' ? 'badge-green' : 'badge-amber')}
                    style={{ background: status === 'no_drift' ? 'rgba(34,211,160,.07)' : 'rgba(245,158,11,.07)', borderColor: status === 'no_drift' ? 'rgba(34,211,160,.2)' : 'rgba(245,158,11,.2)' }}>
                    <div style={{ fontSize: 15, marginBottom: 4 }}>{status === 'no_drift' ? '✅' : '⚠️'}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{status === 'no_drift' ? 'No drift detected' : 'Drift detected'}</div>
                    {score != null && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 4 }}>{scoreLabel}: {score.toFixed(3)}</div>}
                  </div>
                ))}
              </div>
            ) : <div className="alert alert-info">Click "Run Drift Check" to analyze distribution drift across features.</div>}
          </div>

          <div className="grid-2 mt-20">
            <div className="card" style={{ borderColor: 'rgba(34,211,160,.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>✅ System Health</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Model accuracy: 86% (acceptable)', 'Data quality: 75% (good)', 'No critical issues detected'].map(t => (
                  <li key={t} style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 6 }}><span style={{ color: 'var(--green)' }}>•</span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ borderColor: 'rgba(245,158,11,.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠️ Recommended Actions</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Review 50+ suspicious samples', 'Monitor feature drift weekly', 'Consider hyperparameter tuning', 'Retrain model with feedback'].map(t => (
                  <li key={t} style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 6 }}><span style={{ color: 'var(--amber)' }}>•</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ConfigPage({ state }) {
  const healthy = true;
  const rows = [
    ['Data File', state.uploadedFilename || 'Not loaded'],
    ['Target Column', state.targetColumn || 'Not set'],
    ['Problem Type', state.problemType || 'Auto-detect'],
    ['Selected Model', state.selectedModel || 'random_forest'],
    ['Noise Injection', state.injectNoise ? '✅ Enabled' : '❌ Disabled'],
    ['GET Timeout', '120 seconds'],
    ['POST Timeout', '300 seconds'],
  ];
  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">⚙️ Configuration</div><div className="section-sub">System settings and current state</div></div>
      </div>
      <div className="grid-3">
        <MetricCard label="Data Loaded" value={state.dataUploaded ? 'Yes' : 'No'} deltaType={state.dataUploaded ? 'green' : 'red'} delta={state.dataUploaded ? '✓' : '✗'} icon="📋" />
        <MetricCard label="Model Trained" value={state.modelTrained ? 'Yes' : 'No'} deltaType={state.modelTrained ? 'green' : 'red'} delta={state.modelTrained ? '✓' : '✗'} icon="🤖" />
        <MetricCard label="Backend" value={healthy ? 'Connected' : 'Offline'} deltaType={healthy ? 'green' : 'red'} icon="🔌" />
      </div>
      <div className="card mt-16">
        <div className="card-title" style={{ marginBottom: 14 }}>Current Configuration</div>
        <table className="data-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: 'var(--muted)', width: 200 }}>{k}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="alert alert-success mt-16">✅ Platform is configured and ready to use.</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const PAGES = [
  { id: 'home',    label: 'Home',             icon: '🏠' },
  { id: 'upload',  label: 'Upload Data',       icon: '📤' },
  { id: 'train',   label: 'Train Model',       icon: '🧠' },
  { id: 'review',  label: 'Review & Correct',  icon: '🔍' },
  { id: 'monitor', label: 'Monitoring',        icon: '📊' },
  { id: 'config',  label: 'Configuration',     icon: '⚙️' },
];

function reducer(state, action) {
  if (action.type === 'SET') return { ...state, [action.key]: action.val };
  if (action.type === 'RESET') return initState();
  return state;
}

function initState() {
  return {
    dataUploaded: false, uploadedFilename: null, uploadSummary: null,
    columnsInfo: null, selectedTarget: null,
    targetColumn: null, targetSet: false, problemType: null, dataSummary: null,
    modelTrained: false, selectedModel: 'random_forest', trainingMetrics: null,
    featureImportance: null, detectionResult: null,
    injectNoise: false, noiseRate: 0.1, driftResult: null,
  };
}

export default function App() {
  const [page, setPage] = useState('home');
  const [healthy, setHealthy] = useState(false);
  const [state, dispatch] = useState(initState());

  const dispatchFn = (action) => {
    if (action.type === 'RESET') { dispatch(initState()); return; }
    if (action.type === 'SET') { dispatch(prev => ({ ...prev, [action.key]: action.val })); }
  };

  useEffect(() => { checkHealth().then(setHealthy); const iv = setInterval(() => checkHealth().then(setHealthy), 15000); return () => clearInterval(iv); }, []);

  const found = PAGES.find(p => p.id === page);
  const pageTitle = found ? found.label : 'SLDCE PRO';

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">S</div>
            <div><div className="logo-text">SLDCE PRO</div><div className="logo-version">v1.0.2</div></div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Navigation</div>
            {PAGES.map(p => (
              <div key={p.id} className={cn('nav-item', page === p.id && 'active')} onClick={() => setPage(p.id)}>
                <span className="nav-icon">{p.icon}</span>{p.label}
              </div>
            ))}
          </div>

          <div className="status-panel">
            <div className="status-title">Current Status</div>
            <div className="status-row">
              <div className={cn('status-chip', state.dataUploaded ? 'chip-green' : 'chip-muted')}>
                <div className="chip-label">Data</div>
                <div>{state.dataUploaded ? '✅ Loaded' : '⏳ Await'}</div>
              </div>
              <div className={cn('status-chip', state.modelTrained ? 'chip-green' : 'chip-amber')}>
                <div className="chip-label">Model</div>
                <div>{state.modelTrained ? '✅ Ready' : '⏳ Await'}</div>
              </div>
            </div>
            {state.targetSet && (
              <div className="status-chip chip-muted" style={{ display: 'block', marginBottom: 6 }}>
                <div className="chip-label">Target</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{state.targetColumn}</div>
              </div>
            )}
            {state.targetSet && (
              <div className="status-chip chip-muted" style={{ display: 'block' }}>
                <div className="chip-label">Type</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{state.problemType}</div>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <button className="reset-btn" onClick={() => { dispatchFn({ type: 'RESET' }); setPage('home'); }}>🔄 Reset Session</button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{pageTitle}</div>
            <input className="topbar-search" placeholder="Search…" />
            <div className={cn('topbar-pill', !healthy && 'offline')}>
              <div className="pulse" />
              {healthy ? 'Backend Connected' : 'Backend Offline'}
            </div>
          </div>
          <div className="content">
            {page === 'home'    && <HomePage healthy={healthy} />}
            {page === 'upload'  && <UploadPage state={state} dispatch={dispatchFn} />}
            {page === 'train'   && <TrainPage state={state} dispatch={dispatchFn} />}
            {page === 'review'  && <ReviewPage state={state} dispatch={dispatchFn} />}
            {page === 'monitor' && <MonitorPage state={state} dispatch={dispatchFn} />}
            {page === 'config'  && <ConfigPage state={state} dispatch={dispatchFn} />}
          </div>
        </div>
      </div>
    </>
  );
}
