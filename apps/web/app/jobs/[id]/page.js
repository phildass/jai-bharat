'use client';

import { useState, useEffect } from 'react';
import { fetchJob } from '../../../lib/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <tr>
      <td style={{ padding: '8px 12px 8px 0', fontWeight: 600, color: '#444', whiteSpace: 'nowrap', verticalAlign: 'top', width: 180 }}>{label}</td>
      <td style={{ padding: '8px 0', color: '#222' }}>{value}</td>
    </tr>
  );
}

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJob(params.id)
      .then(setJob)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: '#c00' }}>Error: {error}</p>;
  if (!job) return <p>Job not found.</p>;

  return (
    <div>
      <a href="/jobs" style={{ color: '#1a237e', textDecoration: 'none', fontSize: 14 }}>← Back to Jobs</a>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>{job.title}</h1>
        <p style={{ color: '#444', fontSize: 16, margin: '0 0 20px' }}>{job.organisation}</p>

        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 700 }}>
          <tbody>
            <Row label="Status" value={<StatusBadge status={job.status} />} />
            <Row label="Category" value={job.category} />
            <Row label="Qualification" value={job.qualification} />
            <Row label="Location" value={[job.location_label || job.district, job.state].filter(Boolean).join(', ')} />
            <Row label="Vacancies" value={job.vacancies?.toLocaleString()} />
            <Row label="Salary" value={job.salary} />
            <Row label="Apply Start" value={formatDate(job.apply_start_date)} />
            <Row label="Last Date" value={formatDate(job.apply_end_date)} />
            <Row label="Published" value={formatDate(job.published_at)} />
          </tbody>
        </table>

        {job.description && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 8 }}>About this vacancy</h3>
            <p style={{ color: '#333', lineHeight: 1.6 }}>{job.description}</p>
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {job.official_notification_url && (
            <a
              href={job.official_notification_url}
              target="_blank"
              rel="noopener noreferrer"
              style={btnStyle('#c62828')}
            >
              📄 Official Notification
            </a>
          )}
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={btnStyle('#1a237e')}
            >
              🔗 Apply Now
            </a>
          )}
          {typeof window !== 'undefined' && 'Notification' in window && (
            <button
              onClick={() => requestNotification(job)}
              style={btnStyle('#2e7d32', 'button')}
            >
              🔔 Notify Me (Last Date)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { open: '#2e7d32', upcoming: '#1565c0', result_out: '#6a1b9a', closed: '#757575' };
  return (
    <span style={{ background: colors[status] || '#757575', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function btnStyle(bg) {
  return {
    display: 'inline-block',
    padding: '10px 20px',
    borderRadius: 6,
    background: bg,
    color: '#fff',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  };
}

function requestNotification(job) {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(perm => {
    if (perm === 'granted' && job.apply_end_date) {
      new Notification('Jai Bharat – Reminder Set', {
        body: `Last date for "${job.title}" is ${new Date(job.apply_end_date).toLocaleDateString('en-IN')}`,
        icon: '/favicon.ico',
      });
    }
  });
}
