import {
  Database, Zap, Gauge, Brain, TrendingDown, Lightbulb,
  Tag, Plug, CheckCircle2, Bot
} from 'lucide-react';
import { MetricCard } from '../components/shared';

export default function DashboardPage({ healthy, onNavigate }) {
  const features = [
    { Icon: Database, name: 'Universal Data Engine', desc: 'Works with any CSV dataset, auto-detects column types and problem structure.' },
    { Icon: Zap, name: 'AI-Generated Signals', desc: '6+ signals to detect corrupted labels with high precision.' },
    { Icon: Gauge, name: 'Adaptive Thresholds', desc: 'No hardcoded values — thresholds adapt to your data distribution.' },
    { Icon: Brain, name: 'Meta-Learning', desc: 'Learns from human reviewer feedback over time.' },
    { Icon: TrendingDown, name: 'Drift Monitoring', desc: 'Tracks feature, label, and concept drift continuously.' },
    { Icon: Lightbulb, name: 'Explainability: SHAP', desc: 'Exposes model decisions with SHAP + similarity scores.' },
  ];

  const steps = [
    { name: 'Upload Data', desc: 'Upload your CSV file', page: 'upload' },
    { name: 'Set Target', desc: 'Choose the column to verify', page: 'upload' },
    { name: 'Train Model', desc: 'Let AI learn patterns', page: 'train' },
    { name: 'Review & Correct', desc: 'Fix flagged samples', page: 'review' },
    { name: 'Monitoring', desc: 'Track data quality', page: 'monitor' },
    { name: 'Reports & Export', desc: 'Export results & reports', page: 'reports' },
    { name: 'Configuration', desc: 'View system settings', page: 'config' },
  ];

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Welcome to SLDCE PRO</div>
          <div className="section-sub">Self-Learning Data Correction &amp; Governance Engine</div>
        </div>
      </div>

      <div className="grid-4 mt-6">
        <MetricCard label="Version" value="1.0.2" icon={<Tag size={18} strokeWidth={1.8} />} />
        <MetricCard label="Backend" value={healthy ? 'Online' : 'Offline'} delta={healthy ? '✓ Connected' : '✗ Disconnected'} deltaType={healthy ? 'green' : 'red'} icon={<Plug size={18} strokeWidth={1.8} />} />
        <MetricCard label="Status" value="Ready" delta="All systems go" deltaType="green" icon={<CheckCircle2 size={18} strokeWidth={1.8} />} />
        <MetricCard label="Models" value="3+" delta="RF · XGB · LGBM" deltaType="muted" icon={<Bot size={18} strokeWidth={1.8} />} />
      </div>

      <div className="grid-2 mt-24">
        {/* Quick Start */}
        <div className="card glow-bg">
          <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>Quick Start</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {steps.map(({ name, desc, page }) => (
              <button
                key={name}
                className="quick-action-btn"
                onClick={() => onNavigate?.(page)}
              >
                <span className="quick-action-title">{name}</span>
                <span className="quick-action-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="card">
          <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>Features</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {features.map(({ Icon, name, desc }) => (
              <div className="feat-chip" key={name}>
                <div className="feat-icon" style={{ color: 'var(--color-primary)', opacity: .85 }}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="feat-name">{name}</div>
                  <div className="feat-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
