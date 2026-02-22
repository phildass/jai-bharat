'use client';

import { useState, useEffect } from 'react';
import { fetchJobs } from '../lib/api';

// ── Categories & Exams ────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: '🚂 Railways', value: 'Railways' },
  { label: '🪖 Defence', value: 'Defence' },
  { label: '🏦 Banking', value: 'Banking' },
  { label: '📋 UPSC', value: 'UPSC' },
  { label: '📝 SSC', value: 'SSC' },
  { label: '🏛️ State Govt', value: 'State Govt' },
  { label: '👮 Police', value: 'Police' },
  { label: '🎓 Teaching', value: 'Teaching' },
];

const EXAMS = [
  { label: 'UPSC CSE', q: 'UPSC CSE', category: 'UPSC' },
  { label: 'UPSC CDS', q: 'UPSC CDS', category: 'UPSC' },
  { label: 'SSC CGL', q: 'SSC CGL', category: 'SSC' },
  { label: 'SSC CHSL', q: 'SSC CHSL', category: 'SSC' },
  { label: 'SSC GD', q: 'SSC GD', category: 'SSC' },
  { label: 'IBPS PO/Clerk', q: 'IBPS', category: 'Banking' },
  { label: 'SBI PO/Clerk', q: 'SBI', category: 'Banking' },
  { label: 'RRB NTPC', q: 'RRB', category: 'Railways' },
  { label: 'AFCAT', q: 'AFCAT', category: 'Defence' },
  { label: 'NDA', q: 'NDA', category: 'Defence' },
];

const HOW_IT_HELPS = [
  { icon: '🔔', text: 'Daily updates – never miss a notification' },
  { icon: '🔍', text: 'Smart filters by state, category, and status' },
  { icon: '📍', text: 'Near Me – find jobs close to your location' },
  { icon: '📱', text: 'One-tap install as a mobile app (PWA/APK)' },
];

function jobsUrl(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v)
  ).toString();
  return `/jobs${qs ? `?${qs}` : ''}`;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  return diff;
}

export default function HomePage() {
  const [latestJobs, setLatestJobs] = useState([]);
  const [closingSoonJobs, setClosingSoonJobs] = useState([]);
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJobs({ sort: 'latest', pageSize: 3 }),
      fetchJobs({ sort: 'closing_soon', status: 'open', pageSize: 3 }),
      fetchJobs({ sort: 'latest', pageSize: 3 }),
    ])
      .then(([latest, closing, trending]) => {
        if (cancelled) return;
        setLatestJobs(latest?.results || []);
        setClosingSoonJobs(closing?.results || []);
        setTrendingJobs(trending?.results || []);
      })
    .catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[HomePage] Could not fetch highlight jobs:', err.message);
        }
      })
      .finally(() => { if (!cancelled) setLoadingHighlights(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '32px 16px 24px', background: '#1a237e', borderRadius: 12, color: '#fff', marginBottom: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/jaibharat.logo.png" alt="Jai Bharat" width={72} height={72} style={{ borderRadius: 12, marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>Sarkari Jobs, Simplified</h1>
        <p style={{ margin: '0 0 20px', fontSize: 16, opacity: 0.88 }}>
          Daily-updated government jobs across Railways, Banking, Defence, SSC & more.
        </p>
        <a href="/jobs" style={{ display: 'inline-block', background: '#fff', color: '#1a237e', padding: '10px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
          Browse All Jobs →
        </a>
      </div>

      {/* ── A) Quick Highlights ────────────────────────────────────────────── */}
      <Section title="⚡ Quick Highlights">
        <div style={gridStyle(3)}>
          <HighlightCard
            title="Latest Govt Jobs"
            emoji="🆕"
            accent="#1565c0"
            jobs={latestJobs}
            loading={loadingHighlights}
            href={jobsUrl({ sort: 'latest' })}
          />
          <HighlightCard
            title="Last Date Soon"
            emoji="⏳"
            accent="#e65100"
            jobs={closingSoonJobs}
            loading={loadingHighlights}
            href={jobsUrl({ sort: 'closing_soon', status: 'open' })}
            renderSub={job => {
              const d = daysLeft(job.apply_end_date);
              return d != null && d >= 0 ? `${d} day${d !== 1 ? 's' : ''} left` : formatDate(job.apply_end_date);
            }}
          />
          <HighlightCard
            title="Trending Jobs"
            emoji="🔥"
            accent="#6a1b9a"
            jobs={trendingJobs}
            loading={loadingHighlights}
            href={jobsUrl({ sort: 'latest' })}
            renderSub={job => job.category || ''}
          />
        </div>
      </Section>

      {/* ── B) Jobs by Category ───────────────────────────────────────────── */}
      <Section title="🗂️ Jobs by Category">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {CATEGORIES.map(cat => (
            <a
              key={cat.value}
              href={jobsUrl({ category: cat.value })}
              style={chipStyle}
            >
              {cat.label}
            </a>
          ))}
        </div>
      </Section>

      {/* ── C) Jobs by Exam ───────────────────────────────────────────────── */}
      <Section title="📚 Jobs by Exam">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {EXAMS.map(exam => (
            <a
              key={exam.label}
              href={jobsUrl({ q: exam.q, category: exam.category })}
              style={{ ...chipStyle, background: '#e8eaf6', color: '#1a237e' }}
            >
              {exam.label}
            </a>
          ))}
        </div>
      </Section>

      {/* ── D) How Jai Bharat Helps ───────────────────────────────────────── */}
      <Section title="💡 How Jai Bharat Helps">
        <div style={gridStyle(2)}>
          {HOW_IT_HELPS.map(item => (
            <div key={item.text} style={{ background: '#fff', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: '#1a237e' }}>{title}</h2>
      {children}
    </section>
  );
}

function HighlightCard({ title, emoji, accent, jobs, loading, href, renderSub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,.09)', borderTop: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>{emoji} {title}</span>
        <a href={href} style={{ fontSize: 12, color: accent, textDecoration: 'none', fontWeight: 600 }}>View all →</a>
      </div>
      {loading ? (
        <p style={{ margin: 0, color: '#888', fontSize: 13 }}>Loading…</p>
      ) : jobs.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.map(job => (
            <li key={job.id}>
              <a href={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {job.organisation}
                  {renderSub ? ` · ${renderSub(job)}` : ''}
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
          <a href={href} style={{ color: accent }}>Browse {title} →</a>
        </p>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function gridStyle(cols) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 3 ? 220 : 200}px, 1fr))`,
    gap: 14,
  };
}

const chipStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '8px 16px', borderRadius: 24,
  background: '#e3f2fd', color: '#1565c0',
  textDecoration: 'none', fontSize: 14, fontWeight: 600,
  border: '1px solid #bbdefb', whiteSpace: 'nowrap',
  transition: 'background .15s',
};

