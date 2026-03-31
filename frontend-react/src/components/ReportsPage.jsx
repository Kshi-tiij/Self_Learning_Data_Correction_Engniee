import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/helpers';

// A lightweight local version of the MetricCard from App.js to ensure visual uniformity
function LocalMetricCard({ label, value, icon, delta, deltaType }) {
  let deltaClass = 'delta-muted';
  if (deltaType === 'green') deltaClass = 'delta-green';
  if (deltaType === 'red') deltaClass = 'delta-red';

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta && <div className={`metric-delta ${deltaClass}`}>{delta}</div>}
      {icon && <div className="metric-icon">{icon}</div>}
    </div>
  );
}

export default function ReportsPage({ state }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('csv');
  const [includeProbs, setIncludeProbs] = useState(true);
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formats = [
    { id: 'csv', label: 'CSV Document (.csv)' },
    { id: 'json', label: 'JSON Payload (.json)' },
    { id: 'pdf', label: 'Compliance Report (.pdf)' },
  ];

  const handleExport = () => {
    setExporting(true);
    // Simulate API export delay
    setTimeout(() => setExporting(false), 1500);
  };

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">📝 Reports &amp; Export</div>
          <div className="section-sub">Generate compliance reports and data summaries</div>
        </div>
      </div>

      <div className="grid-3 mt-6">
        <LocalMetricCard
          label="Total Audits"
          value="1,248"
          icon="📊"
          delta="↑ 12% this week"
          deltaType="green"
        />
        <LocalMetricCard
          label="Clean Samples"
          value="24,421"
          icon="✅"
        />
        <LocalMetricCard
          label="Data Status"
          value={state.dataUploaded ? "Loaded" : "No Data"}
          icon="📋"
          delta={state.dataUploaded ? "Ready to export" : "Upload required"}
          deltaType={state.dataUploaded ? "green" : "muted"}
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

          <button className="btn btn-primary mt-16" style={{ width: '100%' }} onClick={handleExport} disabled={exporting || !state.dataUploaded}>
            {exporting ? '⏳ Generating...' : '📥 Generate Export'}
          </button>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Recent Activity</div>
          <div className="step-list">
            <div className="step-item">
              <div className="step-num" style={{ background: 'rgba(34,211,160,.12)', color: 'var(--green)' }}>✓</div>
              <div className="step-text"><strong>Monthly Audit.pdf</strong> <span>— Generated 2 hours ago</span></div>
            </div>
            <div className="step-item">
              <div className="step-num" style={{ background: 'rgba(34,211,160,.12)', color: 'var(--green)' }}>✓</div>
              <div className="step-text"><strong>Q3_Samples.csv</strong> <span>— Generated yesterday</span></div>
            </div>
          </div>
          <div className="alert alert-info mt-16">
            All reports are cryptographically signed for governance compliance.
          </div>
        </div>
      </div>
    </div>
  );
}
