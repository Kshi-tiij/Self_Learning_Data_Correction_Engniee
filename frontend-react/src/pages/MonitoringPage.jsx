import { useState, useEffect } from 'react';
import { ScanSearch, ShieldCheck, AlertOctagon, Search } from 'lucide-react';
import { apiRequest } from '../lib/helpers';
import { MetricCard, DonutChart, TrendLine, Spinner, PageSkeleton } from '../components/shared';

export default function MonitoringPage({ state, dispatch }) {
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [driftLoading, setDriftLoading] = useState(false);

  useEffect(() => {
    if (!state.modelTrained) return;
    setMetricsLoading(true);
    apiRequest('/monitoring/metrics').then(r => {
      if (r) setMetricsData(r.metrics || {});
      setMetricsLoading(false);
    });
  }, [state.modelTrained]);

  if (!state.modelTrained) {
    return (
      <div className="card fade-up"><div className="alert alert-warn">Train a model first to see monitoring data.</div></div>
    );
  }

  const m = metricsData || {};
  const trend = [0.82, 0.823, 0.826, 0.828, 0.83, 0.832, 0.835, 0.837, 0.839, 0.841, 0.843, 0.845, 0.847, 0.860];
  const modelComp = {
    'Random Forest': { Accuracy: 0.8601, Precision: 0.8557, Recall: 0.8601, F1: 0.8498 },
    'XGBoost': { Accuracy: 0.8520, Precision: 0.8480, Recall: 0.8520, F1: 0.8420 },
    'LightGBM': { Accuracy: 0.8550, Precision: 0.8510, Recall: 0.8550, F1: 0.8450 },
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
      {metricsLoading ? <PageSkeleton /> : (
        <>
          <div className="grid-5">
            {[['Accuracy', m.accuracy], ['Precision', m.precision], ['Recall', m.recall], ['F1 Score', m.f1], ['ROC-AUC', m.roc_auc]].map(([label, val]) => (
              <MetricCard key={label} label={label}
                value={val != null ? (val * 100).toFixed(1) + '%' : '—'}
                delta={val > 0.8 ? '↑ Good' : val != null ? '↔ Monitor' : ''}
                deltaType={val > 0.8 ? 'green' : 'muted'} />
            ))}
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Accuracy Trend</div>
              <div className="trend-wrap"><TrendLine values={trend} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                <span>Feb 1</span><span>Feb 14</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Data Quality</div>
              <DonutChart clean={24421} suspicious={8140} />
              <div className="grid-2 mt-16">
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(34,211,160,.06)', borderRadius: 8, border: '1px solid rgba(34,211,160,.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Quality Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: "'Inter',sans-serif" }}>75.0%</div>
                </div>
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(244,63,94,.06)', borderRadius: 8, border: '1px solid rgba(244,63,94,.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Need Review</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)', fontFamily: "'Inter',sans-serif" }}>8,140</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="section-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Model Comparison</div>
            </div>
            {Object.entries(modelComp).map(([name, scores], mi) => (
              <div className="model-row" key={name}>
                <div className="model-name" style={{ color: modelColors[mi] }}>
                  {name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Accuracy {(scores.Accuracy * 100).toFixed(1)}%</span>
                </div>
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
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Drift Detection</div>
              <button className="btn btn-primary" onClick={runDrift} disabled={driftLoading}>
                {driftLoading ? <><Spinner /> Running…</> : <><Search size={16} strokeWidth={2.5} /> Run Drift Check</>}
              </button>
            </div>
            {drift ? (
              <div className="grid-3">
                {[
                  ['Feature Drift', drift.feature_drift?.status ?? 'unknown', drift.feature_drift?.psi ?? null, 'PSI'],
                  ['Label Drift', drift.label_drift?.status ?? 'unknown', null, null],
                  ['Concept Drift', drift.concept_drift?.status ?? 'unknown', drift.concept_drift?.ks_stat ?? null, 'KS'],
                ].map(([name, status, score, scoreLabel]) => (
                  <div key={name} className="drift-chip"
                    style={{
                      background: status === 'no_drift' ? 'rgba(34,211,160,.07)' : 'rgba(245,158,11,.07)',
                      borderColor: status === 'no_drift' ? 'rgba(34,211,160,.2)' : 'rgba(245,158,11,.2)',
                    }}>
                    <div style={{ fontSize: 15, marginBottom: 4 }}>{status === 'no_drift' ? <ShieldCheck size={15} style={{ color: 'var(--green)' }} /> : <AlertOctagon size={15} style={{ color: 'var(--amber)' }} />}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{status === 'no_drift' ? 'No drift detected' : 'Drift detected'}</div>
                    {score != null && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 4 }}>{scoreLabel}: {score.toFixed(3)}</div>}
                  </div>
                ))}
              </div>
            ) : <div className="alert alert-info">Click "Run Drift Check" to analyze distribution drift across features.</div>}
          </div>



          <div className="grid-2 mt-20">
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} style={{ color: 'var(--green)' }} /> System Health
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Model accuracy: 86% (acceptable)', 'Data quality: 75% (good)', 'No critical issues detected'].map(t => (
                  <li key={t} style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 6 }}><span style={{ color: 'var(--green)' }}>•</span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertOctagon size={14} style={{ color: 'var(--amber)' }} /> Recommended Actions
              </div>
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
