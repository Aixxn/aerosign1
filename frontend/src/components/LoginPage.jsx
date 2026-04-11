import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import './LoginPage.css'

/**
 * LoginPage Component
 * 
 * Full-page login experience with Supabase Auth integration.
 * Handles email/password authentication and session management.
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
      {/* Left Panel - Brand & Social Proof */}
      <div className="login-left-panel">
        <div className="login-brand-container">
          <div className="login-logo">
            <span className="material-symbols-outlined">draw</span>
            <span>AeroSign</span>
          </div>
          <h1 className="login-headline">Sign In</h1>
          <p className="login-tagline">Access your signature verification dashboard</p>
        </div>

        {/* Background pattern */}
        <div className="login-dot-pattern" aria-hidden="true"></div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right-panel">
        <div className="login-form-container">
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
                <span className="required-asterisk" aria-label="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="you@example.com"
                className={`login-input ${fieldErrors.email ? 'login-input-error' : ''}`}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <p id="email-error" className="login-error-message">
                  <span className="material-symbols-outlined">warning</span>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="login-form-group">
              <label htmlFor="password" className="login-label">
                Password
                <span className="required-asterisk" aria-label="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="••••••••"
                  className={`login-input ${fieldErrors.password ? 'login-input-error' : ''}`}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="login-error-message">
                  <span className="material-symbols-outlined">warning</span>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
              aria-label={loading ? 'Signing in...' : 'Sign in'}
            >
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>New to AeroSign?</span>
          </div>

          {/* Register Link */}
          <button
            type="button"
            className="login-register-btn"
            onClick={onNavigateToRegister}
            disabled={loading}
          >
            Create an Account
          </button>

          {/* Footer Note */}
          <p className="login-footer-note">
            By signing in, you agree to our{' '}
            <a href="#" className="login-link">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="login-link">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
