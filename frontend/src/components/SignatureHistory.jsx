import { useState, useEffect } from 'react'
import { useSignatureHistory } from '../hooks/useSignatureHistory'
import SignatureHistoryTable from './SignatureHistoryTable'
import './SignatureHistory.css'

/**
 * SignatureHistory Component
 * 
 * Main page for viewing signature verification history
 * Features:
 * - Search by filename
 * - Filter by date range
 * - Filter by confidence range
 * - Pagination (50 per page)
 * - View, share, and delete verifications
 * 
 * Props:
 * - onBack: Callback to navigate back
 * - user: Current authenticated user
 * - onSignOut: Callback for sign out
 */
export function SignatureHistory({ onBack, user, onSignOut }) {
  // Get all the history management from hook
  const {
    verifications,
    totalCount,
    page,
    pageSize,
    searchQuery,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    confidenceMin,
    setConfidenceMin,
    confidenceMax,
    setConfidenceMax,
    loading,
    error,
    setPage,
    deleteVerification,
    exportVerification
  } = useSignatureHistory()

  // UI state for filters and modal
  const [showFilters, setShowFilters] = useState(false)
  const [selectedVerification, setSelectedVerification] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage)
    // Scroll to top of table
    setTimeout(() => {
      const tableContainer = document.querySelector('.signature-history-table-container')
      if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  // Handle delete verification
  const handleDelete = async (verificationId) => {
    try {
      await deleteVerification(verificationId)
      // Success - row will be removed by hook
    } catch (err) {
      console.error('Failed to delete:', err)
      throw err
    }
  }

  // Handle view verification details
  const handleView = (verification) => {
    setSelectedVerification(verification)
    setShowViewModal(true)
  }

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setDateFrom(null)
    setDateTo(null)
    setConfidenceMin(0)
    setConfidenceMax(100)
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery || dateFrom || dateTo || confidenceMin > 0 || confidenceMax < 100

  return (
    <div className="signature-history-page">
      {/* Header */}
      <header className="history-header">
        <div className="header-content">
          <div className="header-title">
            <button 
              className="btn-back"
              onClick={onBack}
              title="Back to signature capture"
              aria-label="Back to signature capture"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1>Signature History</h1>
          </div>
          
          <button
            className="btn-sign-out"
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search verifications by filename"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            className={`btn-filter ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
            aria-label="Toggle filters"
          >
            <span className="material-symbols-outlined">tune</span>
            Filters
            {hasActiveFilters && <span className="filter-badge">✓</span>}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-group">
              <label htmlFor="date-from">From Date</label>
              <input
                id="date-from"
                type="date"
                className="filter-input"
                value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="date-to">To Date</label>
              <input
                id="date-to"
                type="date"
                className="filter-input"
                value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="confidence-min">
                Min Confidence: {confidenceMin}%
              </label>
              <input
                id="confidence-min"
                type="range"
                className="filter-slider"
                min="0"
                max="100"
                value={confidenceMin}
                onChange={(e) => setConfidenceMin(parseInt(e.target.value))}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="confidence-max">
                Max Confidence: {confidenceMax}%
              </label>
              <input
                id="confidence-max"
                type="range"
                className="filter-slider"
                min="0"
                max="100"
                value={confidenceMax}
                onChange={(e) => setConfidenceMax(parseInt(e.target.value))}
              />
            </div>

            {hasActiveFilters && (
              <button
                className="btn-reset-filters"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="history-main">
        {error && (
          <div className="error-banner" role="alert">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
          </div>
        )}

        <SignatureHistoryTable
          verifications={verifications}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
          onView={handleView}
          loading={loading}
          error={error}
        />
      </main>

      {/* View Modal */}
      {showViewModal && selectedVerification && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verification Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowViewModal(false)}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <label>Filename</label>
                <p>{selectedVerification.name}</p>
              </div>

              <div className="detail-section">
                <label>Date & Time</label>
                <p>
                  {new Date(selectedVerification.created_at).toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>

              <div className="detail-section">
                <label>Confidence Score</label>
                <p>
                  <strong>{selectedVerification.confidence.toFixed(2)}%</strong>
                  <span className={`confidence-badge ${selectedVerification.confidence >= 70 ? 'high' : selectedVerification.confidence >= 50 ? 'medium' : 'low'}`}>
                    {selectedVerification.confidence >= 70 ? 'High' : selectedVerification.confidence >= 50 ? 'Medium' : 'Low'}
                  </span>
                </p>
              </div>

              {selectedVerification.details && (
                <div className="detail-section">
                  <label>Additional Details</label>
                  <pre className="details-text">{JSON.stringify(selectedVerification.details, null, 2)}</pre>
                </div>
              )}

              <div className="detail-section">
                <label>Signature Preview</label>
                <div className="signature-preview">
                  {selectedVerification.signature?.signature_data ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && selectedVerification.signature?.signature_data) {
                          const ctx = canvas.getContext('2d')
                          ctx.fillStyle = '#ffffff'
                          ctx.fillRect(0, 0, canvas.width, canvas.height)
                          
                          // Lazy import to avoid issues
                          import('../utils/signatureRenderer').then(({ drawSignature, getSignatureBoundingBox, calculateScale }) => {
                            const bbox = getSignatureBoundingBox(selectedVerification.signature.signature_data)
                            const { scale, offsetX, offsetY } = calculateScale(bbox, canvas.width, canvas.height, 20)
                            drawSignature(ctx, selectedVerification.signature.signature_data, {
                              lineColor: '#006398',
                              lineWidth: 2,
                              scale,
                              offsetX,
                              offsetY
                            })
                          })
                        }
                      }}
                      width={400}
                      height={300}
                      className="modal-canvas"
                    />
                  ) : (
                    <p className="no-data">No signature data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SignatureHistory
