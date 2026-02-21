'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { fetchNearbyJobs, reverseGeocode } from '../../../lib/api';

// Leaflet must be loaded client-side only (no SSR)
const JobMap = dynamic(() => import('../../../components/JobMap'), { ssr: false, loading: () => <p>Loading map…</p> });

const RADIUS_OPTIONS = [10, 25, 50, 100];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NearMePage() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [radius, setRadius] = useState(25);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Get user location
  const locate = useCallback(() => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        // Reverse geocode via backend proxy (keeps LOCATIONIQ_API_KEY server-side)
        try {
          const geo = await reverseGeocode(lat, lon);
          setLocationName(geo.city || geo.district || geo.state || '');
        } catch {
          setLocationName('');
        }
      },
      err => {
        setGeoError(`Could not get location: ${err.message}`);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => { locate(); }, [locate]);

  // Fetch nearby jobs whenever coords or radius changes
  useEffect(() => {
    if (!coords) return;
    setApiError(null);
    setLoading(true);
    fetchNearbyJobs(coords.lat, coords.lon, radius)
      .then(d => setJobs(d.results || []))
      .catch(e => setApiError(e.message))
      .finally(() => setLoading(false));
  }, [coords, radius]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Jobs Near Me</h1>

      {/* Location + radius controls */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {locationName && (
          <span style={{ color: '#1a237e', fontWeight: 600 }}>📍 Near: {locationName}</span>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          Radius:
          <select value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc' }}>
            {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </label>
        <button onClick={locate} style={{ padding: '7px 16px', borderRadius: 6, background: '#1a237e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          🔄 Refresh Location
        </button>
      </div>

      {geoError && <p style={{ color: '#c00' }}>⚠️ {geoError}</p>}
      {apiError && <p style={{ color: '#c00' }}>Error: {apiError}</p>}
      {loading && <p>Locating you and fetching jobs…</p>}

      {coords && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* Map */}
          <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.1)', height: 480 }}>
            <JobMap
              center={coords}
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              radiusKm={radius}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
            {jobs.length === 0 && <p style={{ color: '#555' }}>No open jobs found within {radius} km.</p>}
            {jobs.map(job => (
              <a
                key={job.id}
                href={`/jobs/${job.id}`}
                onClick={() => setSelectedJobId(job.id)}
                style={{
                  textDecoration: 'none', color: 'inherit',
                  background: '#fff', borderRadius: 8, padding: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                  borderLeft: `4px solid ${selectedJobId === job.id ? '#f57c00' : '#2e7d32'}`,
                }}
              >
                <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14 }}>{job.title}</p>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#555' }}>{job.organisation}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#777' }}>
                  {job.distanceKm} km away · Last: {formatDate(job.apply_end_date)}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
