import axios from 'axios'

// Create axios instance with base URL pointing to backend
export const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    let errorMessage = 'An error occurred'
    let errorDetails = {}

    if (error.response) {
      // Server responded with error status
      errorMessage = error.response.data?.message || error.response.statusText
      errorDetails = error.response.data
      console.error('API Error:', {
        status: error.response.status,
        message: errorMessage,
        data: error.response.data
      })
    } else if (error.request) {
      // Request made but no response received
      errorMessage = 'No response from backend. Make sure the API is running on http://127.0.0.1:8000'
      console.error('No response from server:', error.request)
    } else {
      // Error in request setup
      errorMessage = error.message
      console.error('Error:', error.message)
    }

    // Enhance error object with additional info
    error.userMessage = errorMessage
    error.details = errorDetails
    
    return Promise.reject(error)
  }
)

// ============================================================================
// SIGNATURE STORAGE API FUNCTIONS
// ============================================================================

/**
 * Save a captured signature for a user
 * @param {string} userId - User identifier
 * @param {string} sessionId - Session identifier  
 * @param {Array} signatureData - Array of [x, y, timestamp] points
 * @param {Object} metadata - Optional metadata
 * @returns {Promise} API response with signature_id and success status
 */
export const saveSignature = async (userId, sessionId, signatureData, metadata = {}) => {
  const response = await apiClient.post('/api/signatures/save', {
    user_id: userId,
    session_id: sessionId,
    signature_data: signatureData,
    metadata: metadata
  })
  return response.data
}

/**
 * Get all saved signatures for a user
 * @param {string} userId - User identifier
 * @returns {Promise} API response with user's signatures
 */
export const getUserSignatures = async (userId) => {
  const response = await apiClient.get(`/api/users/${userId}/signatures`)
  return response.data
}

/**
 * Verify a signature against all of a user's saved signatures
 * @param {string} userId - User identifier
 * @param {Array} signatureData - Signature to verify
 * @param {number} thresholdOverride - Optional threshold override
 * @returns {Promise} API response with verification results
 */
export const verifyAgainstUser = async (userId, signatureData, thresholdOverride = null) => {
  const requestData = {
    signature_data: signatureData
  }
  
  if (thresholdOverride !== null) {
    requestData.threshold_override = thresholdOverride
  }
  
  const response = await apiClient.post(`/api/users/${userId}/verify`, requestData)
  return response.data
}

/**
 * Generate a session ID for the current browser session
 * @returns {string} Session identifier
 */
export const generateSessionId = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `web_${timestamp}_${random}`
}

