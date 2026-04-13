import './SignatureCanvasSkeleton.css'

/**
 * SignatureCanvasSkeleton Component
 * 
 * Displays a skeleton loading screen that mimics the SignatureCanvas interface.
 * Shows during authentication transition to provide visual continuity when
 * navigating from login to the signature capture interface.
 */
export function SignatureCanvasSkeleton() {
  return (
    <div className="skeleton-signature-overlay">
      <div className="skeleton-signature-container">
        {/* Header */}
        <header className="skeleton-signature-header">
          <nav className="skeleton-signature-nav">
            <div className="skeleton-nav-logo skeleton-pulse"></div>
            <div className="skeleton-nav-links">
              <div className="skeleton-nav-link skeleton-pulse"></div>
              <div className="skeleton-nav-link skeleton-pulse"></div>
            </div>
            <div className="skeleton-nav-account skeleton-pulse"></div>
          </nav>
        </header>

        {/* Main Content */}
        <div className="skeleton-signature-main">
          {/* Left Section - Camera */}
          <div className="skeleton-signature-left">
            {/* Status Bar */}
            <div className="skeleton-status-bar">
              <div className="skeleton-status-left">
                <div className="skeleton-status-item skeleton-pulse"></div>
              </div>
              <div className="skeleton-status-center skeleton-pulse"></div>
              <div className="skeleton-status-right skeleton-pulse"></div>
            </div>

            {/* Capture Area */}
            <div className="skeleton-capture-area skeleton-pulse"></div>

            {/* Info Bar */}
            <div className="skeleton-info-bar">
              <div className="skeleton-info-item skeleton-pulse"></div>
              <div className="skeleton-info-item skeleton-pulse"></div>
              <div className="skeleton-info-item skeleton-pulse"></div>
            </div>
          </div>

          {/* Right Section - Display */}
          <div className="skeleton-signature-right">
            <div className="skeleton-display-title skeleton-pulse"></div>
            <div className="skeleton-display-canvas skeleton-pulse"></div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="skeleton-controls-section">
          <div className="skeleton-control-buttons">
            <div className="skeleton-cta-button skeleton-pulse"></div>
            <div className="skeleton-secondary-button skeleton-pulse"></div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="success-transition">
          <p>Initializing signature capture...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignatureCanvasSkeleton
