/**
 * Jobs Service
 * Client-side API service for government jobs:
 * - Search / filter jobs
 * - Fetch single job
 * - Fetch nearby jobs
 * - Reverse geocode via server proxy
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  organization?: string;
  board?: string;
  category?: string;
  status?: string;
  apply_url?: string;
  notification_url?: string;
  source_url?: string;
  state?: string;
  district?: string;
  city?: string;
  location_text?: string;
  lat?: number;
  lon?: number;
  posted_at?: string;
  last_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NearbyJob extends Job {
  distance_km: number;
}

export interface JobsSearchFilters {
  q?: string;
  state?: string;
  district?: string;
  category?: string;
  status?: string;
  sort?: 'latest' | 'closingSoon' | 'relevance';
  page?: number;
  pageSize?: number;
}

export interface JobsFacets {
  states: string[];
  districts: string[];
  categories: string[];
  statuses: string[];
}

export interface JobsSearchResponse {
  results: Job[];
  total: number;
  page: number;
  pageSize: number;
  facets: JobsFacets;
}

export interface NearbyJobsResponse {
  results: NearbyJob[];
  total: number;
  radiusKm: number;
  center: { lat: number; lon: number };
}

export interface ReverseGeoResult {
  display_name?: string;
  address?: {
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  lat?: number;
  lon?: number;
  cached?: boolean;
}

// ─── Service functions ───────────────────────────────────────────────────────

export async function searchJobs(filters: JobsSearchFilters = {}): Promise<JobsSearchResponse> {
  const response = await axios.get<JobsSearchResponse>(`${API_BASE_URL}/api/jobs`, {
    params: {
      q:        filters.q        || undefined,
      state:    filters.state    || undefined,
      district: filters.district || undefined,
      category: filters.category || undefined,
      status:   filters.status   || undefined,
      sort:     filters.sort     || 'latest',
      page:     filters.page     || 1,
      pageSize: filters.pageSize || 20,
    },
  });
  return response.data;
}

export async function getJobById(id: string): Promise<Job> {
  const response = await axios.get<Job>(`${API_BASE_URL}/api/jobs/${id}`);
  return response.data;
}

export async function getNearbyJobs(
  lat: number,
  lon: number,
  radiusKm: 10 | 25 | 50 | 100 = 25,
  limit = 50
): Promise<NearbyJobsResponse> {
  const response = await axios.get<NearbyJobsResponse>(`${API_BASE_URL}/api/jobs/nearby`, {
    params: { lat, lon, radiusKm, limit },
  });
  return response.data;
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeoResult> {
  const response = await axios.get<ReverseGeoResult>(`${API_BASE_URL}/api/geo/reverse`, {
    params: { lat, lon },
  });
  return response.data;
}
