import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import './RegistrationPage.css'

/**
 * RegistrationPage Component
 * 
 * Full-page registration experience with Supabase Auth integration
 * Auto-creates profile and user_settings records via database trigger
 * 
 * Props:
 * - onSuccess: callback when registration succeeds
 * - onNavigateToLogin: callback to navigate to login page
 */
export default function RegistrationPage({ onSuccess, onNavigateToLogin }) {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    termsAccepted: false
  })

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Validation logic
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    // Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return passwordRegex.test(password)
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must be 8+ chars with uppercase, lowercase, and number'
    }

    if (!formData.passwordConfirm) {
      errors.passwordConfirm = 'Please re-enter your password'
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match'
    }

    if (!formData.termsAccepted) {
      errors.termsAccepted = 'You must accept the terms'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // 1. Sign up user via Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            display_name: formData.fullName.trim()
          }
        }
      })

      if (signUpError) {
        // Handle specific Supabase errors
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.')
        } else if (signUpError.message.includes('invalid')) {
          setError('Invalid email or password format.')
        } else {
          setError(signUpError.message || 'Registration failed. Please try again.')
        }
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // 2. Success - profile + user_settings are auto-created by trigger
      setSuccess(true)
      setFormData({ fullName: '', email: '', password: '', passwordConfirm: '', termsAccepted: false })
      setFieldErrors({})

      // Call callback with user data
      if (onSuccess) {
        onSuccess(data.user)
      }

      // Navigate to login or onboarding after brief delay
      setTimeout(() => {
        if (onNavigateToLogin) {
          onNavigateToLogin()
        }
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 lg:py-24 bg-surface">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden shadow-none">
        
        {/* Left Side: Brand & Visual Anchor */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-surface-container-low signature-viewport-clip">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2">
              <span className="text-3xl font-headline font-black tracking-tight text-on-surface">
                AeroSign
              </span>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-headline font-bold text-on-surface leading-[1.1] tracking-tight">
              The Precision Lens <br />for Digital Trust.
            </h1>
            <p className="text-on-surface-variant max-w-md text-lg leading-relaxed">
              Experience high-performance signature capture powered by computer vision. Secure, authenticated, and built for technical excellence.
            </p>
          </div>
          
          <div className="relative group mt-12">
            <div className="absolute -inset-4 bg-primary-container/20 rounded-xl blur-2xl group-hover:bg-primary-container/30 transition-all"></div>
            <div className="relative bg-surface-container-lowest signature-viewport-clip aspect-video flex items-center justify-center border border-outline-variant/10">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, #006398 1px, transparent 0); background-size: 24px 24px;"></div>
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined text-4xl text-primary-container">
                  android_fingerprint
                </span>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-outline">
                  MediaPipe_Tracking_v2.4
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    <span className="font-mono text-[10px] text-on-surface">CALIBRATED</span>
                  </div>
                  <div className="font-mono text-[10px] text-outline">LATENCY: 12ms</div>
                </div>
                <svg className="h-10 opacity-60" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20 Q 30 10, 50 20 T 90 20" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="bg-surface p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <header className="mb-10">
              <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-2">
                Create Account
              </h2>
              <p className="text-on-surface-variant text-sm">
                Join the ecosystem of high-precision capture.
              </p>
            </header>

            {/* Success Banner */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-green-800 text-sm font-semibold">
                  ✓ Account created successfully! Redirecting...
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 bg-error-container border border-error rounded-lg">
                <p className="text-on-error-container text-sm font-semibold">
                  ✕ {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              
              {/* Full Name */}
              <div className="relative group">
                <label
                  className="block font-label text-[10px] font-bold uppercase tracking-wider text-outline mb-1 group-focus-within:text-primary transition-colors"
                  htmlFor="fullName"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Leonardo Euler"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full bg-transparent border-0 border-b border-outline-variant/40 px-0 py-2 focus:ring-0 focus:border-primary text-on-surface placeholder:text-surface-dim font-body transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {fieldErrors.fullName && (
                  <p className="text-error text-xs mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="relative group">
                <label
                  className="block font-label text-[10px] font-bold uppercase tracking-wider text-outline mb-1 group-focus-within:text-primary transition-colors"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="l.euler@aeroflight.tech"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full bg-transparent border-0 border-b border-outline-variant/40 px-0 py-2 focus:ring-0 focus:border-primary text-on-surface placeholder:text-surface-dim font-body transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {fieldErrors.email && (
                  <p className="text-error text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative group">
                <label
                  className="block font-label text-[10px] font-bold uppercase tracking-wider text-outline mb-1 group-focus-within:text-primary transition-colors"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 px-0 py-2 focus:ring-0 focus:border-primary text-on-surface placeholder:text-surface-dim font-body transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 bottom-2 text-outline-variant hover:text-primary cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-error text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="relative group">
                <label
                  className="block font-label text-[10px] font-bold uppercase tracking-wider text-outline mb-1 group-focus-within:text-primary transition-colors"
                  htmlFor="passwordConfirm"
                >
                  Re-enter Password
                </label>
                <div className="relative">
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 px-0 py-2 focus:ring-0 focus:border-primary text-on-surface placeholder:text-surface-dim font-body transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    disabled={loading}
                    aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-0 bottom-2 text-outline-variant hover:text-primary cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.passwordConfirm && (
                  <p className="text-error text-xs mt-1">{fieldErrors.passwordConfirm}</p>
                )}
              </div>

              {/* Terms of Service */}
              <div className="flex items-start gap-3 pt-2">
                <div className="relative flex items-center">
                  <input
                    id="terms"
                    name="termsAccepted"
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-4 h-4 rounded-sm border-outline-variant bg-transparent text-primary focus:ring-primary focus:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant leading-relaxed" htmlFor="terms">
                    I agree to the{' '}
                    <a href="#" className="text-primary font-semibold hover:underline">
                      Terms of Service
                    </a>
                    {' '}and acknowledge the{' '}
                    <a href="#" className="text-primary font-semibold hover:underline">
                      Privacy Policy
                    </a>
                    {' '}regarding biometric data handling.
                  </label>
                  {fieldErrors.termsAccepted && (
                    <p className="text-error text-xs mt-1">{fieldErrors.termsAccepted}</p>
                  )}
                </div>
              </div>

              {/* Primary Action */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-3.5 px-6 rounded-md shadow-[0_4px_20px_rgba(0,99,152,0.15)] active:scale-[0.98] transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-lg">
                        hourglass
                      </span>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <footer className="mt-12 text-center">
              <p className="text-sm text-on-surface-variant">
                Already have an account?{' '}
                <button
                  onClick={onNavigateToLogin}
                  disabled={loading}
                  className="text-primary font-bold ml-1 hover:underline decoration-2 underline-offset-4 transition-all bg-none border-none p-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Sign In
                </button>
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* Mobile Status Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full p-4 flex justify-center pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3 border border-white/20 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-mono text-[10px] tracking-widest text-on-surface">
            SECURE CONNECTION ACTIVE
          </span>
        </div>
      </div>
    </main>
  )
}
