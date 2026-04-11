import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import './RegistrationPage.css'

/**
 * RegistrationPage Component
 * 
 * Full-page registration experience with Supabase Auth integration
 * Auto-creates profile and user_settings records via database trigger
 * 
 * Features:
 * - Material 3 design system compliance
 * - Fully responsive across all viewports (mobile, tablet, desktop)
 * - Advanced form validation with real-time feedback
 * - Password strength indication
 * - Accessible form controls (ARIA labels, semantic HTML)
 * - Loading and error states
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
  const [touchedFields, setTouchedFields] = useState({})

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

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++

    const levels = [
      { level: 0, text: '', color: '' },
      { level: 1, text: 'Weak', color: 'text-error' },
      { level: 2, text: 'Fair', color: 'text-orange-500' },
      { level: 3, text: 'Good', color: 'text-blue-500' },
      { level: 4, text: 'Strong', color: 'text-green-500' },
      { level: 5, text: 'Very Strong', color: 'text-green-600' }
    ]

    return levels[Math.min(strength, 5)]
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
      setTouchedFields({})

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

  // Handle field blur for validation UI
  const handleBlur = (e) => {
    const { name } = e.target
    setTouchedFields(prev => ({
      ...prev,
      [name]: true
    }))
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface overflow-hidden">
      {/* Main container with responsive padding */}
      <div className="w-full max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 md:px-0 py-8 xs:py-12 sm:py-16 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-screen md:min-h-auto md:rounded-xl overflow-hidden bg-surface">
          
          {/* Left Side: Brand & Visual Anchor */}
          <div className="hidden md:flex flex-col justify-between p-6 lg:p-12 bg-surface-container-low reg-viewport-clip">
            <div className="space-y-6 lg:space-y-8">
              {/* Brand Header */}
              <div className="inline-flex items-center gap-3">
                <span className="text-3xl lg:text-4xl font-headline font-black tracking-tight text-on-surface">
                  AeroSign
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-headline font-bold text-on-surface leading-tight tracking-tight">
                The Precision Lens <br className="hidden lg:block" />
                <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
                  for Digital Trust.
                </span>
              </h1>

              {/* Description */}
              <p className="text-on-surface-variant max-w-md text-base lg:text-lg leading-relaxed">
                Experience high-performance signature capture powered by computer vision. Secure, authenticated, and built for technical excellence.
              </p>
            </div>

            {/* Visual Preview Section */}
            <div className="relative group mt-8 lg:mt-12">
              <div className="absolute -inset-4 bg-primary-container/20 rounded-xl blur-3xl group-hover:bg-primary-container/30 transition-all duration-300"></div>
              <div className="reg-preview-container">
                <div className="absolute inset-0 reg-dot-pattern opacity-20 pointer-events-none"></div>
                <div className="text-center space-y-4 relative z-10">
                  <span className="material-symbols-outlined text-5xl lg:text-6xl text-primary-container block">
                    android_fingerprint
                  </span>
                  <div className="font-mono text-[9px] lg:text-[10px] uppercase tracking-widest text-outline">
                    MediaPipe_Tracking_v2.4
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span className="font-mono text-[9px] lg:text-[10px] text-on-surface whitespace-nowrap">CALIBRATED</span>
                    </div>
                    <div className="font-mono text-[9px] lg:text-[10px] text-outline">LATENCY: 12ms</div>
                  </div>
                  <svg className="h-8 lg:h-10 opacity-60 flex-shrink-0" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 20 Q 30 10, 50 20 T 90 20" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Registration Form */}
          <div className="bg-surface flex flex-col justify-center px-6 xs:px-8 sm:px-10 md:px-8 lg:px-12 py-8 xs:py-12 sm:py-16 md:py-12 lg:py-16 overflow-y-auto max-h-screen md:max-h-none">
            <div className="max-w-sm mx-auto w-full">
              {/* Form Header */}
              <header className="mb-8 sm:mb-10 md:mb-12">
                <h2 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
                  Create Account
                </h2>
                <p className="text-on-surface-variant text-sm sm:text-base">
                  Join the ecosystem of high-precision capture.
                </p>
              </header>

              {/* Success Banner */}
              {success && (
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-green-50 border border-green-300 rounded-lg sm:rounded-xl shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600 flex-shrink-0">
                      check_circle
                    </span>
                    <p className="text-green-800 text-sm font-medium">
                      Account created successfully! Redirecting...
                    </p>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-error-container border border-error rounded-lg sm:rounded-xl shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-error-container flex-shrink-0">
                      error
                    </span>
                    <p className="text-on-error-container text-sm font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8" noValidate>
                
                {/* Full Name Field */}
                <div className="space-y-2">
                  <label
                    className="block font-label text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-outline transition-colors"
                    htmlFor="fullName"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Leonardo Euler"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      aria-describedby={fieldErrors.fullName ? 'fullName-error' : 'fullName-hint'}
                      aria-invalid={!!fieldErrors.fullName}
                      className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 px-0 py-3 sm:py-3.5 focus:outline-none focus:border-primary text-on-surface placeholder:text-surface-dim font-body text-base sm:text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {fieldErrors.fullName && touchedFields.fullName && (
                      <p id="fullName-error" className="text-error text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label
                    className="block font-label text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-outline transition-colors"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="l.euler@aeroflight.tech"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      aria-invalid={!!fieldErrors.email}
                      className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 px-0 py-3 sm:py-3.5 focus:outline-none focus:border-primary text-on-surface placeholder:text-surface-dim font-body text-base sm:text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {fieldErrors.email && touchedFields.email && (
                      <p id="email-error" className="text-error text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    className="block font-label text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-outline transition-colors"
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
                      onBlur={handleBlur}
                      disabled={loading}
                      aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                      aria-invalid={!!fieldErrors.password}
                      className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 px-0 py-3 sm:py-3.5 pr-10 sm:pr-12 focus:outline-none focus:border-primary text-on-surface placeholder:text-surface-dim font-body text-base sm:text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-outline-variant hover:text-primary cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      tabIndex={loading ? -1 : 0}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              passwordStrength.level === 1 ? 'w-1/5 bg-error' :
                              passwordStrength.level === 2 ? 'w-2/5 bg-orange-500' :
                              passwordStrength.level === 3 ? 'w-3/5 bg-blue-500' :
                              passwordStrength.level === 4 ? 'w-4/5 bg-green-500' :
                              'w-full bg-green-600'
                            }`}
                          />
                        </div>
                        {passwordStrength.text && (
                          <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${passwordStrength.color}`}>
                            {passwordStrength.text}
                          </span>
                        )}
                      </div>
                      {!fieldErrors.password && (
                        <p id="password-hint" className="text-on-surface-variant text-xs sm:text-sm">
                          8+ chars, uppercase, lowercase, number
                        </p>
                      )}
                    </div>
                  )}

                  {fieldErrors.password && touchedFields.password && (
                    <p id="password-error" className="text-error text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label
                    className="block font-label text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-outline transition-colors"
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
                      onBlur={handleBlur}
                      disabled={loading}
                      aria-describedby={fieldErrors.passwordConfirm ? 'passwordConfirm-error' : undefined}
                      aria-invalid={!!fieldErrors.passwordConfirm}
                      className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 px-0 py-3 sm:py-3.5 pr-10 sm:pr-12 focus:outline-none focus:border-primary text-on-surface placeholder:text-surface-dim font-body text-base sm:text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      disabled={loading}
                      aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-outline-variant hover:text-primary cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      tabIndex={loading ? -1 : 0}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">
                        {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {fieldErrors.passwordConfirm && touchedFields.passwordConfirm && (
                    <p id="passwordConfirm-error" className="text-error text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      {fieldErrors.passwordConfirm}
                    </p>
                  )}
                </div>

                {/* Terms of Service Checkbox */}
                <div className="flex items-start gap-3 sm:gap-4 pt-2 sm:pt-4">
                  <div className="relative flex items-center mt-1 flex-shrink-0">
                    <input
                      id="terms"
                      name="termsAccepted"
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      aria-describedby={fieldErrors.termsAccepted ? 'terms-error' : 'terms-description'}
                      aria-invalid={!!fieldErrors.termsAccepted}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 border-outline-variant bg-transparent text-primary cursor-pointer focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed appearance-none transition-all checked:bg-primary checked:border-primary"
                    />
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-white text-base pointer-events-none opacity-0 checked:opacity-100 transition-opacity">
                      check
                    </span>
                  </div>
                  <div className="flex-1 pt-0.5 sm:pt-1">
                    <label id="terms-description" className="text-xs sm:text-sm text-on-surface-variant leading-relaxed cursor-pointer" htmlFor="terms">
                      I agree to the{' '}
                      <a href="#" className="text-primary font-semibold hover:underline underline-offset-2 transition-all">
                        Terms of Service
                      </a>
                      {' '}and acknowledge the{' '}
                      <a href="#" className="text-primary font-semibold hover:underline underline-offset-2 transition-all">
                        Privacy Policy
                      </a>
                      {' '}regarding biometric data handling.
                    </label>
                    {fieldErrors.termsAccepted && touchedFields.termsAccepted && (
                      <p id="terms-error" className="text-error text-xs sm:text-sm font-medium mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        {fieldErrors.termsAccepted}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 sm:pt-6 md:pt-8">
                  <button
                    type="submit"
                    disabled={loading || success}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-3.5 sm:py-4 px-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg active:shadow-sm disabled:shadow-none transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 text-base sm:text-lg"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin material-symbols-outlined text-lg sm:text-xl">
                          hourglass
                        </span>
                        <span className="hidden xs:inline">Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Sign In Link */}
              <footer className="mt-10 sm:mt-12 text-center">
                <p className="text-sm text-on-surface-variant">
                  Already have an account?{' '}
                  <button
                    onClick={onNavigateToLogin}
                    disabled={loading}
                    className="text-primary font-bold hover:underline decoration-2 underline-offset-4 transition-all bg-none border-none p-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Sign In
                  </button>
                </p>
              </footer>
            </div>

            {/* Bottom padding for mobile to prevent content overlap */}
            <div className="h-8 md:hidden"></div>
          </div>
        </div>
      </div>

      {/* Mobile Status Bar - Only on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 xs:p-4 flex justify-center pointer-events-none z-40">
        <div className="glass-panel px-3 xs:px-4 py-2 rounded-full flex items-center gap-2 xs:gap-3 border border-white/20 shadow-xl backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
          <span className="font-mono text-[9px] xs:text-[10px] tracking-widest text-on-surface whitespace-nowrap">
            SECURE CONNECTION ACTIVE
          </span>
        </div>
      </div>
    </main>
  )
}
