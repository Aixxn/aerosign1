import { useState } from 'react'
import './LandingPage.css'

function LandingPage({ onStartSigning, onNavigateToLogin, onFAQ }) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="logo">AeroSign</div>
          <div className="nav-links desktop-only">
            <a href="#" className="nav-link active">Home</a>
            <button className="nav-link-btn" onClick={onNavigateToLogin} title="View signature history">History</button>
            <a href="#" className="nav-link">Settings</a>
          </div>
          <div className="nav-icons">
            <button className="icon-btn" title="Help" aria-label="Help" onClick={onFAQ}>
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="status-badge">
            <span className="status-dot" aria-hidden="true"></span>
            <span className="status-text">Live Computer Vision Active</span>
          </div>
          
          <h1 className="hero-title">
            Capture your signature via camera with <span className="gradient-text">AI precision</span>.
          </h1>
          
          <p className="hero-description">
            AeroSign uses high-performance computer vision to digitize your signature from the air or paper with sub-millimeter accuracy.
          </p>
          
          <button className="cta-button" onClick={onStartSigning} aria-label="Start signature capture">
            Start Signing
          </button>
        </section>

        {/* Signature Capture Preview */}
        <section 
          className={`signature-preview ${isHovering ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          aria-label="Signature capture interface preview"
        >
          <div className="preview-container lens-radius">
            {/* Background overlay */}
            <div className="preview-background">
              <img 
                src="data:image/svg+xml,%3Csvg width='640' height='480' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23000a1a'/%3E%3Cstop offset='100%25' stop-color='%231a1f3a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23bg)'/%3E%3C/svg%3E" 
                alt="Computer vision interface background" 
                className="bg-image"
              />
            </div>

            {/* MediaPipe Simulation Overlay */}
            <div className="preview-overlay">
              <div className="tracking-box">
                <div className="tracking-info top-left">
                  <div>REF_ID: 0x882A</div>
                  <div>FPS: 120.0</div>
                  <div>LATENCY: 1.2ms</div>
                </div>
                <div className="tracking-info bottom-right">
                  <div>X: 142.42</div>
                  <div>Y: 582.11</div>
                  <div>Z: 0.00</div>
                </div>
                <svg className="signature-animation" viewBox="0 0 100 100" aria-hidden="true">
                  <path 
                    d="M20 50 Q 35 30, 50 50 T 80 50" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Floating Glass Controls */}
            <div className="glass-controls">
              <button className="control-btn active" aria-label="Video camera active">
                <span className="material-symbols-outlined">videocam</span>
              </button>
              <button className="control-btn" aria-label="Flash">
                <span className="material-symbols-outlined">flash_on</span>
              </button>
              <button className="control-btn" aria-label="Flip camera">
                <span className="material-symbols-outlined">flip_camera_ios</span>
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="features-grid">
          <div className="feature-card">
            <div className="feature-icon primary" aria-hidden="true">
              <span className="material-symbols-outlined">track_changes</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">Real-time hand tracking</h3>
              <p className="feature-description">
                Powered by custom neural networks, we track every nuance of your signature movement with zero lag.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon secondary" aria-hidden="true">
              <span className="material-symbols-outlined">high_quality</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">High-resolution export</h3>
              <p className="feature-description">
                Export as infinitely scalable SVG or ultra-high-resolution PNG with alpha transparency.
              </p>
            </div>
          </div>

          <div className="feature-card feature-card-full">
            <div className="feature-layout">
              <div className="feature-icon tertiary" aria-hidden="true">
                <span className="material-symbols-outlined">encrypted</span>
              </div>
              <div className="feature-content">
                <h3 className="feature-title">Secure processing</h3>
                <p className="feature-description">
                  Signatures are processed locally on your device. We never store biometric data on our servers, ensuring total privacy and legal compliance.
                </p>
                <div className="compliance-badges">
                  <span className="compliance-badge">
                    <span className="badge-indicator" aria-hidden="true"></span>
                    GDPR Compliant
                  </span>
                  <span className="compliance-badge">
                    <span className="badge-indicator" aria-hidden="true"></span>
                    SOC2 Type II
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Diagnostics */}
        <section className="diagnostics-section">
          <div className="diagnostics-container">
            <div className="diagnostics-header">
              <span className="diagnostics-label">System Diagnostics</span>
              <span className="status-optimal">STATUS: OPTIMAL</span>
            </div>
            <div className="diagnostics-grid">
              <div className="diagnostic-item">
                <div className="diagnostic-label">Engine</div>
                <div className="diagnostic-value">V-NEURAL 4.2</div>
              </div>
              <div className="diagnostic-item">
                <div className="diagnostic-label">Interpolation</div>
                <div className="diagnostic-value">BEZIER_ULTRA</div>
              </div>
              <div className="diagnostic-item">
                <div className="diagnostic-label">Auth</div>
                <div className="diagnostic-value">ECC_512K1</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a href="#" className="mobile-nav-item active" aria-label="Home">
          <span className="material-symbols-outlined">home</span>
          <span className="nav-label">Home</span>
        </a>
        <button className="mobile-nav-item" onClick={onStartSigning} aria-label="Start capture">
          <span className="material-symbols-outlined">ink_highlighter</span>
          <span className="nav-label">Capture</span>
        </button>
        <a href="#" className="mobile-nav-item" aria-label="History">
          <span className="material-symbols-outlined">history</span>
          <span className="nav-label">History</span>
        </a>
        <a href="#" className="mobile-nav-item" aria-label="Settings">
          <span className="material-symbols-outlined">settings</span>
          <span className="nav-label">Settings</span>
        </a>
      </nav>
    </div>
  )
}

export default LandingPage
