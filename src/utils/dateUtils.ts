import { isValid, parseISO } from "date-fns";

/**
 * Safely parses a date string into a Date object.
 * Returns a valid Date object if the string is valid, otherwise returns null.
 * It handles ISO 8601 strings robustly.
 * Includes aggressive logging for debugging purposes.
 * @param dateString The date string to parse.
 * @returns A Date object or null.
 */
export const parseAndValidateDate = (dateString: string | null | undefined): Date | null => {
  // console.log(`[parseAndValidateDate] Received input: "${dateString}" (Type: ${typeof dateString})`);

  if (!dateString || (typeof dateString === 'string' && dateString.trim() === '')) {
    // console.log("[parseAndValidateDate] Input is null, undefined, or empty string. Returning null.");
    return null;
  }

  let date: Date;

  // Attempt to parse as ISO string first
  if (typeof dateString === 'string') {
    date = parseISO(dateString);
    if (isValid(date)) {
      // console.log(`[parseAndValidateDate] Successfully parsed as ISO: ${date.toISOString()}. Returning valid Date.`);
      return date;
    }
  }

  // Fallback to new Date() for other formats if parseISO fails, then validate
  // This can still produce "Invalid Date" if the string is truly unparseable by Date constructor
  try {
    date = new Date(dateString);
    if (isValid(date)) {
      // console.log(`[parseAndValidateDate] Successfully parsed with new Date(): ${date.toISOString()}. Returning valid Date.`);
      return date;
    }
  } catch (e) {
    // console.error(`[parseAndValidateDate] Error creating new Date(${dateString}):`, e);
  }

  // If neither method produced a valid date
  // console.warn(`[parseAndValidateDate] Failed to parse or validate date string: "${dateString}". Returning null.`);
  return null;
};