import { useRef, useEffect, useState, useCallback } from 'react'
import './SignatureCanvas.css'
import { apiClient } from '../utils/api'

function SignatureCanvas({ onComplete, onBack, error: appError, loading: appLoading }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // State for display only
  const [status, setStatus] = useState('Initializing camera...')
  const [fingerDistance, setFingerDistance] = useState(0)
  const [signatureNumber, setSignatureNumber] = useState(1)
  const [collectedSignatures, setCollectedSignatures] = useState([])
  const [isTracking, setIsTracking] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [latency, setLatency] = useState(0)
  const [stability, setStability] = useState([1, 1, 1, 0])
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 })
  const [isCapturing, setIsCapturing] = useState(false)
  const [isModelActive, setIsModelActive] = useState(false)
  const [modelConnectionStatus, setModelConnectionStatus] = useState('checking') // 'online', 'offline', 'checking'

  // Refs for data accessed in animation loop (not state!)
  const currentStrokeRef = useRef([])
  const savedStrokesRef = useRef([])
  const isCapturingRef = useRef(false)

  // Refs for preventing excessive state updates in animation loop
  const lastLatencyRef = useRef(0)
  const lastConfidenceRef = useRef(0)
  const lastModelActiveRef = useRef(false)
  const lastConnectionStatusRef = useRef('checking')

  // Other refs for tracking
  const startTimeRef = useRef(Date.now())
  const lastPointTimeRef = useRef(0)
  const processingRef = useRef(false)
  const frameStartRef = useRef(Date.now())
  const modelStatusDebounceRef = useRef(null)

  // Bounding box dimensions (matching backend)
  const SIGNATURE_AREA_P1 = { x: 100, y: 100 }
  const SIGNATURE_AREA_P2 = { x: 540, y: 350 }
  const DISTANCE_THRESHOLD = 80  // Must match backend DIST_MAX

  // Debounced model status update to prevent rapid flickering
  const updateModelStatusDebounced = (newStatus) => {
    // Clear existing timeout
    if (modelStatusDebounceRef.current) {
      clearTimeout(modelStatusDebounceRef.current)
    }
    
    // Set new timeout
    modelStatusDebounceRef.current = setTimeout(() => {
      if (lastConnectionStatusRef.current !== newStatus) {
        setModelConnectionStatus(newStatus)
        lastConnectionStatusRef.current = newStatus
      }
    }, 500) // 500ms debounce
  }

  // Check siameseLSTM model connectivity (debounced)
  const checkModelConnection = useCallback(async () => {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 })
      
      if (response.data && response.data.status === 'ok') {
        // Only update if actually changed to prevent unnecessary re-renders
        setModelConnectionStatus(prev => prev !== 'online' ? 'online' : prev)
      } else {
        setModelConnectionStatus(prev => prev !== 'offline' ? 'offline' : prev)
      }
    } catch (err) {
      console.warn('Model health check failed:', err.message)
      setModelConnectionStatus(prev => prev !== 'offline' ? 'offline' : prev)
    }
  }, [])

  // Periodic model health check - Fixed dependency array
  useEffect(() => {
    // Initial check
    checkModelConnection()
    
    // Set up periodic health checks every 15 seconds (increased interval)
    const healthCheckInterval = setInterval(checkModelConnection, 15000)
    
    return () => clearInterval(healthCheckInterval)
  }, []) // ✅ Empty dependency array prevents re-creation

  // Start camera on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        })
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setStatus('Camera ready - Press "Start Capture" button or Z key to begin')
          detectHands()
        }
      } catch (err) {
        setStatus('Camera access denied')
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
      // Clean up debounce timeout
      if (modelStatusDebounceRef.current) {
        clearTimeout(modelStatusDebounceRef.current)
      }
    }
  }, [])

  // Start capture function
  const startCapture = () => {
    currentStrokeRef.current = []
    savedStrokesRef.current = []
    isCapturingRef.current = true
    setIsCapturing(true)
    startTimeRef.current = Date.now()
    setStatus('Put fingers together, position 50cm away, then spread apart while signing')
  }

  // Clear canvas function
  const clearCanvas = () => {
    currentStrokeRef.current = []
    savedStrokesRef.current = []
    isCapturingRef.current = false
    setIsCapturing(false)
    setStatus('Canvas cleared')
    setTimeout(() => setStatus('Camera ready'), 1500)
  }

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase()

      if (key === 'z') {
        startCapture()
      } else if (key === 'x') {
        handleSaveSignature()
      } else if (key === 'q') {
        if (onBack) onBack()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onBack])

  // Handle save signature
  const handleSaveSignature = () => {
    // Finalize current stroke if any
    let finalStrokes = savedStrokesRef.current
    if (currentStrokeRef.current.length > 0) {
      finalStrokes = [...savedStrokesRef.current, currentStrokeRef.current]
    }

    if (finalStrokes.length === 0 || (finalStrokes.length === 1 && finalStrokes[0].length === 0)) {
      setStatus('No signature captured. Start capture first.')
      return
    }

    // Adjust coordinates for saving (relative to signature area)
    const adjustedSignature = finalStrokes.map(stroke =>
      stroke.map(point => [
        point[0] - SIGNATURE_AREA_P1.x + 5,
        point[1] - SIGNATURE_AREA_P1.y + 5,
        point[2]
      ])
    )

    // Store the signature
    const newCollected = [...collectedSignatures, adjustedSignature]
    setCollectedSignatures(newCollected)

    if (newCollected.length === 1) {
      // First signature saved
      setSignatureNumber(2)
      currentStrokeRef.current = []
      savedStrokesRef.current = []
      isCapturingRef.current = false
      setIsCapturing(false)
      setStatus('Ready for next signature - Press "Start Capture" or Z key')
    } else if (newCollected.length === 2) {
      // Both signatures collected
      onComplete(newCollected)
    }
  }

  // Detect hands by sending frames to backend
  const detectHands = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || processingRef.current) {
      requestAnimationFrame(detectHands)
      return
    }

    try {
      frameStartRef.current = Date.now()
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Draw video frame (mirrored)
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
      ctx.restore()

      // Draw all saved strokes (blue)
      if (savedStrokesRef.current.length > 0) {
        ctx.strokeStyle = '#2196f3'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        savedStrokesRef.current.forEach(stroke => {
          if (stroke.length > 1) {
            ctx.beginPath()
            ctx.moveTo(stroke[0][0], stroke[0][1])
            for (let i = 1; i < stroke.length; i++) {
              ctx.lineTo(stroke[i][0], stroke[i][1])
            }
            ctx.stroke()
          }
        })
      }

      // Draw current stroke (lighter blue)
      if (currentStrokeRef.current.length > 0) {
        ctx.strokeStyle = '#64b5f6'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        if (currentStrokeRef.current.length > 1) {
          ctx.beginPath()
          ctx.moveTo(currentStrokeRef.current[0][0], currentStrokeRef.current[0][1])
          for (let i = 1; i < currentStrokeRef.current.length; i++) {
            ctx.lineTo(currentStrokeRef.current[i][0], currentStrokeRef.current[i][1])
          }
          ctx.stroke()
        }
      }

      // Draw signature area bounding box
      ctx.strokeStyle = '#64b5f6'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])
      ctx.strokeRect(
        SIGNATURE_AREA_P1.x,
        SIGNATURE_AREA_P1.y,
        SIGNATURE_AREA_P2.x - SIGNATURE_AREA_P1.x,
        SIGNATURE_AREA_P2.y - SIGNATURE_AREA_P1.y
      )
      ctx.setLineDash([])

      // Send frame to backend for hand detection
      processingRef.current = true
      
      // Only update model active state if it changed
      if (!lastModelActiveRef.current) {
        setIsModelActive(true)
        lastModelActiveRef.current = true
      }
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7)

      try {
        const response = await apiClient.post('/api/process-frame', {
          frame: imageData,
        })

        const handData = response.data
        const processingTime = Date.now() - frameStartRef.current
        
        // Only update latency if significantly changed (>10ms difference)
        if (Math.abs(processingTime - lastLatencyRef.current) > 10) {
          setLatency(processingTime)
          lastLatencyRef.current = processingTime
        }
        
        // Only update model active state if it changed
        if (lastModelActiveRef.current) {
          setIsModelActive(false)
          lastModelActiveRef.current = false
        }

        if (handData.detected && handData.index_finger) {
          const indexX = handData.index_finger[0]
          const indexY = handData.index_finger[1]
          const dist = handData.finger_distance

          setIsTracking(true)
          setFingerDistance(Math.round(dist))
          setHandPosition({ x: indexX, y: indexY })
          
          // Calculate dynamic confidence with throttling
          let newConfidence
          if (handData.confidence) {
            newConfidence = handData.confidence
          } else {
            // Calculate confidence based on stability, latency, and detection consistency
            const latencyFactor = Math.max(0, 100 - (processingTime - 50) * 0.5) // Penalty for high latency
            const stabilityScore = stability.reduce((sum, val) => sum + val, 0) / stability.length * 100
            const calculatedConfidence = Math.min(100, (latencyFactor + stabilityScore) / 2)
            newConfidence = Math.max(75, calculatedConfidence) // Min 75% when detected
          }
          
          // Only update confidence if significantly changed (>2% difference)
          if (Math.abs(newConfidence - lastConfidenceRef.current) > 2) {
            setConfidence(newConfidence)
            lastConfidenceRef.current = newConfidence
          }

          // Update stability indicator
          const isStable = dist > DISTANCE_THRESHOLD - 20 && dist < DISTANCE_THRESHOLD + 20
          setStability(prev => {
            const newStability = [...prev.slice(1), isStable ? 1 : 0]
            return newStability
          })

          // Draw hand position indicator
          ctx.fillStyle = isCapturingRef.current ? '#4caf50' : '#ff9800'
          ctx.beginPath()
          ctx.arc(indexX, indexY, 8, 0, 2 * Math.PI)
          ctx.fill()

          // Process based on finger distance and area
          if (dist > DISTANCE_THRESHOLD && handData.in_signature_area && isCapturingRef.current) {
            // Fingers apart and in area - capture point
            const now = Date.now()
            if (now - lastPointTimeRef.current > 25) {
              const timestamp = (now - startTimeRef.current) / 1000
              currentStrokeRef.current.push([indexX, indexY, timestamp])
              lastPointTimeRef.current = now
            }
          } else if (currentStrokeRef.current.length > 0) {
            // Fingers together or outside area - end current stroke
            savedStrokesRef.current.push([...currentStrokeRef.current])
            currentStrokeRef.current = []
          }
        } else {
          setIsTracking(false)
          // Gradually decrease confidence when no hand detected (throttled)
          if (lastConfidenceRef.current > 0) {
            const newConfidence = Math.max(0, lastConfidenceRef.current - 2)
            setConfidence(newConfidence)
            lastConfidenceRef.current = newConfidence
          }
          if (currentStrokeRef.current.length > 0) {
            // Hand lost - end current stroke
            savedStrokesRef.current.push([...currentStrokeRef.current])
            currentStrokeRef.current = []
          }
        }
      } catch (err) {
        console.error('Hand detection error:', err)
        
        // Only update latency if significantly changed
        if (Math.abs(999 - lastLatencyRef.current) > 10) {
          setLatency(999)
          lastLatencyRef.current = 999
        }
        
        // Only update model active state if it changed
        if (lastModelActiveRef.current) {
          setIsModelActive(false)
          lastModelActiveRef.current = false
        }
        
        // Check if error indicates model connectivity issue (debounced)
        if ((err.response?.status === 503 || err.code === 'ECONNABORTED' || err.message.includes('timeout')) 
            && lastConnectionStatusRef.current !== 'offline') {
          updateModelStatusDebounced('offline')
        }
      }

      processingRef.current = false
    } catch (err) {
      console.error('Canvas error:', err)
    }

    requestAnimationFrame(detectHands)
  }, [stability])

  return (
    <div className="signature-canvas-page">
      {/* Header */}
      <header className="signature-header">
        <nav className="signature-nav">
          <div className="logo">AeroSign</div>
          <div className="nav-links desktop-only">
            <a href="#" className="nav-link active">Capture</a>
            <a href="#" className="nav-link">History</a>
          </div>
          <div className="nav-icons">
            <button className="icon-btn" title="Help" aria-label="Help">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button className="icon-btn" title="Account" aria-label="Account">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="signature-main">
        {/* Tutorial Section - Top Priority */}
        <div className="tutorial-section">
          <h3 className="tutorial-title">How to use  AeroSign</h3>
          <div className="tutorial-steps">
            <div className="tutorial-step">
              <span className="step-number">1</span>
              <span className="step-text">Hold your index and middle fingers together like holding a pen</span>
            </div>
            <div className="tutorial-step">
              <span className="step-number">2</span>
              <span className="step-text">Position your hand 50cm (arm's length) from the camera</span>
            </div>
            <div className="tutorial-step">
              <span className="step-number">3</span>
              <span className="step-text">Press "Start Capture" and move apart fingers while signing</span>
            </div>
            <div className="tutorial-step">
              <span className="step-number">4</span>
              <span className="step-text">Keep fingers apart while drawing, close them to stop</span>
            </div>
          </div>
        </div>

        {/* Camera Area with Cleaner Layout */}
        <div className="camera-section">
          {/* Status Bar Above Camera */}
          <div className="camera-status-bar">
            <div className="status-left">
              {isTracking ? (
                <div className="tracking-indicator">
                  <span className="status-dot animate-pulse"></span>
                  <span className="status-text">Hand Detected</span>
                </div>
              ) : (
                <div className="no-tracking-indicator">
                  <span className="status-dot-inactive"></span>
                  <span className="status-text">Looking for Hand...</span>
                </div>
              )}
            </div>

            <div className="status-center">
              <div className="signature-counter">
                Signature {signatureNumber} of 2
              </div>
            </div>

            <div className="status-right">
              {/* AI Model Activity/Connection Indicator */}
              {modelConnectionStatus === 'offline' ? (
                <div className="ai-model-indicator offline">
                  <span className="material-symbols-outlined">cloud_off</span>
                  <span className="status-text">Model Offline</span>
                </div>
              ) : modelConnectionStatus === 'checking' ? (
                <div className="ai-model-indicator checking">
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  <span className="status-text">Checking Model</span>
                </div>
              ) : isModelActive ? (
                <div className="ai-model-indicator active">
                  <span className="material-symbols-outlined animate-spin">psychology</span>
                  <span className="status-text">AI Processing</span>
                </div>
              ) : fingerDistance > 0 && fingerDistance < DISTANCE_THRESHOLD ? (
                <div className="distance-warning">
                  <span className="material-symbols-outlined">warning</span>
                  <span>Move Back</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Capture Area (The Lens) - Cleaner */}
          <div className="capture-area lens-radius">
            {/* Hidden video element */}
            <video
              ref={videoRef}
              width="640"
              height="480"
              style={{ display: 'none' }}
            />

            {/* Main canvas */}
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className="signature-canvas"
            />

            {/* Minimal Overlay - Just Hand Position Indicator */}
            {isTracking && (
              <div className="hand-indicator"
                style={{
                  left: `${(handPosition.x / 640) * 100}%`,
                  top: `${(handPosition.y / 480) * 100}%`
                }}>
                <div className={`hand-dot ${isCapturing ? 'capturing' : 'ready'}`}></div>
              </div>
            )}

            {/* Signature trail visualization */}
            {currentStrokeRef.current.length > 0 && (
              <svg className="signature-trail" viewBox="0 0 640 480">
                <defs>
                  <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#64b5f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#64b5f6" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>

          {/* Info Bar Below Camera */}
          <div className="camera-info-bar">
            <div className="info-item">
              <span className="info-label">Distance</span>
              <span className="info-value">{fingerDistance}px</span>
            </div>
            <div className="info-item">
              <span className="info-label">Position</span>
              <span className="info-value">
                X:{(handPosition.x / 640).toFixed(2)} Y:{(handPosition.y / 480).toFixed(2)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{isCapturing ? 'Recording' : 'Ready'}</span>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className={`cta-button ${isCapturing ? 'recording' : ''}`}
              onClick={isCapturing ? handleSaveSignature : startCapture}
              aria-label={isCapturing ? "Save signature" : "Start capture"}
            >
              <span className="material-symbols-outlined">
                {isCapturing ? 'stop' : 'ink_highlighter'}
              </span>
              {isCapturing ? 'Save Signature' : 'Start Capture'}
            </button>

            <button
              className="clear-button"
              onClick={clearCanvas}
              title="Clear Canvas"
              aria-label="Clear canvas"
            >
              <span className="material-symbols-outlined">delete_sweep</span>
            </button>
          </div>

          {/* Shortcuts Legend */}
          <div className="shortcuts-panel">
            <div className="shortcuts-label">System Shortcuts</div>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd className="shortcut-key">Z</kbd>
                <span className="shortcut-desc">Record</span>
              </div>
              <div className="shortcut-item">
                <kbd className="shortcut-key">X</kbd>
                <span className="shortcut-desc">Finalize</span>
              </div>
              <div className="shortcut-item">
                <kbd className="shortcut-key">Q</kbd>
                <span className="shortcut-desc">Quit</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Info Cards */}
        <div className="info-cards">
          <div className="info-card">
            <span className="info-label">Confidence</span>
            <span className={`info-value ${
              confidence >= 90 ? 'confidence-excellent' : 
              confidence >= 75 ? 'confidence-good' : 
              confidence >= 50 ? 'confidence-fair' : 'confidence-poor'
            }`}>
              {confidence.toFixed(1)}%
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">Latency</span>
            <span className={`info-value ${
              latency <= 100 ? 'latency-excellent' : 
              latency <= 200 ? 'latency-good' : 
              latency <= 400 ? 'latency-fair' : 'latency-poor'
            }`}>
              {latency}ms
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">SiameseLSTM</span>
            <div className="ai-status-indicator">
              {modelConnectionStatus === 'checking' ? (
                <div className="ai-checking">
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  <span className="ai-status-text">Checking...</span>
                </div>
              ) : modelConnectionStatus === 'offline' ? (
                <div className="ai-offline">
                  <span className="material-symbols-outlined">cloud_off</span>
                  <span className="ai-status-text">Offline</span>
                </div>
              ) : isModelActive ? (
                <div className="ai-active">
                  <span className="material-symbols-outlined animate-spin">psychology</span>
                  <span className="ai-status-text">Processing</span>
                </div>
              ) : (
                <div className="ai-online">
                  <span className="material-symbols-outlined">psychology</span>
                  <span className="ai-status-text">Online</span>
                </div>
              )}
            </div>
          </div>
          <div className="info-card">
            <span className="info-label">Stability</span>
            <div className="stability-bars">
              {stability.map((level, index) => (
                <div
                  key={index}
                  className={`stability-bar ${level ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status Display */}
        <div className="status-display">
          {appError && (
            <div className="error-message">
              <span className="material-symbols-outlined">error</span>
              {appError}
            </div>
          )}

          {appLoading && (
            <div className="loading-message">
              <span className="material-symbols-outlined animate-spin">sync</span>
              Processing verification...
            </div>
          )}

          <div className="signature-progress">
            Signature {signatureNumber} of 2 • {collectedSignatures.length}/2 completed
          </div>

          <div className="status-message">{status}</div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className="mobile-nav-item" onClick={onBack} aria-label="Home">
          <span className="material-symbols-outlined">home</span>
          <span className="nav-label">Home</span>
        </button>
        <a href="#" className="mobile-nav-item active" aria-label="Capture">
          <span className="material-symbols-outlined">ink_highlighter</span>
          <span className="nav-label">Capture</span>
        </a>
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

export default SignatureCanvas
