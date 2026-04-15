import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import ToSPPModal from './ToSPPModal'
import './RegistrationPage.css'

export default function RegistrationPage({ onSuccess, onNavigateToLogin }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    termsAccepted: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showToSPPModal, setShowToSPPModal] = useState(false)

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)

  const validateForm = () => {
    const errors = {}
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required'
    else if (formData.fullName.trim().length < 2) errors.fullName = 'Full name must be at least 2 characters'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!validateEmail(formData.email)) errors.email = 'Invalid email address'
    if (!formData.password) errors.password = 'Password is required'
    else if (!validatePassword(formData.password)) errors.password = 'Password must be 8+ chars with uppercase, lowercase, and number'
    if (!formData.passwordConfirm) errors.passwordConfirm = 'Please re-enter your password'
    else if (formData.password !== formData.passwordConfirm) errors.passwordConfirm = 'Passwords do not match'
    if (!formData.termsAccepted) errors.termsAccepted = 'You must accept the terms'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!validateForm()) return
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: { data: { display_name: formData.fullName.trim() } }
      })
      if (signUpError) {
        if (signUpError.message.includes('already registered')) setError('This email is already registered. Please sign in instead.')
        else if (signUpError.message.includes('invalid')) setError('Invalid email or password format.')
        else setError(signUpError.message || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }
      if (!data.user) { setError('Registration failed. Please try again.'); setLoading(false); return }
      setSuccess(true)
      setFormData({ fullName: '', email: '', password: '', passwordConfirm: '', termsAccepted: false })
      setFieldErrors({})
      if (onSuccess) onSuccess(data.user)
      setTimeout(() => { if (onNavigateToLogin) onNavigateToLogin() }, 1500)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: null }))
  }

  return (
    <div className="reg-page">

      {/* ── LEFT PANEL ── */}
      <aside className="reg-left">
        <div className="reg-left-inner">

          {/* Brand */}
          <div className="reg-brand">
            <span className="reg-brand-name">AeroSign</span>
            <span className="reg-brand-dot" />
          </div>

          {/* Headline */}
          <h1 className="reg-headline">
            The Precision Lens<br />for Digital Trust.
          </h1>

          {/* Body */}
          <p className="reg-subhead">
            Experience high-performance signature capture powered by computer vision.
            Secure, authenticated, and built for technical excellence.
          </p>

          {/* Preview card */}
          <div className="reg-preview-outer">
            <div className="reg-preview-glow" />
            <div className="reg-preview-card">
              <div
                className="reg-dotgrid"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, #006398 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              />
              <div className="reg-preview-icons">
                <span className="material-symbols-outlined reg-icon-android">android</span>
                <span className="material-symbols-outlined reg-icon-fp">fingerprint</span>
              </div>
              <div className="reg-preview-mono">MEDIAPIPE_TRACKING_V2.4</div>
              <div className="reg-preview-footer">
                <div className="reg-preview-status">
                  <span className="reg-status-dot" />
                  <div>
                    <div className="reg-status-calibrated">CALIBRATED</div>
                    <div className="reg-status-latency">LATENCY: 12ms</div>
                  </div>
                </div>
                <svg className="reg-sig-svg" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20 Q 30 10, 50 20 T 90 20" stroke="#006398" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="reg-right">
        <div className="reg-form-wrap">

          <header className="reg-form-header">
            <h2 className="reg-form-title">Create Account</h2>
            <p className="reg-form-subtitle">Join the ecosystem of high-precision capture.</p>
          </header>

          {success && (
            <div className="reg-banner reg-banner--success">
              ✓ Account created successfully! Redirecting…
            </div>
          )}
          {error && (
            <div className="reg-banner reg-banner--error">
              ✕ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="reg-form">

            {/* Full Name */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="fullName">Full Name</label>
              <div className="reg-input-wrap">
                <input id="fullName" name="fullName" type="text"
                  placeholder="Full Name"
                  value={formData.fullName} onChange={handleInputChange}
                  disabled={loading} className="reg-input" />
              </div>
              {fieldErrors.fullName && <p className="reg-field-error">{fieldErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="email">Email Address</label>
              <div className="reg-input-wrap">
                <input id="email" name="email" type="email"
                  placeholder="example@gmail.com"
                  value={formData.email} onChange={handleInputChange}
                  disabled={loading} className="reg-input" />
              </div>
              {fieldErrors.email && <p className="reg-field-error">{fieldErrors.email}</p>}
            </div>

            {/* Security Key / Password */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="password">Password</label>
              <div className="reg-input-wrap reg-input-wrap--pw">
                <input id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.password} onChange={handleInputChange}
                  disabled={loading} className="reg-input" />
                <button type="button" className="reg-pw-toggle"
                  onClick={() => setShowPassword(v => !v)} disabled={loading}
                  aria-label={showPassword ? 'Hide' : 'Show'}>
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.password && <p className="reg-field-error">{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="passwordConfirm">Re-enter Password</label>
              <div className="reg-input-wrap reg-input-wrap--pw">
                <input id="passwordConfirm" name="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.passwordConfirm} onChange={handleInputChange}
                  disabled={loading} className="reg-input" />
                <button type="button" className="reg-pw-toggle"
                  onClick={() => setShowPasswordConfirm(v => !v)} disabled={loading}
                  aria-label={showPasswordConfirm ? 'Hide' : 'Show'}>
                  <span className="material-symbols-outlined">
                    {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.passwordConfirm && <p className="reg-field-error">{fieldErrors.passwordConfirm}</p>}
            </div>

            {/* Terms */}
            <div className="reg-terms-row">
              <input id="terms" name="termsAccepted" type="checkbox"
                checked={formData.termsAccepted} onChange={handleInputChange}
                disabled={loading} className="reg-checkbox" />
              <label htmlFor="terms" className="reg-terms-label">
                I agree to the{' '}
                <button
                  type="button"
                  className="reg-link"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowToSPPModal(true)
                  }}
                >
                  Terms of Service
                </button>
                {' '}and acknowledge the{' '}
                <button
                  type="button"
                  className="reg-link"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowToSPPModal(true)
                  }}
                >
                  Privacy Policy
                </button>
                {' '}regarding biometric data handling.
              </label>
            </div>
            {fieldErrors.termsAccepted && <p className="reg-field-error">{fieldErrors.termsAccepted}</p>}

            {/* Submit */}
            <div className="reg-submit-wrap">
              <button type="submit" disabled={loading || success} className="reg-submit">
                {loading
                  ? <><span className="material-symbols-outlined reg-spin">hourglass_empty</span><span>Creating Account…</span></>
                  : <><span>Create Account</span><span className="material-symbols-outlined">arrow_forward</span></>
                }
              </button>
            </div>
          </form>

          <footer className="reg-footer">
            <p className="reg-footer-text">
              Already have an account?{' '}
              <button type="button" onClick={onNavigateToLogin}
                disabled={loading} className="reg-signin-link">
                Sign In
              </button>
            </p>
          </footer>
        </div>
      </main>

      {/* ToS/PP Modal */}
      <ToSPPModal isOpen={showToSPPModal} onClose={() => setShowToSPPModal(false)} />

      {/* Mobile status bar */}
      <div className="reg-mobile-bar">
        <div className="glass-panel reg-mobile-bar-inner">
          <span className="reg-mobile-dot" />
          <span className="reg-mobile-text">SECURE CONNECTION ACTIVE</span>
        </div>
      </div>
    </div>
  )
}