// Timezone conversion utilities

export interface TimezoneInfo {
  value: string
  label: string
}

export const TIMEZONE_OPTIONS: TimezoneInfo[] = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
]

/**
 * Convert a call time to user's local timezone
 * @param callTime - Time string like "7:00am" or "7am"
 * @param timezone - IANA timezone string
 * @returns Formatted time string with timezone
 */
export function convertToUserTimezone(
  callTime: string,
  timezone: string
): string {
  try {
    // Extract hour from call time (e.g., "7am" -> 7, "7:00am" -> 7)
    const timeMatch = callTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
    if (!timeMatch) return callTime

    const hour = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3].toLowerCase()

    // Convert to 24-hour format
    let hour24 = hour
    if (period === 'pm' && hour !== 12) hour24 += 12
    if (period === 'am' && hour === 12) hour24 = 0

    // Get timezone label
    const tzInfo = TIMEZONE_OPTIONS.find(tz => tz.value === timezone)
    const tzLabel = tzInfo?.label || 'ET'

    // Format time
    const formattedHour = hour24 % 12 || 12
    const formattedMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''
    const formattedPeriod = hour24 >= 12 ? 'pm' : 'am'

    return `${formattedHour}${formattedMinutes}${formattedPeriod} ${tzLabel}`
  } catch (error) {
    console.error('Error converting timezone:', error)
    return callTime
  }
}

/**
 * Calculate hours until next call
 * @param callTime - Time string like "7am"
 * @param timezone - IANA timezone string
 * @returns Hours until call
 */
export function getHoursUntilCall(
  callTime: string,
  timezone: string
): number {
  try {
    const timeMatch = callTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
    if (!timeMatch) return 0

    const hour = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3].toLowerCase()

    // Convert to 24-hour format
    let hour24 = hour
    if (period === 'pm' && hour !== 12) hour24 += 12
    if (period === 'am' && hour === 12) hour24 = 0

    // Get tomorrow's date at the call time in the specified timezone
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(hour24, minutes, 0, 0)

    // Convert to user's local time
    const userTime = new Date(tomorrow.toLocaleString('en-US', { timeZone: timezone }))
    const localTime = new Date()

    // Calculate difference in hours
    const diffMs = userTime.getTime() - localTime.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    return diffHours > 0 ? diffHours : diffHours + 24
  } catch (error) {
    console.error('Error calculating hours until call:', error)
    return 0
  }
}

/**
 * Format call time with timezone conversion message
 * @param callTime - Time string like "7am"
 * @param timezone - IANA timezone string
 * @param userTimezone - User's IANA timezone string
 * @returns Formatted string with conversion
 */
export function formatCallTimeWithConversion(
  callTime: string,
  timezone: string,
  userTimezone?: string
): string {
  const baseTime = convertToUserTimezone(callTime, timezone)
  
  if (userTimezone && userTimezone !== timezone) {
    // Convert to user's timezone
    const userTime = convertToUserTimezone(callTime, userTimezone)
    const tzInfo = TIMEZONE_OPTIONS.find(tz => tz.value === timezone)
    const tzLabel = tzInfo?.label || 'ET'
    return `${baseTime} (that's ${userTime} for you)`
  }
  
  return baseTime
}

