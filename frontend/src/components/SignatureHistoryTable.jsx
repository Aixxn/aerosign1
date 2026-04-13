import SignatureHistoryRow from './SignatureHistoryRow'

/**
 * SignatureHistoryTable Component
 * 
 * Displays the signature verification history in a table format
 * Handles pagination display and row rendering
 * 
 * Props:
 * - verifications: Array of verification records to display
 * - totalCount: Total number of records in database
 * - page: Current page number (1-indexed)
 * - pageSize: Number of records per page
 * - onPageChange: Callback for pagination
 * - onDelete: Callback for delete action
 * - onView: Callback for view action
 * - loading: Loading state
 * - error: Error message (if any)
 */
export function SignatureHistoryTable({
  verifications = [],
  totalCount = 0,
  page = 1,
  pageSize = 50,
  onPageChange = () => {},
  onDelete = async () => {},
  onView = () => {},
  loading = false,
  error = null
}) {
  // Calculate pagination info
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalCount)

  // Determine if we're on the last page
  const isLastPage = page >= totalPages

  // Loading state - show skeleton rows
  if (loading && verifications.length === 0) {
    return (
      <div className="signature-history-table-container">
        <table className="signature-history-table">
          <thead>
            <tr>
              <th className="header-thumbnail">Signature</th>
              <th className="header-filename">Filename</th>
              <th className="header-datetime">Date & Time</th>
              <th className="header-confidence">Confidence</th>
              <th className="header-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="skeleton-row">
                <td colSpan="5">
                  <div className="skeleton-loader"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Empty state
  if (verifications.length === 0 && !loading) {
    return (
      <div className="signature-history-table-container">
        <div className="empty-state">
          <span className="material-symbols-outlined empty-icon">folder_open</span>
          <h3>No signature verifications yet</h3>
          <p>Start by capturing and verifying signatures to see your history</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="signature-history-table-container">
        <div className="error-state">
          <span className="material-symbols-outlined error-icon">error</span>
          <h3>Error loading history</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="signature-history-table-container">
      <table className="signature-history-table">
        <thead>
          <tr>
            <th className="header-thumbnail">Signature</th>
            <th className="header-filename">Filename</th>
            <th className="header-datetime">Date & Time</th>
            <th className="header-confidence">Confidence</th>
            <th className="header-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {verifications.map((verification) => (
            <SignatureHistoryRow
              key={verification.id}
              verification={verification}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </tbody>
      </table>

      {/* Pagination Footer */}
      <div className="pagination-footer">
        <div className="pagination-info">
          {totalCount === 0 ? (
            <span>No records</span>
          ) : (
            <span>
              Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of <strong>{totalCount}</strong> entries
            </span>
          )}
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn prev-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined">chevron_left</span>
            Previous
          </button>

          <div className="pagination-numbers">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = i + 1
              const isActive = pageNum === page
              
              return (
                <button
                  key={pageNum}
                  className={`page-number ${isActive ? 'active' : ''}`}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            className="pagination-btn next-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage || loading}
            aria-label="Next page"
          >
            Next
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureHistoryTable
