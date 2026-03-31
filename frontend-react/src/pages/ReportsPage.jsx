import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Download } from 'lucide-react';
import { MetricCard, Spinner, PageSkeleton } from '../components/shared';
import { apiRequest, API_URL, cn } from '../lib/helpers';

export default function ReportsPage({ state }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('csv');
  const [includeProbs, setIncludeProbs] = useState(true);
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const dropRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch stats and recent exports from backend
  useEffect(() => {
    const fetchData = async () => {
      setStatsLoading(true);
      const [statsRes, recentRes] = await Promise.all([
        apiRequest('/reports/stats'),
        apiRequest('/reports/recent'),
      ]);
      if (statsRes) setStats(statsRes);
      if (recentRes) setRecent(recentRes.exports || []);
      setStatsLoading(false);
    };
    fetchData();
  }, []);

  const formats = [
    { id: 'csv', label: 'CSV Document (.csv)' },
    { id: 'json', label: 'JSON Payload (.json)' },
    { id: 'pdf', label: 'Compliance Report (.txt)' },
  ];

  const handleExport = async () => {
    setExporting(true);
    const result = await apiRequest('/reports/export', 'POST', {
      format,
      include_probabilities: includeProbs,
      only_suspicious: onlySuspicious,
    });
    if (result?.success) {
      // Trigger file download
      const downloadUrl = `${API_URL}/reports/download/${result.filename}`;
      window.open(downloadUrl, '_blank');
      // Refresh stats and recent activity
      const [statsRes, recentRes] = await Promise.all([
        apiRequest('/reports/stats'),
        apiRequest('/reports/recent'),
      ]);
      if (statsRes) setStats(statsRes);
      if (recentRes) setRecent(recentRes.exports || []);
    }
    setExporting(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  };

  const fmtExt = (fmt) => {
    if (fmt === 'csv') return 'CSV';
    if (fmt === 'json') return 'JSON';
    if (fmt === 'pdf') return 'TXT';
    return fmt.toUpperCase();
  };

  return (
    <div className="fade-up">
      {statsLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid-3 mt-6">
            <MetricCard
              label="Total Exports"
              value={stats?.total_exports ?? 0}
              delta={stats?.total_exports > 0 ? `${stats.total_exports} file${stats.total_exports > 1 ? 's' : ''} generated` : 'No exports yet'}
              deltaType={stats?.total_exports > 0 ? 'green' : 'muted'}
            />
            <MetricCard
              label="Clean Samples"
              value={stats?.clean_samples != null ? stats.clean_samples.toLocaleString() : '—'}
              delta={stats?.flagged_samples ? `${stats.flagged_samples.toLocaleString()} flagged` : ''}
              deltaType="green"
            />
            <MetricCard
              label="Data Status"
              value={state.dataUploaded ? 'Loaded' : 'No Data'}
              delta={state.dataUploaded ? `${stats?.total_samples?.toLocaleString() ?? '—'} total samples` : 'Upload required'}
              deltaType={state.dataUploaded ? 'green' : 'muted'}
            />
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Export Configuration</div>

              <div className="form-group">
                <label className="label">Export Format</label>
                <div className="custom-select" ref={dropRef}>
                  <button
                    className={cn('custom-select-trigger', dropOpen && 'open')}
                    onClick={() => setDropOpen(o => !o)}
                    type="button"
                  >
                    <span>{formats.find(f => f.id === format)?.label}</span>
                    <ChevronDown size={15} strokeWidth={2} className={cn('select-chevron', dropOpen && 'open')} />
                  </button>
                  {dropOpen && (
                    <div className="custom-select-menu">
                      <div className="custom-select-menu-inner">
                        {formats.map(f => (
                          <div
                            key={f.id}
                            className={cn('custom-select-item', format === f.id && 'selected')}
                            onClick={() => { setFormat(f.id); setDropOpen(false); }}
                          >
                            <span>{f.label}</span>
                            {format === f.id && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-name">Include Model Confidence</div>
                  <div className="toggle-desc">Attach probability scores to each exported row</div>
                </div>
                <button className={`toggle ${includeProbs ? 'on' : ''}`} onClick={() => setIncludeProbs(!includeProbs)} />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-name">Only Suspicious Samples</div>
                  <div className="toggle-desc">Filter export to only include flagged data points</div>
                </div>
                <button className={`toggle ${onlySuspicious ? 'on' : ''}`} onClick={() => setOnlySuspicious(!onlySuspicious)} />
              </div>

              <button
                className="btn btn-primary mt-16"
                style={{ width: '100%' }}
                onClick={handleExport}
                disabled={exporting || !state.dataUploaded}
              >
                {exporting ? <><Spinner /> Generating...</> : 'Generate Export'}
              </button>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Recent Activity</div>
              <div className="step-list">
                {recent.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>
                    No exports yet. Generate your first export to see activity here.
                  </div>
                ) : (
                  recent.slice(0, 10).map((exp, i) => (
                    <div className="step-item" key={i}>
                      <div className="step-text" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.filename}</strong>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                              background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                              flexShrink: 0, letterSpacing: '.3px',
                            }}>
                              {fmtExt(exp.format)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {exp.rows.toLocaleString()} rows exported
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{formatTimeAgo(exp.timestamp)}</span>
                          <button
                            className="icon-btn"
                            onClick={() => window.open(`${API_URL}/reports/download/${exp.filename}`, '_blank')}
                            title="Download"
                          >
                            <Download size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="alert alert-info mt-16">
                All exports include metadata headers for governance compliance.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
