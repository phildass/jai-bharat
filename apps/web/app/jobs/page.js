'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchJobs } from '../../lib/api';

const PAYMENT_URL =
  process.env.NEXT_PUBLIC_PAYMENT_URL || 'https://aienter.in/payments/jaibharat';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'relevance', label: 'Relevance' },
];

const PAGE_SIZE = 20;

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function JobsPage() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJobs({ q, state, district, category, status, sort, page, pageSize: PAGE_SIZE });
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, state, district, category, status, sort, page]);

  useEffect(() => { load(); }, [load]);

  const facets = data?.facets || {};
  const jobs = data?.results || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Government Jobs</h1>

      {/* Trial & Payment Notice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#444' }}>
          <strong>Free for the first 24 hours.</strong> After that you need to pay ₹99 (+18% GST) to continue.
        </p>
        <a
          href={PAYMENT_URL}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 6, background: '#1a237e', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}
        >
          Pay Now
        </a>
      </div>

      {/* Search + Filters */}
      <form onSubmit={handleSearch} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search jobs, organisations…"
            style={inputStyle}
          />
          <button type="submit" style={btnStyle}>Search</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <select value={state} onChange={e => { setState(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All States</option>
            {(facets.states || []).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Categories</option>
            {(facets.categories || []).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Statuses</option>
            {(facets.statuses || []).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={selectStyle}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </form>

      {/* Results summary */}
      {!loading && !error && data && (
        <p style={{ color: '#555', marginBottom: 12 }}>
          {total.toLocaleString()} job{total !== 1 ? 's' : ''} found
          {q ? ` for "${q}"` : ''}
        </p>
      )}

      {/* Loading / Error */}
      {loading && <p>Loading…</p>}
      {error && (
        <p style={{ color: '#c00' }}>
          Error: {error}{' '}
          <a href="/api-status" style={{ color: '#1a237e', fontSize: 13 }}>Check API Status →</a>
        </p>
      )}

      {/* Job list */}
      {!loading && !error && jobs.length === 0 && <p>No jobs found. Try adjusting your filters.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.map(job => (
          <a key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderLeft: `4px solid ${statusColor(job.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{job.title}</h3>
                  <p style={{ margin: '0 0 4px', color: '#444', fontSize: 14 }}>{job.organisation}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                    {[job.location_label || job.district, job.state].filter(Boolean).join(', ')}
                    {job.vacancies ? ` · ${job.vacancies.toLocaleString()} vacancies` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <span style={{ ...badgeStyle, background: statusColor(job.status) }}>{job.status}</span>
                  {job.apply_end_date && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666' }}>Last: {formatDate(job.apply_end_date)}</p>
                  )}
                </div>
              </div>
              {job.salary && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#1a237e' }}>💰 {job.salary}</p>}
            </div>
          </a>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btnStyle}>← Prev</button>
          <span style={{ padding: '6px 12px', color: '#555' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnStyle}>Next →</button>
        </div>
      )}
    </div>
  );
}

function statusColor(s) {
  switch (s) {
    case 'open': return '#2e7d32';
    case 'upcoming': return '#1565c0';
    case 'result_out': return '#6a1b9a';
    default: return '#757575';
  }
}

const inputStyle = { flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const selectStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, background: '#fff' };
const btnStyle = { padding: '8px 18px', borderRadius: 6, background: '#1a237e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 };
const badgeStyle = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, color: '#fff', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 };
