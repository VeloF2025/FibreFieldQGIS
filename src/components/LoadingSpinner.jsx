import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
  const spinner = (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );

  if (fullScreen) {
    return <div className="loading-overlay">{spinner}</div>;
  }

  return spinner;
}

export default LoadingSpinner;