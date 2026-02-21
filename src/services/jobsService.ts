/**
 * Jobs Service
 * Frontend API service for jobs search, detail, and nearby discovery.
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl.replace('/v1', '');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  organization: string | null;
  board: string | null;
  category: string | null;
  status: string;
  apply_url: string | null;
  notification_url?: string | null;
  source_url?: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  location_text: string | null;
  lat: number | null;
  lon: number | null;
  posted_at: string | null;
  last_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface NearbyJob extends Job {
  distanceKm: number;
}

export interface JobsListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    states: Record<string, number>;
    categories: Record<string, number>;
    statuses: Record<string, number>;
  };
}

export interface NearbyJobsResponse {
  jobs: NearbyJob[];
  total: number;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface GeoReverseResponse {
  displayName: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  lat: number;
  lon: number;
  cached?: boolean;
}

export interface JobsSearchParams {
  q?: string;
  state?: string;
  category?: string;
  status?: string;
  board?: string;
  page?: number;
  limit?: number;
  sort?: 'posted_at' | 'last_date' | 'title' | 'created_at';
  order?: 'asc' | 'desc';
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function searchJobs(params: JobsSearchParams = {}): Promise<JobsListResponse> {
  const response = await axios.get<JobsListResponse>(`${API_BASE_URL}/api/jobs`, { params });
  return response.data;
}

export async function getJob(id: string): Promise<Job> {
  const response = await axios.get<Job>(`${API_BASE_URL}/api/jobs/${id}`);
  return response.data;
}

export async function getNearbyJobs(
  lat: number,
  lon: number,
  radiusKm: number = 25,
  limit: number = 20
): Promise<NearbyJobsResponse> {
  const response = await axios.get<NearbyJobsResponse>(
    `${API_BASE_URL}/api/jobs/nearby`,
    { params: { lat, lon, radiusKm, limit } }
  );
  return response.data;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoReverseResponse> {
  const response = await axios.get<GeoReverseResponse>(
    `${API_BASE_URL}/api/geo/reverse`,
    { params: { lat, lon } }
  );
  return response.data;
}
