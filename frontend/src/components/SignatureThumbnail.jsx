import { useEffect, useRef } from 'react'
import { drawSignature, getSignatureBoundingBox, calculateScale } from '../utils/signatureRenderer'

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
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    
    ctx.scale(dpr, dpr)
    
    // Set white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Calculate bounding box for auto-scaling
    const bbox = getSignatureBoundingBox(signatureData)
    
    // Increase padding to make signature smaller in thumbnail
    const padding = 15
    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2
    
    // Calculate scale to fit signature within available space
    const scaleX = availableWidth / bbox.width
    const scaleY = availableHeight / bbox.height
    const scale = Math.min(scaleX, scaleY, 1)
    
    // Calculate offset to center signature with padding
    const offsetX = padding - bbox.minX * scale
    const offsetY = padding - bbox.minY * scale

    drawSignature(ctx, signatureData, {
      lineColor: '#000000',
      lineWidth: 1,
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
