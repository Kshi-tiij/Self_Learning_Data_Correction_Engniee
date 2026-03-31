import { useState, useEffect, useRef } from 'react';
import { Play, ChevronDown, Check, Timer } from 'lucide-react';
import { apiRequest, cn } from '../lib/helpers';
import { MetricCard, MiniBarChart, Spinner, PageSkeleton } from '../components/shared';

export default function TrainPage({ state, dispatch }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importanceLoading, setImportanceLoading] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (state.problemType) {
      apiRequest(`/config/models?problem_type=${state.problemType}`).then(r => {
        if (r) {
          setModels(r.models || []);
          if (!state.selectedModel && r.default_model)
            dispatch({ type: 'SET', key: 'selectedModel', val: r.default_model });
        }
      });
    }
  }, [state.problemType]);

  if (!state.dataUploaded || !state.targetSet) {
    return (
      <div className="card fade-up">
        <div className="alert alert-warn">⚠️ Please upload data and set the target column first.</div>
      </div>
    );
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
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>File: <strong style={{ color: 'var(--text)' }}>{state.uploadedFilename}</strong></span>
          <span style={{ width: 1, height: 13, background: 'var(--border)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Target: <strong style={{ color: 'var(--color-primary)' }}>{state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : ''}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="label">Select Model</label>
            <div className="custom-select" ref={dropRef}>
              <button
                className={cn('custom-select-trigger', dropOpen && 'open')}
                onClick={() => setDropOpen(o => !o)}
                type="button"
              >
                <span style={{ color: state.selectedModel ? 'var(--text)' : 'var(--muted)' }}>
                  {state.selectedModel ? state.selectedModel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Select Model…'}
                </span>
                <ChevronDown size={15} strokeWidth={2} className={cn('select-chevron', dropOpen && 'open')} />
              </button>
              {dropOpen && (
                <div className="custom-select-menu">
                  <div className="custom-select-menu-inner">
                    {models.map(m => (
                      <div
                        key={m}
                        className={cn('custom-select-item', state.selectedModel === m && 'selected')}
                        onClick={() => { dispatch({ type: 'SET', key: 'selectedModel', val: m }); setDropOpen(false); }}
                      >
                        <span>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        {state.selectedModel === m && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-primary" onClick={train} disabled={loading} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {loading ? <><Spinner /> Training…</> : 'Train Model'}
          </button>
        </div>
        {loading && (
          <div className="alert alert-info mt-12" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Timer size={14} strokeWidth={2.5} />
            Training models… this may take 2–5 minutes for large datasets.
          </div>
        )}
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

          {importanceLoading && <PageSkeleton />}

          <div className="alert alert-success mt-16">Model ready! Head to <strong>Review &amp; Correct</strong> to inspect flagged samples.</div>
        </>
      )}
    </div>
  );
}
