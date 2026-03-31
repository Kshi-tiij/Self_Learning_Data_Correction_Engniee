import { useState, useEffect } from 'react';
import {
  Home, Upload, BrainCircuit, SearchCheck,
  BarChart2, FileText, Settings,
  RefreshCcw, Wifi, WifiOff,
  Database, Cpu, CheckCircle2, ChevronRight,
} from 'lucide-react';

import { cn, checkHealth, apiRequest } from './lib/helpers';

// ── Pages ──────────────────────────────────────────────────────────────────────
import DashboardPage  from './pages/DashboardPage';
import UploadPage     from './pages/UploadPage';
import TrainPage      from './pages/TrainPage';
import ReviewPage     from './pages/ReviewPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportsPage    from './pages/ReportsPage';
import ConfigPage     from './pages/ConfigPage';

// ── Navigation config ──────────────────────────────────────────────────────────
const PAGES = [
  { id: 'home',     label: 'Dashboard',        Icon: Home },
  { id: 'upload',   label: 'Upload Data',       Icon: Upload },
  { id: 'train',    label: 'Train Model',       Icon: BrainCircuit },
  { id: 'review',   label: 'Review & Correct',  Icon: SearchCheck },
  { id: 'monitor',  label: 'Monitoring',        Icon: BarChart2 },
  { id: 'reports',  label: 'Reports & Export',  Icon: FileText },
  { id: 'config',   label: 'Configuration',     Icon: Settings },
];

// ── State helpers ──────────────────────────────────────────────────────────────
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

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home');
  const [healthy, setHealthy] = useState(false);
  const [state, setAppState] = useState(initState());

  const ObjectKeys = Object.keys;

  const dispatch = (action) => {
    if (action.type === 'RESET') { setAppState(initState()); return; }
    if (action.type === 'RESTORE') { setAppState(prev => ({ ...prev, ...action.state })); return; }
    if (action.type === 'SET')   { setAppState(prev => ({ ...prev, [action.key]: action.val })); }
  };

  useEffect(() => {
    checkHealth().then(isHealthy => {
      setHealthy(isHealthy);
      if (isHealthy) {
        apiRequest('/session').then(sess => {
          if (sess && !sess.error) {
            dispatch({ type: 'RESTORE', state: sess });
          }
        });
      }
    });
    const iv = setInterval(() => checkHealth().then(setHealthy), 15000);
    return () => clearInterval(iv);
  }, []);

  const pageTitle = PAGES.find(p => p.id === page)?.label ?? 'SLDCE PRO';

  const renderPage = () => {
    switch (page) {
      case 'home':    return <DashboardPage  healthy={healthy} onNavigate={setPage} />;
      case 'upload':  return <UploadPage     state={state} dispatch={dispatch} />;
      case 'train':   return <TrainPage      state={state} dispatch={dispatch} />;
      case 'review':  return <ReviewPage     state={state} dispatch={dispatch} />;
      case 'monitor': return <MonitoringPage state={state} dispatch={dispatch} />;
      case 'reports': return <ReportsPage    state={state} dispatch={dispatch} />;
      case 'config':  return <ConfigPage     state={state} dispatch={dispatch} />;
      default:        return <DashboardPage  healthy={healthy} />;
    }
  };

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">S</div>
          <div>
            <div className="logo-text">SLDCE PRO</div>
            <div className="logo-version">v1.0.2</div>
          </div>
        </div>

        <div className="sidebar-section">
          {PAGES.map(({ id, label, Icon }) => (
            <div
              key={id}
              className={cn('nav-item', page === id && 'active')}
              onClick={() => setPage(id)}
            >
              <span className="nav-icon-wrap">
                <Icon size={16} strokeWidth={page === id ? 2.5 : 2} />
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* Status panel */}
        <div className="status-panel">
          <div className="status-title" style={{ opacity: 0.4 }}>Current Status</div>
          <div className="status-row" style={{ flexDirection: 'column', gap: 6 }}>
            <div className={cn('status-chip', state.dataUploaded ? 'chip-green' : 'chip-muted')}>
              <div className="chip-label">Data</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {state.dataUploaded
                  ? <><CheckCircle2 size={11} strokeWidth={2.5} /> Loaded</>
                  : <><Database size={11} strokeWidth={1.8} /> Await</>}
              </div>
            </div>
            <div className={cn('status-chip', state.modelTrained ? 'chip-green' : 'chip-amber')}>
              <div className="chip-label">Model</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {state.modelTrained
                  ? <><CheckCircle2 size={11} strokeWidth={2.5} /> Ready</>
                  : <><Cpu size={11} strokeWidth={1.8} /> Await</>}
              </div>
            </div>
          </div>
          {state.targetSet && (
            <div className="status-chip chip-primary" style={{ display: 'block', marginBottom: 6 }}>
              <div className="chip-label">Target</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : ''}</div>
            </div>
          )}
          {state.targetSet && (
            <div className="status-chip chip-muted" style={{ display: 'block' }}>
              <div className="chip-label">Type</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{state.problemType}</div>
            </div>
          )}
        </div>


      </aside>

      {/* ── Main ── */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{pageTitle}</div>
            <div className="breadcrumb">
              <span className="breadcrumb-link" onClick={() => setPage('home')}>Dashboard</span>
              {page !== 'home' && (
                <>
                  <ChevronRight size={12} className="breadcrumb-sep" />
                  <span className="breadcrumb-current">{pageTitle}</span>
                </>
              )}
            </div>
          </div>

          <div className="topbar-right">
            <div className={cn('topbar-pill', !healthy && 'offline')}>
              {healthy
                ? <><Wifi size={12} strokeWidth={2.5} /> Backend Connected</>
                : <><WifiOff size={12} strokeWidth={2.5} /> Backend Offline</>}
            </div>
            <button className="reset-btn" disabled={!state.dataUploaded} onClick={async () => { 
                await apiRequest('/reset', 'POST'); 
                dispatch({ type: 'RESET' }); 
              }}>
              <RefreshCcw size={13} strokeWidth={2.5} /> Reset Session
            </button>
          </div>
        </div>

        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
