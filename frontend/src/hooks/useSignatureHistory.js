import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../utils/api'

/**
 * Custom hook for fetching and managing signature verification history
 * 
 * Features:
 * - Fetches signatures from Python backend API (/api/users/{userId}/signatures)
 * - Pagination support (50 per page)
 * - Search by filename/metadata
 * - Filter by date range
 * - Real-time loading/error states
 * 
 * @param {string} userId - The user ID to fetch signatures for
 */
export function useSignatureHistory(userId) {
  
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
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch signatures from Python backend API
   */
  const fetchVerifications = useCallback(async () => {
    console.log('[useSignatureHistory] fetchVerifications called, userId:', userId)
    
    if (!userId) {
      console.log('[useSignatureHistory] No userId provided, returning empty')
      setVerifications([])
      setTotalCount(0)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all signatures from backend
      const url = `/api/users/${userId}/signatures`
      console.log('[useSignatureHistory] Fetching from URL:', url)
      
      const response = await apiClient.get(url)
      console.log('[useSignatureHistory] Full backend response:', response.data)
      console.log('[useSignatureHistory] Response signatures array:', response.data.signatures)
      console.log('[useSignatureHistory] Response signatures count:', response.data.signatures?.length || 0)
      
      let allSignatures = response.data.signatures || []
      console.log('[useSignatureHistory] After parsing, allSignatures:', allSignatures)
      
      // Apply search filter (matches against signature_id or metadata)
      if (searchQuery.trim()) {
        allSignatures = allSignatures.filter(sig => {
          const searchLower = searchQuery.toLowerCase()
          return (
            sig.signature_id?.toLowerCase().includes(searchLower) ||
            sig.session_id?.toLowerCase().includes(searchLower) ||
            sig.metadata?.filename?.toLowerCase().includes(searchLower)
          )
        })
      }

      // Apply date range filter
      if (dateFrom || dateTo) {
        allSignatures = allSignatures.filter(sig => {
          const sigDate = new Date(sig.saved_at)
          if (dateFrom && sigDate < new Date(dateFrom)) return false
          if (dateTo) {
            const dateToEnd = new Date(dateTo)
            dateToEnd.setHours(23, 59, 59, 999)
            if (sigDate > dateToEnd) return false
          }
          return true
        })
      }

      // Sort by date descending (most recent first)
      allSignatures.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))

      const totalCount = allSignatures.length

      // Apply pagination
      const offset = (page - 1) * pageSize
      const paginatedSignatures = allSignatures.slice(offset, offset + pageSize)

      // Transform backend format to match expected format
      const formattedSignatures = paginatedSignatures.map(sig => ({
        id: sig.signature_id,
        name: sig.metadata?.filename || `Signature ${sig.signature_id.substr(0, 8)}`,
        created_at: sig.saved_at,
        candidate_signature_id: sig.signature_id,
        model_used: sig.metadata?.model || 'siamese_lstm_pytorch',
        signature: {
          signature_data: sig.signature_data || [],
          point_count: sig.point_count
        },
        details: sig.metadata
      }))

      setTotalCount(totalCount || 0)
      setVerifications(formattedSignatures || [])
    } catch (err) {
      console.error('[useSignatureHistory] Error fetching signatures:', err)
      setError(err.userMessage || err.message || 'Failed to fetch signature history from backend')
      setVerifications([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [userId, page, pageSize, searchQuery, dateFrom, dateTo])

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

  /**
   * Delete a signature (note: backend stores signatures, not verifications)
   * For now, this is a placeholder - backend storage doesn't support deletion
   */
  const deleteVerification = useCallback(async (verificationId) => {
    try {
      // Note: The in-memory backend storage doesn't support deletion
      // In production, implement a DELETE /api/signatures/{signature_id} endpoint
      console.warn('[useSignatureHistory] Deletion not yet implemented in backend')
      
      // For UI purposes, just refetch to ensure consistency
      await fetchVerifications()
      return { success: false, error: 'Deletion not yet implemented. Contact support.' }
    } catch (err) {
      console.error('[useSignatureHistory] Error in delete handler:', err)
      return { success: false, error: err.message }
    }
  }, [fetchVerifications])

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
          created_at: verification.created_at,
          signature_data: verification.signature?.signature_data,
          format
        }
      }
    } catch (err) {
      console.error('[useSignatureHistory] Error exporting verification:', err)
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
    setSearchQuery,
    handleSearchChange,
    dateFrom,
    setDateFrom,
    handleDateFromChange,
    dateTo,
    setDateTo,
    handleDateToChange,
    
    // Actions
    deleteVerification,
    exportVerification,
    
    // UI State
    loading,
    error,
    refetch: fetchVerifications
  }
}
