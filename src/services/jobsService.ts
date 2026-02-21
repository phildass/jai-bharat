/**
 * Jobs Service
 * API service for government jobs search, detail, and near-me functionality.
 * Calls backend API routes — never touches LocationIQ directly.
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl.replace(/\/v\d+$/, '');

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
  id: number;
  title: string;
  organisation: string;
  category: string | null;
  qualification: string | null;
  status: 'open' | 'closed' | 'result_out' | 'upcoming';
  state: string | null;
  district: string | null;
  location_label: string | null;
  lat: number | null;
  lon: number | null;
  vacancies: number | null;
  salary: string | null;
  apply_start_date: string | null;
  apply_end_date: string | null;
  exam_date: string | null;
  published_at: string;
  description: string | null;
  age_limit: string | null;
  official_notification_url: string | null;
  source_url: string | null;
}

export interface NearbyJob extends Job {
  distanceKm: number;
}

export interface JobsResponse {
  results: Job[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    states: string[];
    categories: string[];
    statuses: string[];
  };
}

export interface NearbyJobsResponse {
  results: NearbyJob[];
  total: number;
  radiusKm: number;
}

export interface JobsSearchParams {
  q?: string;
  state?: string;
  district?: string;
  category?: string;
  qualification?: string;
  status?: string;
  sort?: 'latest' | 'closing_soon' | 'relevance';
  page?: number;
  pageSize?: number;
}

/**
 * Search government jobs with keyword, filters, and sorting.
 */
export async function searchJobs(params: JobsSearchParams): Promise<JobsResponse> {
  const response = await axios.get<JobsResponse>(`${API_BASE_URL}/api/jobs`, { params });
  return response.data;
}

/**
 * Fetch a single job by its ID.
 */
export async function getJobById(id: number): Promise<Job> {
  const response = await axios.get<Job>(`${API_BASE_URL}/api/jobs/${id}`);
  return response.data;
}

/**
 * Fetch government jobs within radiusKm of the given coordinates.
 */
export async function getNearbyJobs(
  lat: number,
  lon: number,
  radiusKm: 10 | 25 | 50 | 100 = 25,
  limit = 20,
): Promise<NearbyJobsResponse> {
  const response = await axios.get<NearbyJobsResponse>(`${API_BASE_URL}/api/jobs/nearby`, {
    params: { lat, lon, radiusKm, limit },
  });
  return response.data;
}

/**
 * Reverse-geocode a lat/lon via the server proxy (LocationIQ).
 * The API key is never exposed to the client.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const response = await axios.get<ReverseGeocodeResult>(`${API_BASE_URL}/api/geo/reverse`, {
    params: { lat, lon },
  });
  return response.data;
}
