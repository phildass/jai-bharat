'use client';

import { useState, useEffect } from 'react';
import { BASE_URL } from '../../lib/api';

export default function ApiStatusPage() {
  const [status, setStatus] = useState(null); // null = loading, true = ok, false = error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = `${BASE_URL}/health`;
    fetch(url, { cache: 'no-store' })
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus(true);
          setData(json);
        } else {
          setStatus(false);
          setError(`HTTP ${res.status}`);
          setData(json);
        }
      })
      .catch(err => {
        setStatus(false);
        setError(err.message);
      });
  }, []);

  const dot = status === null ? '⏳' : status ? '🟢' : '🔴';
  const label = status === null ? 'Checking…' : status ? 'API is online' : 'API is unreachable';

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ marginTop: 0 }}>API Status</h1>
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.1)', marginBottom: 16 }}>
        <p style={{ fontSize: 20, margin: '0 0 8px' }}>{dot} {label}</p>
        <p style={{ margin: '0 0 12px', color: '#555', fontSize: 14 }}>
          Endpoint: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{BASE_URL}/health</code>
        </p>
        {error && (
          <p style={{ color: '#c00', margin: '0 0 12px', fontSize: 14 }}>
            Error: {error}
          </p>
        )}
        {data && (
          <pre style={{ background: '#f8f8f8', padding: 12, borderRadius: 6, fontSize: 13, overflowX: 'auto', margin: 0 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#666' }}>
        Set <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env.local</code> to point to the correct backend.{' '}
        <a href="/jobs" style={{ color: '#1a237e' }}>← Back to Jobs</a>
      </p>
    </div>
  );
}
