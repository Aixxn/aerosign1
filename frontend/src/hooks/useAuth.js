import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

/**
 * useAuth Hook
 * 
 * Manages Supabase authentication state and session persistence.
 * Listens for auth state changes and tracks user session across page reloads.
 * 
 * Returns:
 * - user: Current authenticated user object (null if not logged in)
 * - session: Current session object (null if not logged in)
 * - isLoading: Boolean indicating if auth state is being checked
 * - error: Error message if auth check failed (null if no error)
 * - signOut: Function to sign out the current user
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // Get current session from Supabase
        const {
          data: { session: currentSession },
          error: sessionError
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (isMounted) {
          setSession(currentSession)
          setUser(currentSession?.user || null)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to check authentication')
          setSession(null)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (isMounted) {
        setSession(newSession)
        setUser(newSession?.user || null)
        setError(null)
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setSession(null)
      setUser(null)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to sign out')
    }
  }

  return {
    user,
    session,
    isLoading,
    error,
    signOut
  }
}
