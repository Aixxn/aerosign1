import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import './LoginPage.css'

/**
 * LoginPage Component
 * 
 * Full-page login experience with Supabase Auth integration.
 * Matches Material 3 design with minimal underline input style.
 * 
 * Props:
 * - onSuccess: callback when login succeeds (receives user object)
 * - onNavigateToRegister: callback to navigate to registration page
 */
export default function LoginPage({ onSuccess, onNavigateToRegister }) {
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)

  // Auto-redirect on success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSuccess?.()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [success, onSuccess])

  // Validation logic
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    return errors
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (signInError) {
        throw signInError
      }

      if (!data.user) {
        throw new Error('Login failed: No user returned')
      }

      // Show success banner
      setSuccess(true)
      setFormData({ email: '', password: '' })
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please try again.'
      // Map common Supabase auth errors to user-friendly messages
      if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Main Content */}
      <main className="login-main">
        {/* Abstract Background Elements */}
        <div className="login-background-blur" aria-hidden="true"></div>

        <div className="login-container">
          {/* Branding Header */}
          <div className="login-header">
            <div className="login-icon-wrapper">
              <span className="material-symbols-outlined login-icon">fingerprint</span>
            </div>
            <h1 className="login-title">AeroSign</h1>
            <p className="login-subtitle">High-Performance Signature Capture</p>
          </div>

          {/* Login Card */}
          <div className="login-card">
            <div className="login-card-content">
              <div className="login-card-header">
                <h2 className="login-card-title">Welcome Back</h2>
                <p className="login-card-description">Access your secure signing environment.</p>
              </div>

              {/* Success Banner */}
              {success && (
                <div className="login-banner login-banner-success" role="alert" aria-live="polite">
                  <span className="material-symbols-outlined">check_circle</span>
                  <div>
                    <p className="banner-title">Login Successful!</p>
                    <p className="banner-text">Redirecting to signature canvas...</p>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="login-banner login-banner-error" role="alert" aria-live="assertive">
                  <span className="material-symbols-outlined">error</span>
                  <div>
                    <p className="banner-title">Login Failed</p>
                    <p className="banner-text">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="login-form" noValidate>
                {/* Email Field */}
                <div className="login-form-group">
                  <label htmlFor="email" className="login-label">
                    Email Address
                  </label>
                  <div className="login-input-group">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="name@company.com"
                      className="login-input"
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      autoComplete="email"
                      required
                    />
                    <span className="login-input-underline"></span>
                  </div>
                  {fieldErrors.email && (
                    <p id="email-error" className="login-error-message">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="login-form-group">
                  <div className="login-label-wrapper">
                    <label htmlFor="password" className="login-label">
                      Password
                    </label>
                    <a href="#" className="login-forgot-password">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="login-input-group login-password-group">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="••••••••"
                      className="login-input"
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      autoComplete="current-password"
                      required
                    />
                    <span className="login-input-underline"></span>
                  </div>
                  {fieldErrors.password && (
                    <p id="password-error" className="login-error-message">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* System Status */}
                <div className="login-system-status">
                  <div className="login-status-dots">
                    <span className="status-dot"></span>
                    <span className="status-dot"></span>
                    <span className="status-dot"></span>
                  </div>
                  <span className="login-status-text">System Ready // AES-256 Validated</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                  aria-label={loading ? 'Signing in...' : 'Sign in'}
                >
                  <span>Sign In</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            </div>

            {/* Card Footer */}
            <div className="login-card-footer">
              <p className="login-footer-text">
                New to AeroSign?{' '}
                <button
                  type="button"
                  className="login-footer-link"
                  onClick={onNavigateToRegister}
                  disabled={loading}
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>

          {/* Global Footer */}
          <div className="login-global-footer">
            <div className="login-footer-meta">
              <span className="login-footer-item">VER: 4.2.0-LENS</span>
              <span className="login-footer-divider"></span>
              <span className="login-footer-item">ENC: RSA-4096</span>
            </div>
            <div className="login-footer-links">
              <a href="#" className="login-footer-link-item">Privacy</a>
              <a href="#" className="login-footer-link-item">Terms</a>
              <a href="#" className="login-footer-link-item">Security</a>
            </div>
          </div>
        </div>
      </main>

      {/* Right Side Graphic Panel (Desktop only) */}
      <aside className="login-side-panel" aria-hidden="true">
        <div className="login-side-panel-content">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4DE8NeJ5d3PBejBda1He7Ts8vqtCaOK7ucNRXOU4n0tDHidOHUsvqAqrKWS1dU2WNOpFHmp59INJH8HcnIBgkMJ1jAC-foqSeMD0CfHFziPTdOnbG231QP9Iy-M4Eqjuk6--2MDnTkeIup0sCHezOBzZkKP-rlp5-SvAFMLqJLvy2EiMrtg8RlDkJHbQGhS9VMMUD2RqNW4_AYbexwO5rlbj3R7XT-l4k3_aBfFW6tEEBRTA8UF70tl4E___s_Y0MrItPicGKsk4z"
            alt="Technical high-end interface showing blue digital signature coordinates and optical lens grid patterns"
            className="login-side-panel-image"
          />
          <div className="login-side-panel-overlay"></div>

          {/* Technical Overlay Card */}
          <div className="login-overlay-card">
            <span className="material-symbols-outlined login-overlay-icon">precision_manufacturing</span>
            <h3 className="login-overlay-title">Precision Engine</h3>
            <p className="login-overlay-text">
              Our computer vision engine captures 120 datapoints per second, ensuring sub-millimeter biometric verification for every signature.
            </p>
            <div className="login-overlay-meta">
              <span className="login-overlay-meta-item">LATENCY: &lt; 8ms</span>
              <span className="login-overlay-meta-item login-overlay-active">ACTIVE</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
