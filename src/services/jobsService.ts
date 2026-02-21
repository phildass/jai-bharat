/**
 * Jobs Service
 * React Native API client for the Jai Bharat backend jobs & geo endpoints.
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Job {
  id: string;
  title: string;
  organization: string;
  category?: string;
  state?: string;
  district?: string;
  city?: string;
  lat?: number;
  lon?: number;
  last_date?: string;
  status: 'active' | 'closed' | 'upcoming';
  vacancies?: number;
  apply_url?: string;
  notification_url?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NearbyJob extends Job {
  distanceKm: number;
}

export interface JobFacetItem {
  value: string;
  count: number;
}

export interface JobFacets {
  states: JobFacetItem[];
  statuses: JobFacetItem[];
  categories: JobFacetItem[];
}

export interface JobsListResponse {
  results: Job[];
  total: number;
  page: number;
  pageSize: number;
  facets: JobFacets;
}

export interface NearbyJobsResponse {
  results: NearbyJob[];
  total: number;
}

export interface ReverseGeoResult {
  displayName: string;
  city: string;
  district: string;
  state: string;
  postcode: string;
  cached?: boolean;
}

export interface JobSearchParams {
  q?: string;
  state?: string;
  district?: string;
  category?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function searchJobs(params: JobSearchParams = {}): Promise<JobsListResponse> {
  const response = await axios.get<JobsListResponse>(`${API_BASE_URL}/api/jobs`, {
    params,
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
