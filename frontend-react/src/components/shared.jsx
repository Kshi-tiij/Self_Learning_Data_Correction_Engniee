// ─── Shared UI Components ─────────────────────────────────────────────────────
import { cn } from '../lib/helpers';

export function Spinner() {
  return <div className="spinner" />;
}

export function PageSkeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="skeleton-row">
        <div className="skeleton-box" style={{ flex: 1, height: 96 }} />
        <div className="skeleton-box" style={{ flex: 1, height: 96 }} />
        <div className="skeleton-box" style={{ flex: 1, height: 96 }} />
      </div>
      <div className="skeleton-box" style={{ width: '100%', height: 200, marginTop: 8 }} />
    </div>
  );
}

export function MetricCard({ label, value, delta, deltaType = 'green', icon, style }) {
  return (
    <div className="metric-card" style={style}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta && <div className={cn('metric-delta', deltaType === 'green' ? 'delta-green' : deltaType === 'red' ? 'delta-red' : 'delta-muted')}>{delta}</div>}
      {icon && (
        <div className="metric-icon" style={{ color: 'var(--color-primary)', opacity: .15 }}>
          {icon}
        </div>
      )}
    </div>
  );
}

export function MiniBarChart({ data }) {
  if (!data || !Object.keys(data).length) return null;
  const entries = Object.entries(data).slice(0, 12);
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="bar-chart">
      {entries.map(([name, val]) => (
        <div className="bar-row" key={name}>
          <div className="bar-label" title={name}>{(name.charAt(0).toUpperCase() + name.slice(1)).replace(/_/g, ' ')}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / max) * 100}%` }} /></div>
          <div className="bar-val">{val.toFixed ? val.toFixed(3) : val}</div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ clean, suspicious }) {
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
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="13" fontWeight="800" fontFamily="'Inter',sans-serif">
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

export function TrendLine({ values, color = 'var(--accent)' }) {
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
