'use client';

// lib/api.js – thin wrapper around the backend API
// Uses NEXT_PUBLIC_API_BASE_URL (safe, no secrets)

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:8080';

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { ...options, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

/**
 * GET /api/jobs
 * @param {Object} params - q, state, district, category, status, sort, page, pageSize
 */
export async function fetchJobs(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString();
  return apiFetch(`/api/jobs${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/jobs/:id
 */
export async function fetchJob(id) {
  return apiFetch(`/api/jobs/${encodeURIComponent(id)}`);
}

/**
 * GET /api/jobs/nearby
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusKm
 */
export async function fetchNearbyJobs(lat, lon, radiusKm = 25) {
  return apiFetch(
    `/api/jobs/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
  );
}

/**
 * GET /api/geo/reverse
 */
export async function reverseGeocode(lat, lon) {
  return apiFetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`);
}
