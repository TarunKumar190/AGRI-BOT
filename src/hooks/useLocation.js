/**
 * useLocation Hook - Geolocation services for KrishiMitra
 * Provides farmer location for hyperlocal weather and market recommendations
 * 
 * Features:
 * - Automatic location detection with GPS
 * - Fallback to IP-based location
 * - Indian state and district mapping
 * - Mandi proximity calculations
 */

import { useState, useEffect, useCallback } from 'react';

// Indian States with coordinates for fallback
const INDIAN_STATES = {
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400, code: 'AP' },
  'Arunachal Pradesh': { lat: 28.2180, lng: 94.7278, code: 'AR' },
  'Assam': { lat: 26.2006, lng: 92.9376, code: 'AS' },
  'Bihar': { lat: 25.0961, lng: 85.3131, code: 'BR' },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8661, code: 'CG' },
  'Goa': { lat: 15.2993, lng: 74.1240, code: 'GA' },
  'Gujarat': { lat: 22.2587, lng: 71.1924, code: 'GJ' },
  'Haryana': { lat: 29.0588, lng: 76.0856, code: 'HR' },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734, code: 'HP' },
  'Jharkhand': { lat: 23.6102, lng: 85.2799, code: 'JH' },
  'Karnataka': { lat: 15.3173, lng: 75.7139, code: 'KA' },
  'Kerala': { lat: 10.8505, lng: 76.2711, code: 'KL' },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569, code: 'MP' },
  'Maharashtra': { lat: 19.7515, lng: 75.7139, code: 'MH' },
  'Manipur': { lat: 24.6637, lng: 93.9063, code: 'MN' },
  'Meghalaya': { lat: 25.4670, lng: 91.3662, code: 'ML' },
  'Mizoram': { lat: 23.1645, lng: 92.9376, code: 'MZ' },
  'Nagaland': { lat: 26.1584, lng: 94.5624, code: 'NL' },
  'Odisha': { lat: 20.9517, lng: 85.0985, code: 'OR' },
  'Punjab': { lat: 31.1471, lng: 75.3412, code: 'PB' },
  'Rajasthan': { lat: 27.0238, lng: 74.2179, code: 'RJ' },
  'Sikkim': { lat: 27.5330, lng: 88.5122, code: 'SK' },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569, code: 'TN' },
  'Telangana': { lat: 18.1124, lng: 79.0193, code: 'TS' },
  'Tripura': { lat: 23.9408, lng: 91.9882, code: 'TR' },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462, code: 'UP' },
  'Uttarakhand': { lat: 30.0668, lng: 79.0193, code: 'UK' },
  'West Bengal': { lat: 22.9868, lng: 87.8550, code: 'WB' },
  'Delhi': { lat: 28.7041, lng: 77.1025, code: 'DL' },
};

// Major mandis with coordinates
const MAJOR_MANDIS = {
  'Maharashtra': [
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
    { name: 'Mumbai-Vashi', lat: 19.0760, lng: 72.9900 },
    { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
    { name: 'Kolhapur', lat: 16.7050, lng: 74.2433 },
  ],
  'Uttar Pradesh': [
    { name: 'Azadpur-Delhi', lat: 28.7198, lng: 77.1707 },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
    { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
    { name: 'Agra', lat: 27.1767, lng: 78.0081 },
    { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  ],
  'Punjab': [
    { name: 'Amritsar', lat: 31.6340, lng: 74.8723 },
    { name: 'Ludhiana', lat: 30.9010, lng: 75.8573 },
    { name: 'Jalandhar', lat: 31.3260, lng: 75.5762 },
    { name: 'Bathinda', lat: 30.2110, lng: 74.9455 },
    { name: 'Patiala', lat: 30.3398, lng: 76.3869 },
  ],
  'Haryana': [
    { name: 'Karnal', lat: 29.6857, lng: 76.9905 },
    { name: 'Hisar', lat: 29.1492, lng: 75.7217 },
    { name: 'Rohtak', lat: 28.8955, lng: 76.6066 },
    { name: 'Ambala', lat: 30.3752, lng: 76.7821 },
    { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  ],
  'Madhya Pradesh': [
    { name: 'Indore', lat: 22.7196, lng: 75.8577 },
    { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
    { name: 'Jabalpur', lat: 23.1815, lng: 79.9864 },
    { name: 'Gwalior', lat: 26.2183, lng: 78.1828 },
    { name: 'Ujjain', lat: 23.1765, lng: 75.7885 },
  ],
  'Rajasthan': [
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Jodhpur', lat: 26.2389, lng: 73.0243 },
    { name: 'Kota', lat: 25.2138, lng: 75.8648 },
    { name: 'Udaipur', lat: 24.5854, lng: 73.7125 },
    { name: 'Bikaner', lat: 28.0229, lng: 73.3119 },
  ],
  'Gujarat': [
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Surat', lat: 21.1702, lng: 72.8311 },
    { name: 'Rajkot', lat: 22.3039, lng: 70.8022 },
    { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
    { name: 'Junagadh', lat: 21.5222, lng: 70.4579 },
  ],
  'Karnataka': [
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hubli', lat: 15.3647, lng: 75.1240 },
    { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
    { name: 'Belgaum', lat: 15.8497, lng: 74.4977 },
    { name: 'Davangere', lat: 14.4644, lng: 75.9218 },
  ],
  'Andhra Pradesh': [
    { name: 'Vijayawada', lat: 16.5062, lng: 80.6480 },
    { name: 'Guntur', lat: 16.3067, lng: 80.4365 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
    { name: 'Kurnool', lat: 15.8281, lng: 78.0373 },
    { name: 'Tirupati', lat: 13.6288, lng: 79.4192 },
  ],
  'Tamil Nadu': [
    { name: 'Chennai-Koyambedu', lat: 13.0827, lng: 80.2707 },
    { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
    { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
    { name: 'Salem', lat: 11.6643, lng: 78.1460 },
    { name: 'Trichy', lat: 10.7905, lng: 78.7047 },
  ],
  'West Bengal': [
    { name: 'Kolkata-Sealdah', lat: 22.5726, lng: 88.3639 },
    { name: 'Siliguri', lat: 26.7271, lng: 88.6393 },
    { name: 'Asansol', lat: 23.6739, lng: 86.9524 },
    { name: 'Durgapur', lat: 23.5204, lng: 87.3119 },
    { name: 'Howrah', lat: 22.5958, lng: 88.2636 },
  ],
  'Bihar': [
    { name: 'Patna', lat: 25.5941, lng: 85.1376 },
    { name: 'Gaya', lat: 24.7914, lng: 84.9994 },
    { name: 'Muzaffarpur', lat: 26.1225, lng: 85.3906 },
    { name: 'Bhagalpur', lat: 25.2425, lng: 86.9842 },
    { name: 'Darbhanga', lat: 26.1542, lng: 85.8918 },
  ],
  'Telangana': [
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Warangal', lat: 17.9784, lng: 79.6000 },
    { name: 'Nizamabad', lat: 18.6725, lng: 78.0941 },
    { name: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
    { name: 'Khammam', lat: 17.2473, lng: 80.1514 },
  ],
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Find nearest state from coordinates
const findNearestState = (lat, lng) => {
  let nearestState = null;
  let minDistance = Infinity;

  for (const [state, coords] of Object.entries(INDIAN_STATES)) {
    const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestState = state;
    }
  }

  return nearestState;
};

// Find nearby mandis
const findNearbyMandis = (lat, lng, state, maxDistance = 100) => {
  const nearbyMandis = [];
  
  // Check mandis in current state
  const stateMandis = MAJOR_MANDIS[state] || [];
  for (const mandi of stateMandis) {
    const distance = calculateDistance(lat, lng, mandi.lat, mandi.lng);
    if (distance <= maxDistance) {
      nearbyMandis.push({ ...mandi, distance: Math.round(distance) });
    }
  }

  // Check neighboring states' mandis
  for (const [stateName, mandis] of Object.entries(MAJOR_MANDIS)) {
    if (stateName !== state) {
      for (const mandi of mandis) {
        const distance = calculateDistance(lat, lng, mandi.lat, mandi.lng);
        if (distance <= maxDistance && !nearbyMandis.find(m => m.name === mandi.name)) {
          nearbyMandis.push({ ...mandi, state: stateName, distance: Math.round(distance) });
        }
      }
    }
  }

  // Sort by distance
  return nearbyMandis.sort((a, b) => a.distance - b.distance).slice(0, 5);
};

/**
 * Custom hook for location-based services
 */
const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [state, setState] = useState(null);
  const [district, setDistrict] = useState(null);
  const [nearbyMandis, setNearbyMandis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  // Check permission status
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      });
    }
  }, []);

  // Reverse geocode to get state/district
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      // Use Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        
        // Extract state and district
        const stateName = address.state || findNearestState(lat, lng);
        const districtName = address.county || address.state_district || address.city || 'Unknown';
        
        return { state: stateName, district: districtName };
      }
    } catch (err) {
      console.warn('Reverse geocoding failed, using fallback:', err);
    }
    
    // Fallback to nearest state calculation
    return { state: findNearestState(lat, lng), district: 'Unknown' };
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error('Geolocation is not supported by this browser');
        setError(err.message);
        setLoading(false);
        reject(err);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          
          setLocation({ lat, lng, accuracy });
          
          // Get state and district
          const { state: stateName, district: districtName } = await reverseGeocode(lat, lng);
          setState(stateName);
          setDistrict(districtName);
          
          // Find nearby mandis
          const mandis = findNearbyMandis(lat, lng, stateName);
          setNearbyMandis(mandis);
          
          setLoading(false);
          
          resolve({
            coordinates: { lat, lng, accuracy },
            state: stateName,
            district: districtName,
            nearbyMandis: mandis,
          });
        },
        (err) => {
          const errorMessage = {
            1: 'Location permission denied. Please enable location access.',
            2: 'Location unavailable. Please try again.',
            3: 'Location request timed out. Please try again.',
          }[err.code] || 'Unknown error getting location';
          
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000, // Cache for 5 minutes
        }
      );
    });
  }, [reverseGeocode]);

  // Set location manually (for users who deny GPS)
  const setManualLocation = useCallback((stateName) => {
    if (INDIAN_STATES[stateName]) {
      const { lat, lng } = INDIAN_STATES[stateName];
      setLocation({ lat, lng, accuracy: null, manual: true });
      setState(stateName);
      setDistrict('');
      
      const mandis = findNearbyMandis(lat, lng, stateName);
      setNearbyMandis(mandis);
      
      return {
        coordinates: { lat, lng },
        state: stateName,
        nearbyMandis: mandis,
      };
    }
    return null;
  }, []);

  // Get weather-optimized location string
  const getWeatherLocation = useCallback(() => {
    if (location) {
      return `${location.lat},${location.lng}`;
    }
    if (state) {
      const stateData = INDIAN_STATES[state];
      return stateData ? `${stateData.lat},${stateData.lng}` : null;
    }
    return null;
  }, [location, state]);

  // Get list of all states
  const getAllStates = useCallback(() => {
    return Object.keys(INDIAN_STATES).sort();
  }, []);

  // Clear location data
  const clearLocation = useCallback(() => {
    setLocation(null);
    setState(null);
    setDistrict(null);
    setNearbyMandis([]);
    setError(null);
  }, []);

  return {
    // Location data
    location,
    state,
    district,
    nearbyMandis,
    
    // Status
    loading,
    error,
    permissionStatus,
    
    // Actions
    getCurrentLocation,
    setManualLocation,
    clearLocation,
    
    // Utilities
    getWeatherLocation,
    getAllStates,
    
    // Constants for external use
    INDIAN_STATES,
    MAJOR_MANDIS,
  };
};

export default useLocation;
export { INDIAN_STATES, MAJOR_MANDIS, calculateDistance, findNearbyMandis };
