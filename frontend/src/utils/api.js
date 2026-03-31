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

