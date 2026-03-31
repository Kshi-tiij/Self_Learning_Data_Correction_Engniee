import { GET_TIMEOUT, POST_TIMEOUT } from '../lib/helpers';

export default function ConfigPage({ state }) {
  const rows = [
    ['Data File',       state.uploadedFilename || 'Not loaded'],
    ['Target Column',   state.targetColumn ? state.targetColumn.charAt(0).toUpperCase() + state.targetColumn.slice(1) : 'Not set'],
    ['Problem Type',    state.problemType ? state.problemType.toUpperCase() : 'Auto-detect'],
    ['Selected Model',  state.selectedModel ? state.selectedModel.charAt(0).toUpperCase() + state.selectedModel.slice(1).replace(/_/g, ' ') : 'random_forest'],
    ['Noise Injection', state.injectNoise ? 'Enabled' : 'Disabled'],
    ['GET Timeout',     `${GET_TIMEOUT} seconds`],
    ['POST Timeout',    `${POST_TIMEOUT} seconds`],
  ];

  return (
    <div className="fade-up">
      <div className="card mt-6">
        <div className="card-title" style={{ marginBottom: 14 }}>Current Configuration</div>
        <table className="data-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            {rows.map(([k, v]) => {
              const isTarget = k === 'Target Column';
              return (
                <tr key={k}>
                  <td style={{ color: 'var(--muted)', width: 200 }}>{k}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isTarget ? 'var(--color-primary)' : 'inherit', fontWeight: isTarget ? 600 : 400 }}>{v}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="alert alert-success mt-16">Platform is configured and ready to use.</div>
    </div>
  );
}
