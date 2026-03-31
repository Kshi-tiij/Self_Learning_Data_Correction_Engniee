import { useState, useEffect } from 'react';
import { Search, CheckCircle2, Check } from 'lucide-react';
import { apiRequest, cn, fmtVal } from '../lib/helpers';
import { MetricCard, Spinner, PageSkeleton } from '../components/shared';

export default function ReviewPage({ state, dispatch }) {
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [decision, setDecision] = useState('approve');
  const [corrected, setCorrected] = useState(-1);
  const [notes, setNotes] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  if (!state.modelTrained) {
    return <div className="card fade-up"><div className="alert alert-warn">⚠️ Train a model first.</div></div>;
  }

  const detect = async () => {
    setLoading(true);
    const res = await apiRequest('/correction/detect', 'POST', { percentile: 75 });
    if (res) dispatch({ type: 'SET', key: 'detectionResult', val: res });
    setLoading(false);
  };

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
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>File: <strong style={{ color: 'var(--text)' }}>{state.uploadedFilename}</strong></span>
            <span style={{ width: 1, height: 13, background: 'var(--border)', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Target: <strong style={{ color: 'var(--color-primary)' }}>{state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : ''}</strong></span>
            <span style={{ width: 1, height: 13, background: 'var(--border)', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Model: <strong style={{ color: 'var(--text)' }}>{state.selectedModel ? state.selectedModel.charAt(0).toUpperCase() + state.selectedModel.slice(1).replace(/_/g, ' ') : ''}</strong></span>
          </div>
          <button className="btn btn-primary" onClick={detect} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? <><Spinner /> Detecting…</> : <><Search size={15} strokeWidth={2.5} /> Detect Corruptions</>}
          </button>
        </div>
      </div>

      {detection && (
        <>
          <div className="grid-3 mt-20">
            <MetricCard label="Flagged Samples" value={detection.flagged_count} delta="need review" deltaType="amber" />
            <MetricCard label="Threshold"       value={detection.corruption_threshold ? detection.corruption_threshold.toFixed(4) : '—'} />
            <MetricCard label="Total Samples"   value={detection.total_samples ? detection.total_samples.toLocaleString() : '—'} />
          </div>

          {flagged.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginTop: 24, alignItems: 'start' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Flagged Sample Queue</div>
                <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                  {flagged.slice(0, 50).map((id, i) => (
                    <div key={id}
                      onClick={() => setSelectedIdx(i)}
                      style={{
                        padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: i === selectedIdx ? 'var(--color-primary-bg)' : 'transparent',
                        border: i === selectedIdx ? '1px solid var(--border)' : '1px solid transparent',
                        marginBottom: 4,
                        transition: 'all 0.2s ease',
                      }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: i === selectedIdx ? 700 : 400,
                        color: i === selectedIdx ? 'var(--color-primary)' : 'inherit'
                      }}>
                        Sample #{id}
                      </span>
                      {i === selectedIdx && <Check size={14} strokeWidth={3} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                {sampleLoading && <PageSkeleton />}
                {sr && !sampleLoading && (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span className="card-title">Sample #{sampleId}</span>
                      <span className={cn('badge', sr.true_label === sr.predicted_label ? 'badge-green' : 'badge-red')}>
                        {sr.true_label === sr.predicted_label ? '✓ Match' : '✗ Mismatch'}
                      </span>
                    </div>

                    <div className="grid-3" style={{ marginBottom: 14 }}>
                      {[
                        ['True Label', sr.true_label, 'var(--text)'],
                        ['Predicted', sr.predicted_label, 'var(--accent)'],
                        ['Corr. Prob', `${(sr.corruption_probability * 100).toFixed(1)}%`, sr.corruption_probability > .5 ? 'var(--red)' : 'var(--green)'],
                      ].map(([label, val, color]) => (
                        <div key={label} style={{ textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {sr.signals && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>Signals</div>
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
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '.5px', marginBottom: 8 }}>Numeric Features</div>
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
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '.5px', marginBottom: 8 }}>Categorical Features</div>
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

                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.5px', marginBottom: 8 }}>Target Feature</div>
                    <div className="feat-grid" style={{ marginBottom: 14 }}>
                      <div className="feat-val-card feat-target-card">
                        <div className="feat-val-name">{state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : ''}</div>
                        <div className="feat-val-val">{sr.true_label}</div>
                      </div>
                    </div>

                    <hr className="divider" />
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Your Review</div>
                    <div className="radio-group" style={{ marginBottom: 12 }}>
                        {[['approve', 'Approve', 'var(--green)', 'var(--color-tertiary-bg)'], 
                        ['reject', 'Reject', 'var(--red)', 'var(--color-danger-bg)'], 
                        ['unsure', 'Unsure', 'var(--text)', 'var(--color-neutral-100)']].map(([val, label, color, bg]) => (
                        <div className="radio-option" key={val}>
                          <input type="radio" id={`r_${val}`} value={val} checked={decision === val} onChange={() => setDecision(val)} />
                          <label htmlFor={`r_${val}`} style={decision === val ? { background: bg, color: color, borderColor: 'transparent', fontWeight: 700 } : {}}>
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Corrected Value (−1 = none)</label>
                        <input type="number" className="input" value={corrected} onChange={e => setCorrected(+e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Notes</label>
                        <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" style={{ minHeight: 96, resize: 'vertical' }} />
                      </div>
                    </div>
                    {feedbackSent
                      ? <div className="alert alert-success"><CheckCircle2 size={14} /> Feedback submitted! Select next sample.</div>
                      : <button className="btn btn-primary btn-full" onClick={submitFeedback}>Submit Feedback</button>
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
