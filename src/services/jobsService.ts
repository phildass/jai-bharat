/**
 * Jobs Service
 * API service for government jobs search, detail, and near-me functionality.
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl;

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

export async function searchJobs(params: JobsSearchParams): Promise<JobsResponse> {
  const response = await axios.get<JobsResponse>(`${API_BASE_URL}/api/jobs`, { params });
  return response.data;
}

export async function getJobById(id: number): Promise<Job> {
  const response = await axios.get<Job>(`${API_BASE_URL}/api/jobs/${id}`);
  return response.data;
}

export async function getNearbyJobs(
  lat: number,
  lon: number,
  radiusKm: 10 | 25 | 50 | 100 = 25,
  limit = 20
): Promise<NearbyJobsResponse> {
  const response = await axios.get<NearbyJobsResponse>(`${API_BASE_URL}/api/jobs/nearby`, {
    params: { lat, lon, radiusKm, limit },
  });
  return response.data;
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ display_name: string; address: Record<string, string> }> {
  const response = await axios.get(`${API_BASE_URL}/api/geo/reverse`, {
    params: { lat, lon },
  });
  return response.data;
}
