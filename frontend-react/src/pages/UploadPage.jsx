import { useState, useRef, useEffect } from 'react';
import { Upload, UploadCloud, FileText, X, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { apiRequest, cn } from '../lib/helpers';
import { MetricCard, Spinner, PageSkeleton } from '../components/shared';

export default function UploadPage({ state, dispatch }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colsLoading, setColsLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const dropRef = useRef();
  const [dropOpen, setDropOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

      {!state.dataUploaded ? (
        <div className="card">
          {!file ? (
            /* ── Empty drop zone ── */
            <div
              className={cn('upload-zone', drag && 'drag')}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              <div className="upload-icon"><UploadCloud size={40} strokeWidth={1.4} style={{ color: 'var(--color-primary)', opacity: .5 }} /></div>
              <div className="upload-title">Drop your CSV file here</div>
              <div className="upload-sub">or click to browse · only .csv supported</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            /* ── File preview card ── */
            <div
              className={cn('upload-zone upload-preview', drag && 'drag')}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              <div className="file-preview-chip">
                <FileText size={20} strokeWidth={1.8} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span className="file-preview-name">{file.name}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                {(file.size / 1024).toFixed(1)} KB · Ready to upload
              </div>
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                style={{ marginTop: 12, fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >Change file</button>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={upload} disabled={!file || loading} style={{ flex: 1 }}>
              {loading ? <><Spinner /> Uploading…</> : <><Upload size={15} strokeWidth={2.5} /> Upload Dataset</>}
            </button>
            {file && <button className="reset-btn" onClick={() => setFile(null)}><X size={14} strokeWidth={2.5} /> Clear</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="grid-3">
            <MetricCard label="Rows"    value={state.uploadSummary?.shape ? state.uploadSummary.shape[0].toLocaleString() : '—'} />
            <MetricCard label="Columns" value={state.uploadSummary?.shape ? state.uploadSummary.shape[1] : '—'} />
            <MetricCard label="File"    value={state.uploadedFilename} />
          </div>

          {colsLoading ? <PageSkeleton /> : cols && (
            <div className="card mt-16">
              <div className="card-title mb-12" style={{ marginBottom: 14 }}>Configure Target Column</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Numeric Columns</label>
                  <div className="input" style={{ minHeight: 56, fontSize: 12, color: 'oklch(38% 0.2 220)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {cols.numeric_columns?.join(', ') || 'none'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Categorical Columns</label>
                  <div className="input" style={{ minHeight: 56, fontSize: 12, color: 'oklch(40% 0.24 292.717)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {cols.categorical_columns?.join(', ') || 'none'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Target Column</label>
                <div className="custom-select" ref={dropRef}>
                  <button
                    className={cn('custom-select-trigger', dropOpen && 'open', state.targetSet && 'disabled')}
                    onClick={() => !state.targetSet && setDropOpen(o => !o)}
                    type="button"
                    disabled={state.targetSet}
                  >
                    <span style={{ color: state.selectedTarget ? 'var(--text)' : 'var(--muted)' }}>
                      {state.selectedTarget ? state.selectedTarget.charAt(0).toUpperCase() + state.selectedTarget.slice(1) : 'Select Target Column…'}
                    </span>
                    <ChevronDown size={15} strokeWidth={2} className={cn('select-chevron', dropOpen && 'open')} />
                  </button>
                  {dropOpen && (
                    <div className="custom-select-menu">
                      <div className="custom-select-menu-inner">
                        {cols.all_columns?.map(c => (
                          <div
                            key={c}
                            className={cn('custom-select-item', state.selectedTarget === c && 'selected')}
                            onClick={() => { dispatch({ type: 'SET', key: 'selectedTarget', val: c }); setDropOpen(false); }}
                          >
                            <span>{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                            {state.selectedTarget === c && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-name">Inject Synthetic Noise</div>
                  <div className="toggle-desc">Artificially corrupt labels to test detection</div>
                </div>
                <button
                  className={cn('toggle', state.injectNoise && 'on')}
                  onClick={() => !state.targetSet && dispatch({ type: 'SET', key: 'injectNoise', val: !state.injectNoise })}
                  disabled={state.targetSet}
                  style={state.targetSet ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                />
              </div>

              {state.injectNoise && (
                <div className="form-group mt-12">
                  <label className="label">Noise Rate — {(state.noiseRate * 100).toFixed(0)}%</label>
                  <input
                    type="range" className="slider" min={1} max={50}
                    value={state.noiseRate * 100}
                    style={{ '--fill': `${((state.noiseRate * 100 - 1) / 49) * 100}%`, ...(state.targetSet ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}) }}
                    onChange={e => !state.targetSet && dispatch({ type: 'SET', key: 'noiseRate', val: e.target.value / 100 })}
                    disabled={state.targetSet}
                  />
                </div>
              )}

              {state.targetSet ? (
                <div className="alert alert-success mt-12">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>Target: <strong>{state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : ''}</strong></span>
                    <span style={{ width: 1, height: 14, background: 'currentColor', opacity: 0.25, display: 'inline-block' }} />
                    <span>Problem Type: <strong>{state.problemType ? state.problemType.toUpperCase() : ''}</strong></span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>Features: <strong>{state.dataSummary ? state.dataSummary.num_features : '—'}</strong></span>
                    <span style={{ width: 1, height: 14, background: 'currentColor', opacity: 0.25, display: 'inline-block' }} />
                    <span>Samples: <strong>{state.dataSummary && state.dataSummary.X_shape ? state.dataSummary.X_shape[0].toLocaleString() : '—'}</strong></span>
                    <span style={{ width: 1, height: 14, background: 'currentColor', opacity: 0.25, display: 'inline-block' }} />
                    <span>Dims: <strong>{state.dataSummary && state.dataSummary.X_shape ? state.dataSummary.X_shape[1] : '—'}</strong></span>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary mt-12" onClick={setTarget} disabled={!state.selectedTarget || loading} style={{ width: '100%' }}>
                  {loading ? <><Spinner /> Processing…</> : 'Set Target Column'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
