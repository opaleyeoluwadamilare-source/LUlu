import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { getPool } from './db'

export interface PhoneValidationResult {
  isValid: boolean
  formatted: string | null
  error: string | null
  method?: string // Track which validation method succeeded
}

/**
 * IMPROVED: Validates and formats phone number using multiple strategies
 * Tries different parsing approaches to maximize success rate
 * Supports international numbers and US numbers
 */
export function validatePhoneNumber(phone: string, defaultCountry: string = 'US'): PhoneValidationResult {
  // Strategy 1: Try as-is
  const result1 = tryValidation(phone, defaultCountry, 'as-is')
  if (result1.isValid) return result1
  
  // Strategy 2: Try with cleaned input
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  const result2 = tryValidation(cleaned, defaultCountry, 'cleaned')
  if (result2.isValid) return result2
  
  // Strategy 3: Try adding +1 if missing (common US case)
  if (!cleaned.startsWith('+')) {
    const withPlus = '+' + cleaned.replace(/^\+/, '')
    const result3 = tryValidation(withPlus, defaultCountry, 'with-plus')
    if (result3.isValid) return result3
    
    // Strategy 4: Try adding +1 specifically for US
    if (!cleaned.startsWith('1')) {
      const withUS = '+1' + cleaned.replace(/^\+?1?/, '')
      const result4 = tryValidation(withUS, defaultCountry, 'with-+1')
      if (result4.isValid) return result4
    }
  }
  
  // Strategy 5: Try extracting just digits and adding +1
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.length === 10) {
    // Exactly 10 digits - likely US number without country code
    const withCountryCode = '+1' + digitsOnly
    const result5 = tryValidation(withCountryCode, defaultCountry, 'digits-only-+1')
    if (result5.isValid) return result5
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // 11 digits starting with 1 - US number with country code but no +
    const withPlus = '+' + digitsOnly
    const result6 = tryValidation(withPlus, defaultCountry, 'digits-only-with-plus')
    if (result6.isValid) return result6
  }
  
  // All strategies failed - return the most informative error
  return {
    isValid: false,
    formatted: null,
    error: `Phone validation failed. Tried: as-is, cleaned, +, +1, digits-only. Original: "${phone}"`,
    method: 'all-failed'
  }
}

/**
 * Helper: Try to validate phone number with specific format
 */
function tryValidation(phone: string, defaultCountry: string, method: string): PhoneValidationResult {
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry)
    
    if (!phoneNumber) {
      return {
        isValid: false,
        formatted: null,
        error: `Parse failed (${method})`,
        method
      }
    }
    
    // Check if it's a valid phone number
    if (!isValidPhoneNumber(phoneNumber.number)) {
      return {
        isValid: false,
        formatted: null,
        error: `Invalid format (${method})`,
        method
      }
    }
    
    // Format in E.164 format (required by Vapi)
    const formatted = phoneNumber.format('E.164') // +1234567890
    
    return {
      isValid: true,
      formatted,
      error: null,
      method
    }
  } catch (error: any) {
    // This strategy didn't work, but don't log as error - it's expected
    return {
      isValid: false,
      formatted: null,
      error: error.message || `Validation failed (${method})`,
      method
    }
  }
}

/**
 * IMPROVED: Validates phone during signup and updates database
 * Now logs validation attempts for better debugging
 */
export async function validateAndStorePhone(customerId: number, phone: string): Promise<PhoneValidationResult> {
  const validation = validatePhoneNumber(phone)
  const pool = getPool()
  
  // Log validation result for monitoring
  console.log('📞 Phone validation:', {
    customerId,
    originalPhone: phone,
    isValid: validation.isValid,
    formattedPhone: validation.formatted,
    method: validation.method,
    error: validation.error
  })
  
  // Store validation result in database
  await pool.query(
    `UPDATE customers 
     SET phone_validated = $1, 
         phone_validation_error = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [validation.isValid, validation.error, customerId]
  )
  
  // If valid, update phone to formatted version (E.164)
  if (validation.isValid && validation.formatted) {
    await pool.query(
      `UPDATE customers SET phone = $1 WHERE id = $2`,
      [validation.formatted, customerId]
    )
    
    console.log(`✅ Phone validated and formatted for customer ${customerId}:`, {
      original: phone,
      formatted: validation.formatted,
      method: validation.method
    })
  } else {
    console.error(`❌ Phone validation failed for customer ${customerId}:`, {
      phone,
      error: validation.error,
      method: validation.method
    })
  }
  
  return validation
}

