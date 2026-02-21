'use client';

// JobMap.js – Leaflet map for the Near Me page (client-only, no SSR)
// Uses OpenStreetMap tiles – no Google Maps billing.

import { useEffect, useRef } from 'react';

export default function JobMap({ center, jobs, selectedJobId, onSelectJob, radiusKm }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);

  // Initialize map on mount
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;

    // Dynamic import of leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // eslint-disable-next-line global-require
    const L = require('leaflet');

    // Fix default marker icon paths (broken in webpack bundles)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current).setView([center.lat, center.lon], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center + radius circle
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return;
    const L = require('leaflet');
    const map = mapInstanceRef.current;

    map.setView([center.lat, center.lon], 11);

    if (circleRef.current) {
      circleRef.current.remove();
    }
    circleRef.current = L.circle([center.lat, center.lon], {
      radius: radiusKm * 1000,
      color: '#1a237e',
      fillColor: '#1a237e',
      fillOpacity: 0.05,
      weight: 2,
    }).addTo(map);

    // User location marker
    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#1a237e;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([center.lat, center.lon], { icon: userIcon })
      .addTo(map)
      .bindPopup('📍 You are here');
  }, [center, radiusKm]);

  // Update job markers
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return;
    const L = require('leaflet');
    const map = mapInstanceRef.current;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    jobs.forEach(job => {
      if (job.lat == null || job.lon == null) return;

      const isSelected = job.id === selectedJobId;
      const color = isSelected ? '#f57c00' : '#2e7d32';

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);font-weight:600">${job.distanceKm}km</div>`,
        iconAnchor: [20, 10],
      });

      const marker = L.marker([job.lat, job.lon], { icon })
        .addTo(map)
        .bindPopup(`<strong>${job.title}</strong><br>${job.organisation}<br>${job.distanceKm} km away`);

      marker.on('click', () => onSelectJob && onSelectJob(job.id));
      markersRef.current.push(marker);
    });
  }, [jobs, selectedJobId, onSelectJob]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
