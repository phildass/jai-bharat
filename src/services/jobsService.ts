/**
 * Jobs Service
 * Client-side service for the "Jobs Near Me" feature.
 * Calls backend API routes — never touches LocationIQ directly.
 */

import AppConfig from '../../config/app.config';

const BASE_URL = AppConfig.api.baseUrl.replace('/v1', '');

export interface ReverseGeocodeResult {
  displayName: string;
  city: string;
  district: string;
  state: string;
  postcode: string;
  country: string;
  cached?: boolean;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  source: string;
  apply_url: string;
  notification_pdf_url: string | null;
  state: string;
  district: string;
  city: string | null;
  location_text: string;
  lat: number;
  lon: number;
  posted_at: string;
  last_date: string | null;
  distance_km: number;
}

export interface NearbyJobsResult {
  lat: number;
  lon: number;
  radiusKm: number;
  total: number;
  jobs: Job[];
}

export interface NearbyJobsOptions {
  lat: number;
  lon: number;
  radiusKm?: 10 | 25 | 50 | 100;
  limit?: number;
  department?: string;
  source?: string;
  state?: string;
  last_date_from?: string;
  keyword?: string;
}

/**
 * Reverse-geocode a lat/lon via the server proxy (LocationIQ).
 * The API key is never exposed to the client.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const url = `${BASE_URL}/api/geo/reverse?lat=${lat}&lon=${lon}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || 'Reverse geocoding failed');
  }
  return response.json();
}

/**
 * Fetch government jobs within radiusKm of the given coordinates.
 */
export async function fetchNearbyJobs(options: NearbyJobsOptions): Promise<NearbyJobsResult> {
  const params = new URLSearchParams({
    lat: String(options.lat),
    lon: String(options.lon),
    radiusKm: String(options.radiusKm ?? 25),
    limit: String(options.limit ?? 50),
  });

  if (options.department) params.set('department', options.department);
  if (options.source) params.set('source', options.source);
  if (options.state) params.set('state', options.state);
  if (options.last_date_from) params.set('last_date_from', options.last_date_from);
  if (options.keyword) params.set('keyword', options.keyword);

  const url = `${BASE_URL}/api/jobs/nearby?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to fetch nearby jobs');
  }
  return response.json();
}
