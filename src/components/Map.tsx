'use client';

import { GoogleMap, Marker } from '@react-google-maps/api';
import { useCallback, useEffect, useState } from 'react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -6.2088, // Jakarta's latitude
  lng: 106.8456, // Jakarta's longitude
};

interface MapProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

export default function Map({ onLocationSelect, selectedLocation }: MapProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    selectedLocation || null
  );

  useEffect(() => {
    if (selectedLocation) {
      setMarker(selectedLocation);
    }
  }, [selectedLocation]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        setMarker(location);
        onLocationSelect(location);
      }
    },
    [onLocationSelect]
  );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={marker || defaultCenter}
      zoom={13}
      onClick={handleMapClick}
    >
      {marker && <Marker position={marker} />}
    </GoogleMap>
  );
}
