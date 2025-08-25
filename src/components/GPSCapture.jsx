import React, { useState } from 'react';

const GPSCapture = ({ onLocationCapture, existingLocation, existingAccuracy }) => {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  const captureGPS = () => {
    setCapturing(true);
    setError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const accuracy = position.coords.accuracy;

        onLocationCapture(location, accuracy);
        setCapturing(false);
      },
      (error) => {
        console.error('GPS Error:', error);
        let errorMessage = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'GPS access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS location unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS timeout. Please try again in a better location.';
            break;
          default:
            errorMessage = 'Unknown GPS error. Please try again.';
        }
        
        setError(errorMessage);
        setCapturing(false);
      },
      options
    );
  };

  const formatCoordinate = (coord) => {
    return coord?.toFixed(6) || 'N/A';
  };

  const getAccuracyColor = (accuracy) => {
    if (!accuracy) return 'gray';
    if (accuracy <= 5) return 'green';   // Excellent
    if (accuracy <= 10) return 'orange'; // Good
    return 'red'; // Poor
  };

  return (
    <div className="gps-capture">
      {existingLocation ? (
        <div className="gps-display">
          <span>📍 Location Captured</span>
          <span>{formatCoordinate(existingLocation.latitude)}, {formatCoordinate(existingLocation.longitude)}</span>
        </div>
      ) : (
        <>
          {!capturing && !error && (
            <button 
              onClick={captureGPS}
              className="capture-gps-button"
            >
              📍 Capture GPS Location
            </button>
          )}
          
          {capturing && (
            <div className="gps-status">
              <p>📡 Acquiring GPS signal...</p>
              <small>This may take up to 30 seconds</small>
            </div>
          )}
          
          {error && (
            <div className="gps-error">
              <p>{error}</p>
              <button onClick={captureGPS} className="capture-gps-button">
                Try Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GPSCapture;