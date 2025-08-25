import React, { useState } from 'react';

function HelpButton() {
  const [showHelp, setShowHelp] = useState(false);

  const quickSteps = [
    { step: 1, text: "Before Photo + Pole Number + GPS" },
    { step: 2, text: "Hole Depth Photo + ✓ 1.2m deep" },
    { step: 3, text: "Ground Compaction + ✓ Compacted" },
    { step: 4, text: "Concrete Photo + ✓ Applied" },
    { step: 5, text: "Front View + ✓ 4 checks" },
    { step: 6, text: "Side View + ✓ 4 checks" },
    { step: 7, text: "Complete + Notes" }
  ];

  const frontSideChecks = [
    "✓ Pole is vertical",
    "✓ Clear of power lines", 
    "✓ Clear of infrastructure",
    "✓ Spirit level visible"
  ];

  if (!showHelp) {
    return (
      <button 
        className="help-button"
        onClick={() => setShowHelp(true)}
      >
        ❓ Help
      </button>
    );
  }

  return (
    <div className="help-overlay">
      <div className="help-content">
        <div className="help-header">
          <h2>Quick Guide</h2>
          <button 
            className="close-help"
            onClick={() => setShowHelp(false)}
          >
            ✕
          </button>
        </div>

        <div className="help-sections">
          <div className="help-section">
            <h3>📸 7 Steps to Complete</h3>
            <ul>
              {quickSteps.map(item => (
                <li key={item.step}>
                  <strong>{item.step}.</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="help-section">
            <h3>✅ Front & Side View Checks</h3>
            <ul>
              {frontSideChecks.map((check, index) => (
                <li key={index}>{check}</li>
              ))}
            </ul>
          </div>

          <div className="help-section">
            <h3>💾 Your Work is Saved</h3>
            <ul>
              <li>After every step automatically</li>
              <li>Can close app and come back</li>
              <li>Search by pole number to continue</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>🔄 Status Meanings</h3>
            <ul>
              <li><strong>🟢 Online:</strong> Ready to sync</li>
              <li><strong>🔴 Offline:</strong> Work offline, sync later</li>
              <li><strong>📤 Sync:</strong> Tap to upload when online</li>
              <li><strong>⚠️ Storage full:</strong> Sync soon!</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>🆘 Common Problems</h3>
            <ul>
              <li><strong>Can't type:</strong> Tap directly in white box</li>
              <li><strong>No GPS:</strong> Go outside, wait 30 seconds</li>
              <li><strong>Lost work:</strong> Check "Incomplete Captures"</li>
              <li><strong>Sync not working:</strong> Need better signal</li>
            </ul>
          </div>
        </div>

        <div className="help-footer">
          <p><strong>App Address:</strong> pole-planting-app.web.app</p>
          <p><strong>Need more help?</strong> Contact your supervisor</p>
        </div>
      </div>
    </div>
  );
}

export default HelpButton;