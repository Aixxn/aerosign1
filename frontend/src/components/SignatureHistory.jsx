import { useState, useEffect } from 'react'
import { useSignatureHistory } from '../hooks/useSignatureHistory'
import SignatureHistoryTable from './SignatureHistoryTable'
import './SignatureHistory.css'

export function SignatureHistory({ onBack, userId, user, onFAQ, onSignOut }) {
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
    loading,
    error,
    setPage,
    deleteVerification,
    exportVerification
  } = useSignatureHistory(userId)

  // UI state for filters and modal
  const [showFilters, setShowFilters] = useState(false)
  const [selectedVerification, setSelectedVerification] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

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
    console.log('[SignatureHistory] Viewing verification:', verification)
    console.log('[SignatureHistory] Signature data available:', !!verification.signature?.signature_data)
    console.log('[SignatureHistory] Signature data points:', verification.signature?.signature_data?.length || 0)
    setSelectedVerification(verification)
    setShowViewModal(true)
  }

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setDateFrom(null)
    setDateTo(null)
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery || dateFrom || dateTo

  return (
    <div className="signature-history-page">
      {/* Header */}
      <header className="signature-header">
        <nav className="signature-nav">
          <div className="logo">AeroSign</div>
          <div className="nav-links desktop-only">
            <button 
              className="nav-link-btn" 
              onClick={onBack}
              title="Back to signature capture"
              aria-label="Go to signature capture"
            >
              Capture
            </button>
            <a href="#" className="nav-link active">History</a>
          </div>
          <div className="nav-icons">
            <button 
              className="icon-btn" 
              title="FAQ & Help" 
              aria-label="FAQ and help"
              onClick={onFAQ}
            >
              <span className="material-symbols-outlined">help</span>
            </button>
            <button 
              className="icon-btn" 
              title="Account" 
              aria-label="Account menu"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>
            {showAccountMenu && (
              <div className="account-dropdown">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false)
                    // Navigate to settings - you can add onSettings prop
                  }}
                >
                  <span className="material-symbols-outlined">settings</span>
                  Settings
                </button>
                <button 
                  className="dropdown-item logout"
                  onClick={() => {
                    setShowAccountMenu(false)
                    onSignOut()
                  }}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Search and Filters Header */}
      <div className="history-search-header">
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
      </div>

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
                          console.log('[SignatureHistory] Rendering signature with', selectedVerification.signature.signature_data.length, 'points')
                          const ctx = canvas.getContext('2d')
                          ctx.fillStyle = '#ffffff'
                          ctx.fillRect(0, 0, canvas.width, canvas.height)
                          
                          // Lazy import to avoid issues
                          import('../utils/signatureRenderer').then(({ drawSignature, getSignatureBoundingBox, calculateScale }) => {
                            const bbox = getSignatureBoundingBox(selectedVerification.signature.signature_data)
                            console.log('[SignatureHistory] Bounding box:', bbox)
                            const { scale, offsetX, offsetY } = calculateScale(bbox, canvas.width, canvas.height, 20)
                            console.log('[SignatureHistory] Scale:', scale, 'Offset:', offsetX, offsetY)
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
