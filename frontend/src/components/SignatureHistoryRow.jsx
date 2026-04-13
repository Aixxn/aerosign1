import { useState } from 'react'
import SignatureThumbnail from './SignatureThumbnail'
import { downloadCanvasPNG } from '../utils/signatureRenderer'


export function SignatureHistoryRow({ verification, onDelete, onView }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!verification) {
    return null
  }

  const { 
    id, 
    name = 'Verification', 
    created_at, 
    signature = {} 
  } = verification

  // Parse created_at to get formatted date and time
  const verificationDate = new Date(created_at)
  const dateStr = verificationDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  const timeStr = verificationDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  // Get signature data for thumbnail
  const signatureData = signature?.signature_data || []

  // Handle share action - export signature as PNG
  const handleShare = async () => {
    try {
      setSharing(true)
      
      // Create a temporary canvas to export
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 400
      tempCanvas.height = 300
      
      // Draw signature on temp canvas
      const ctx = tempCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 300)
      
      // Import at runtime to avoid issues
      const { drawSignature, getSignatureBoundingBox, calculateScale } = await import('../utils/signatureRenderer')
      
      const bbox = getSignatureBoundingBox(signatureData)
      const { scale, offsetX, offsetY } = calculateScale(bbox, 400, 300, 20)
      
      drawSignature(ctx, signatureData, {
        lineColor: '#006398',
        lineWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
        scale,
        offsetX,
        offsetY
      })
      
      // Download the PNG
      downloadCanvasPNG(tempCanvas, `${name}.png`)
    } catch (err) {
      console.error('Error sharing signature:', err)
      alert('Failed to export signature')
    } finally {
      setSharing(false)
    }
  }

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    try {
      setDeleting(true)
      await onDelete(id)
      setDeleteConfirm(false)
    } catch (err) {
      console.error('Error deleting verification:', err)
      alert('Failed to delete verification')
      setDeleting(false)
    }
  }

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirm(false)
  }

  return (
    <tr className="signature-history-row">
      {/* Thumbnail */}
      <td className="cell-thumbnail">
        <div className="thumbnail-container">
          <SignatureThumbnail 
            signatureData={signatureData}
            width={90}
            height={60}
            borderRadius="var(--radius-md)"
          />
        </div>
      </td>

      {/* Filename */}
      <td className="cell-filename">
        <span className="filename" title={name}>
          {name}
        </span>
      </td>

      {/* Date & Time */}
      <td className="cell-datetime">
        <div className="datetime-container">
          <span className="date">{dateStr}</span>
          <span className="time">{timeStr}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="cell-actions">
        <div className="actions-container">
          {/* View button */}
          <button
            className="action-btn view-btn"
            onClick={() => onView(verification)}
            title="View details"
            aria-label="View verification details"
            disabled={deleteConfirm}
          >
            <span className="material-symbols-outlined">visibility</span>
          </button>

          {/* Share button */}
          <button
            className="action-btn share-btn"
            onClick={handleShare}
            title="Download signature as PNG"
            aria-label="Download signature"
            disabled={deleteConfirm || sharing}
          >
            <span className="material-symbols-outlined">
              {sharing ? 'hourglass_bottom' : 'download'}
            </span>
          </button>

          {/* Delete button - with confirmation */}
          {!deleteConfirm ? (
            <button
              className="action-btn delete-btn"
              onClick={handleDelete}
              title="Delete verification"
              aria-label="Delete verification"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          ) : (
            <div className="delete-confirm">
              <button
                className="confirm-yes"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Confirm delete"
              >
                {deleting ? '...' : 'Yes'}
              </button>
              <button
                className="confirm-no"
                onClick={handleCancelDelete}
                disabled={deleting}
                aria-label="Cancel delete"
              >
                No
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default SignatureHistoryRow
