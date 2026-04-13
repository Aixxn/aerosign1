import { useEffect, useRef } from 'react'
import { drawSignature, getSignatureBoundingBox, calculateScale } from '../utils/signatureRenderer'

/**
 * SignatureThumbnail Component
 * 
 * Renders a signature on a canvas element with auto-scaling
 * Used in the signature history table for preview thumbnails
 * 
 * Props:
 * - signatureData: Array of [x, y, timestamp] points
 * - width: Canvas width (default: 120px)
 * - height: Canvas height (default: 80px)
 * - borderRadius: CSS border-radius (default: '4px')
 */
export function SignatureThumbnail({ 
  signatureData, 
  width = 120, 
  height = 80,
  borderRadius = '4px'
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !signatureData || signatureData.length === 0) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    
    // Scale context for high DPI displays
    ctx.scale(dpr, dpr)
    
    // Set white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Calculate bounding box for auto-scaling
    const bbox = getSignatureBoundingBox(signatureData)
    const { scale, offsetX, offsetY } = calculateScale(bbox, width, height, 8)

    // Draw the signature
    drawSignature(ctx, signatureData, {
      lineColor: '#006398',
      lineWidth: 1.5,
      lineCap: 'round',
      lineJoin: 'round',
      scale,
      offsetX,
      offsetY
    })
  }, [signatureData, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius,
        border: '1px solid var(--outline-variant)',
        backgroundColor: '#ffffff'
      }}
    />
  )
}

export default SignatureThumbnail
