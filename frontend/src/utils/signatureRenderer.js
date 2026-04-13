/**
 * Utility functions for rendering signatures on canvas
 */

/**
 * Draw signature points on canvas
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} signatureData - Array of [x, y, timestamp] points
 * @param {Object} options - Rendering options
 */
export function drawSignature(ctx, signatureData, options = {}) {
  if (!ctx || !signatureData || signatureData.length === 0) {
    return
  }

  const {
    lineColor = '#006398',
    lineWidth = 2,
    lineCap = 'round',
    lineJoin = 'round',
    scale = 1,
    offsetX = 0,
    offsetY = 0
  } = options

  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Set drawing style
  ctx.strokeStyle = lineColor
  ctx.lineWidth = lineWidth
  ctx.lineCap = lineCap
  ctx.lineJoin = lineJoin

  // Draw signature strokes
  let isDrawing = false

  for (let i = 0; i < signatureData.length; i++) {
    const point = signatureData[i]

    if (!Array.isArray(point) || point.length < 2) {
      continue
    }

    const x = point[0] * scale + offsetX
    const y = point[1] * scale + offsetY

    if (i === 0) {
      // Start new stroke
      ctx.beginPath()
      ctx.moveTo(x, y)
      isDrawing = true
    } else {
      const prevPoint = signatureData[i - 1]
      // Check if there's a significant gap (lift pen)
      if (prevPoint && Array.isArray(prevPoint) && prevPoint.length >= 2) {
        const prevX = prevPoint[0] * scale + offsetX
        const prevY = prevPoint[1] * scale + offsetY
        const distance = Math.hypot(x - prevX, y - prevY)

        // If distance is too large, it's a new stroke
        if (distance > 50) {
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
          ctx.stroke()
        }
      }
    }
  }

  // Complete final stroke
  if (isDrawing) {
    ctx.stroke()
  }
}

/**
 * Calculate bounding box of signature to determine optimal scaling
 * 
 * @param {Array} signatureData - Array of [x, y, timestamp] points
 * @returns {Object} Bounding box {minX, minY, maxX, maxY, width, height}
 */
export function getSignatureBoundingBox(signatureData) {
  if (!signatureData || signatureData.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of signatureData) {
    if (Array.isArray(point) && point.length >= 2) {
      const x = point[0]
      const y = point[1]

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  // Handle case where all points are the same
  if (minX === maxX) maxX = minX + 1
  if (minY === maxY) maxY = minY + 1

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Calculate scale factor to fit signature within canvas bounds with padding
 * 
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} signatureWidth - Signature bounding box width
 * @param {number} signatureHeight - Signature bounding box height
 * @param {number} padding - Padding around signature
 * @returns {number} Scale factor
 */
export function calculateScale(
  canvasWidth,
  canvasHeight,
  signatureWidth,
  signatureHeight,
  padding = 10
) {
  const availableWidth = canvasWidth - padding * 2
  const availableHeight = canvasHeight - padding * 2

  const scaleX = availableWidth / signatureWidth
  const scaleY = availableHeight / signatureHeight

  return Math.min(scaleX, scaleY, 1) // Don't scale up, only down
}

/**
 * Render signature to thumbnail canvas (optimized for performance)
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} signatureData - Array of [x, y, timestamp] points
 * @param {Object} options - Rendering options
 */
export function renderSignatureThumbnail(canvas, signatureData, options = {}) {
  if (!canvas || !signatureData || signatureData.length === 0) {
    return
  }

  const ctx = canvas.getContext('2d')
  const padding = options.padding || 5

  // Get bounding box
  const bbox = getSignatureBoundingBox(signatureData)

  // Calculate scale
  const scale = calculateScale(
    canvas.width,
    canvas.height,
    bbox.width,
    bbox.height,
    padding
  )

  // Calculate offset to center signature
  const offsetX = padding - bbox.minX * scale
  const offsetY = padding - bbox.minY * scale

  // Draw with calculated scale and offset
  drawSignature(ctx, signatureData, {
    ...options,
    scale,
    offsetX,
    offsetY,
    lineWidth: options.lineWidth || 1.5
  })
}

/**
 * Export canvas as PNG blob
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Promise<Blob>} PNG blob
 */
export function exportCanvasPNG(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to export canvas'))
        }
      },
      'image/png'
    )
  })
}

/**
 * Download canvas as PNG file
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - Filename for download
 */
export function downloadCanvasPNG(canvas, filename = 'signature.png') {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 'image/png')
}
