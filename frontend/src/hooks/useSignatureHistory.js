import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from './useAuth'

/**
 * Custom hook for fetching and managing signature verification history
 * 
 * Features:
 * - Fetches verification events from Supabase
 * - Pagination support (50 per page)
 * - Search by filename
 * - Filter by date range
 * - Filter by confidence range
 * - Real-time loading/error states
 */
export function useSignatureHistory() {
  const { user } = useAuth()
  
  // Data state
  const [verifications, setVerifications] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [confidenceMin, setConfidenceMin] = useState(0)
  const [confidenceMax, setConfidenceMax] = useState(100)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch signature verifications from Supabase
   */
  const fetchVerifications = useCallback(async () => {
    if (!user?.id) {
      setVerifications([])
      setTotalCount(0)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Build query
      let query = supabase
        .from('signature_verifications')
        .select(
          `
          id,
          name,
          created_at,
          confidence,
          candidate_signature_id,
          model_used,
          signatures:candidate_signature_id (
            signature_data,
            point_count
          )
          `,
          { count: 'exact' }
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Apply search filter (filename)
      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      // Apply date range filter
      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo)
      }

      // Apply confidence range filter
      query = query
        .gte('confidence', confidenceMin)
        .lte('confidence', confidenceMax)

      // Fetch total count first
      const { count } = await query

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setTotalCount(count || 0)
      setVerifications(data || [])
    } catch (err) {
      console.error('Error fetching verifications:', err)
      setError(err.message || 'Failed to load signature history')
      setVerifications([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [user?.id, page, pageSize, searchQuery, dateFrom, dateTo, confidenceMin, confidenceMax])

  // Fetch data when filters or pagination changes
  useEffect(() => {
    fetchVerifications()
  }, [fetchVerifications])

  /**
   * Reset pagination to first page when filters change
   */
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query)
    setPage(1)
  }, [])

  const handleDateFromChange = useCallback((date) => {
    setDateFrom(date)
    setPage(1)
  }, [])

  const handleDateToChange = useCallback((date) => {
    setDateTo(date)
    setPage(1)
  }, [])

  const handleConfidenceMinChange = useCallback((value) => {
    setConfidenceMin(value)
    setPage(1)
  }, [])

  const handleConfidenceMaxChange = useCallback((value) => {
    setConfidenceMax(value)
    setPage(1)
  }, [])

  /**
   * Delete a verification record
   */
  const deleteVerification = useCallback(async (verificationId) => {
    try {
      const { error: deleteError } = await supabase
        .from('signature_verifications')
        .delete()
        .eq('id', verificationId)
        .eq('user_id', user.id)

      if (deleteError) {
        throw deleteError
      }

      // Refetch data
      await fetchVerifications()
      return { success: true }
    } catch (err) {
      console.error('Error deleting verification:', err)
      return { success: false, error: err.message }
    }
  }, [user?.id, fetchVerifications])

  /**
   * Export verification as image/PDF
   */
  const exportVerification = useCallback(async (verificationId, format = 'png') => {
    try {
      const verification = verifications.find(v => v.id === verificationId)
      if (!verification) {
        throw new Error('Verification not found')
      }

      // Return data for export handling in component
      return {
        success: true,
        data: {
          id: verification.id,
          name: verification.name,
          confidence: verification.confidence,
          created_at: verification.created_at,
          signature_data: verification.signatures?.signature_data,
          format
        }
      }
    } catch (err) {
      console.error('Error exporting verification:', err)
      return { success: false, error: err.message }
    }
  }, [verifications])

  /**
   * Calculate pagination info
   */
  const totalPages = Math.ceil(totalCount / pageSize)
  const startEntry = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endEntry = Math.min(page * pageSize, totalCount)

  return {
    // Data
    verifications,
    totalCount,
    
    // Pagination
    page,
    setPage,
    pageSize,
    totalPages,
    startEntry,
    endEntry,
    
    // Search & Filters
    searchQuery,
    handleSearchChange,
    dateFrom,
    handleDateFromChange,
    dateTo,
    handleDateToChange,
    confidenceMin,
    handleConfidenceMinChange,
    confidenceMax,
    handleConfidenceMaxChange,
    
    // Actions
    deleteVerification,
    exportVerification,
    
    // UI State
    loading,
    error,
    refetch: fetchVerifications
  }
}
