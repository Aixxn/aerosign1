import { useState, useEffect } from 'react'
import './App.css'
import LandingPage from './components/LandingPage'
import RegistrationPage from './components/RegistrationPage'
import LoginPage from './components/LoginPage'
import SignatureCanvas from './components/SignatureCanvas'
import { useAuth } from './hooks/useAuth'
import { apiClient } from './utils/api'

function App() {
  // Auth state from hook
  const { user, session, isLoading: authLoading, error: authError, signOut } = useAuth()

  // Page routing state
  const [currentPage, setCurrentPage] = useState('landing') // 'landing' | 'register' | 'login' | 'app'
  const [step, setStep] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [models, setModels] = useState([])
  const [activeModel, setActiveModel] = useState('combo_1')

  // Get userId from authenticated user, fallback to temp ID for testing
  const [userId] = useState(() => {
    if (user?.id) {
      return user.id
    }
    // Fallback for testing without auth
    const stored = localStorage.getItem('aerosign_user_id')
    if (stored) return stored
    
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('aerosign_user_id', newUserId)
    return newUserId
  })

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await apiClient.get('/api/models')
        setModels(response.data.available_models)
        setActiveModel(response.data.active_model)
      } catch (err) {
        const errorMsg = err.userMessage || err.message
        setError('Failed to load models: ' + errorMsg)
      }
    }
    fetchModels()
  }, [])

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await apiClient.get('/health')
        console.log('✓ Backend connected:', response.data)
      } catch (err) {
        const errorMsg = err.userMessage || 'Cannot connect to backend. Make sure API is running on http://127.0.0.1:8000'
        setError(errorMsg)
      }
    }
    testConnection()
  }, [])

  const handleSignaturesComplete = async (signatures) => {
    // signatures is an array [sig1, sig2] where each is an array of strokes
    if (!signatures || signatures.length !== 2) {
      setError('Both signatures required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Flatten signatures: convert array of strokes to flat array of points
      const flattenSignature = (signature) => {
        return signature.flat()
      }

      const flatSig1 = flattenSignature(signatures[0])
      const flatSig2 = flattenSignature(signatures[1])

      // Validate minimum points
      if (flatSig1.length < 10 || flatSig2.length < 10) {
        setError('Signatures must have at least 10 points each')
        return
      }

      const response = await apiClient.post('/api/verify', {
        signature1: flatSig1,
        signature2: flatSig2,
        model_name: activeModel
      })

      setResult(response.data)
      setStep(2)
    } catch (err) {
      const errorMsg = err.userMessage || err.response?.data?.message || err.message
      setError('Verification failed: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setStep(1)
    setError(null)
  }

  const handleModelChange = async (newModel) => {
    try {
      await apiClient.post(`/api/set-active-model/${newModel}`)
      setActiveModel(newModel)
    } catch (err) {
      const errorMsg = err.userMessage || err.message
      setError('Failed to switch model: ' + errorMsg)
    }
  }

  const handleStartSigning = () => {
    // If not authenticated, show registration page
    if (!user) {
      setCurrentPage('register')
      return
    }

    // If authenticated, go directly to signature canvas
    setCurrentPage('app')
    setStep(1)
    setResult(null)
    setError(null)
  }

  const handleRegistrationSuccess = () => {
    // After successful registration, navigate to login page
    setCurrentPage('login')
  }

  const handleLoginSuccess = () => {
    // After successful login, wait briefly then navigate to app
    setTimeout(() => {
      setCurrentPage('app')
      setStep(1)
      setResult(null)
      setError(null)
    }, 1500)
  }

  const handleNavigateToLogin = () => {
    setCurrentPage('login')
  }

  const handleNavigateToRegister = () => {
    setCurrentPage('register')
  }

  const handleBackToLanding = async () => {
    setCurrentPage('landing')
    handleReset()
    // Optional: Sign out when returning to landing
    // await signOut()
  }

  // Loading auth state
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000a1a 0%, #1a1f3a 100%)',
        color: '#e8e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '2px solid rgba(232, 232, 240, 0.3)',
            borderTop: '2px solid #e8e8f0',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Initializing AeroSign...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Route: Landing page
  if (currentPage === 'landing') {
    return <LandingPage onStartSigning={handleStartSigning} />
  }

  // Route: Registration page (unauthenticated)
  if (currentPage === 'register') {
    return (
      <RegistrationPage 
        onSuccess={handleRegistrationSuccess}
        onNavigateToLogin={handleNavigateToLogin}
      />
    )
  }

  // Route: Login page (unauthenticated)
  if (currentPage === 'login') {
    return (
      <LoginPage 
        onSuccess={handleLoginSuccess}
        onNavigateToRegister={handleNavigateToRegister}
      />
    )
  }

  // Route: Signature Canvas (authenticated, step 1)
  if (currentPage === 'app' && step === 1) {
    return (
      <SignatureCanvas 
        onComplete={handleSignaturesComplete} 
        onBack={handleBackToLanding}
        error={error}
        loading={loading}
        userId={userId}
        user={user}
        onSignOut={signOut}
      />
    )
  }

  // Results page - use old app layout
  return (
    <div className="app">
      <header className="header">
        <button onClick={handleBackToLanding} className="btn-back">
          ← Back to Home
        </button>
        <div>
          <h1>Aerosign - Signature Verification</h1>
          <p>Verification Results</p>
        </div>
      </header>

      {error && <div className="error-box">{error}</div>}

      <div className="content">
        {step === 2 && result && (
          <div className="step-container">
            <h2>Step 2: Verification Results</h2>
            <div className={`result ${result.match ? 'match' : 'no-match'}`}>
              <div className="result-icon">
                {result.match ? '✅' : '❌'}
              </div>
              <h3>{result.match ? 'SIGNATURES MATCH' : 'SIGNATURES DO NOT MATCH'}</h3>
              <div className="result-details">
                <p><strong>Confidence:</strong> {result.confidence.toFixed(1)}%</p>
                <p><strong>Distance:</strong> {result.distance.toFixed(4)}</p>
                <p><strong>Threshold:</strong> {result.threshold.toFixed(4)}</p>
                <p><strong>Model:</strong> {result.model_used}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="actions">
        {step > 1 && (
          <button onClick={handleReset} className="btn-reset">Reset</button>
        )}
      </div>

      <footer className="footer">
        <p>API Status: Connected</p>
        <p>Backend: http://127.0.0.1:8000</p>
      </footer>
    </div>
  )
}

export default App
