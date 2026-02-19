/**
 * Location Service
 * Handles geofencing and hyper-local job discovery
 */

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface GeofenceRegion {
  state: string;
  district: string;
  taluk?: string;
  radius: number; // in kilometers
  center: {
    latitude: number;
    longitude: number;
  };
}

class LocationService {
  private currentLocation: Location | null = null;
  private watchId: number | null = null;

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location> {
    try {
      // TODO: Use React Native Geolocation
      console.log('Getting current location');
      
      this.currentLocation = this.mockLocation();
      return this.currentLocation;
    } catch (error) {
      throw new Error('Failed to get location: ' + (error as Error).message);
    }
  }

  /**
   * Start watching location changes
   */
  async startWatchingLocation(callback: (location: Location) => void): Promise<void> {
    try {
      // TODO: Use React Native Geolocation watchPosition
      console.log('Started watching location');
      
      // Mock watch
      this.watchId = window.setInterval(() => {
        const location = this.mockLocation();
        this.currentLocation = location;
        callback(location);
      }, 30000) as any;
    } catch (error) {
      throw new Error('Failed to watch location: ' + (error as Error).message);
    }
  }

  /**
   * Stop watching location changes
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
      console.log('Stopped watching location');
    }
  }

  /**
   * Get administrative region from coordinates
   */
  async getRegionFromCoordinates(latitude: number, longitude: number): Promise<GeofenceRegion> {
    try {
      // TODO: Use reverse geocoding API
      console.log('Getting region from coordinates');
      
      return this.mockRegion();
    } catch (error) {
      throw new Error('Failed to get region: ' + (error as Error).message);
    }
  }

  /**
   * Check if location is within geofence
   */
  isWithinGeofence(location: Location, geofence: GeofenceRegion): boolean {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );
    
    return distance <= geofence.radius;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get jobs within current location's geofence
   */
  async getLocalJobs(radiusKm: number = 50): Promise<any[]> {
    try {
      const location = await this.getCurrentLocation();
      const region = await this.getRegionFromCoordinates(
        location.latitude,
        location.longitude
      );
      
      // TODO: Query jobs service with location filter
      console.log(`Getting jobs within ${radiusKm}km of ${region.district}, ${region.state}`);
      
      return [];
    } catch (error) {
      throw new Error('Failed to get local jobs: ' + (error as Error).message);
    }
  }

  /**
   * Get jobs by administrative region
   */
  async getJobsByRegion(state: string, district?: string, taluk?: string): Promise<any[]> {
    try {
      // TODO: Query jobs service with administrative filters
      console.log('Getting jobs for:', { state, district, taluk });
      
      return [];
    } catch (error) {
      throw new Error('Failed to get jobs by region: ' + (error as Error).message);
    }
  }

  /**
   * Mock location for development
   */
  private mockLocation(): Location {
    return {
      latitude: 17.6868,
      longitude: 75.9064,
      accuracy: 10,
      timestamp: new Date(),
    };
  }

  /**
   * Mock region for development
   */
  private mockRegion(): GeofenceRegion {
    return {
      state: 'Maharashtra',
      district: 'Satara',
      taluk: 'Karad',
      radius: 50,
      center: {
        latitude: 17.6868,
        longitude: 75.9064,
      },
    };
  }
}

// Singleton instance
export const locationService = new LocationService();
