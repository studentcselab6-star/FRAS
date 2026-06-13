// Validation utilities for form inputs

/**
 * Validates Indian mobile number (10 digits, starts with 6-9)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s+/g, '')
  return /^[6-9]\d{9}$/.test(cleaned)
}

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validates password strength
 * Requirements: min 6 chars, at least one uppercase, one lowercase, one number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 6) return false
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
}

/**
 * Returns password validation error message
 */
export const getPasswordError = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

/**
 * Validates required field
 */
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0
}

/**
 * Sanitizes string to prevent XSS
 */
export const sanitizeString = (str: string): string => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Formats phone number for display
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length !== 10) return phone
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
}

/**
 * Formats date for input field
 */
export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return ''
  return dateString.split('T')[0]
}