import t from "./translation";

/**
 * Converts an ISO 8601 date string to a "YYYY-MM-DD" formatted string.
 *
 * @param {string} dateISOString - full date string in ISO 8601 format, e.g. "2024-01-01T00:00:00+01:00".
 * @returns {string} - date formatted as "YYYY-MM-DD".
 */
export function parseISOToDateString(dateISOString: string): string {
  const dateObj = new Date(dateISOString);
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dateObj.getDate()).padStart(2, "0")}`;
}

/**
 * Converts an ISO 8601 date string to a "HH:mm" formatted string.
 *
 * @param {string} dateISOString - full date string in ISO 8601 format, e.g. "2024-01-01T00:00:00+01:00".
 * @returns {string} - time formatted as "HH:mm".
 */
export function parseISOToTimeString(dateISOString: string): string {
  const dateObj = new Date(dateISOString);
  return `${String(dateObj.getHours()).padStart(2, "0")}:${String(
    dateObj.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * Converts separate date and time strings into a full ISO 8601 date string.
 *
 * @param {string} dateStr - date in "YYYY-MM-DD" format.
 * @param {string} timeStr - time in "HH:mm" format (24-hour clock).
 * @returns {string} - combined ISO 8601 date string, e.g. "2024-01-01T00:00:00+01:00".
 */
export function formatDateTimeStringsToISOString(
  dateStr: string,
  timeStr: string
): string {
  return formatDateToISOString(new Date(`${dateStr}T${timeStr}`));
}

/**
 * Converts date into an ISO 8601 date-time string.
 *
 * @param {Date} date - date
 * @returns {string} - combined ISO 8601 date string, e.g. "2024-01-01T00:00:00+01:00".
 */
export function formatDateToISOString(date: Date): string {
  // Define local time components separately
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  // Calculate time zone offset
  const offset = -date.getTimezoneOffset(); // if negative, then for UTC+
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(
    2,
    "0"
  );
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const timezone = `${sign}${offsetHours}:${offsetMinutes}`;

  const isoDateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
  return isoDateString;
}

/**
 * Returns re-formatted datetime-information.
 * @param dt ISO-datetime string, e.g. "2024-01-01T00:00:00+01:00"
 * @param timeMode object with booleans showTime and devMode
 * @returns formatted datetime-information.
 */
export function reformatDatetime(
  dt?: string,
  timeMode?: { showTime?: boolean; devMode?: boolean }
): string {
  if (!dt) return "-";

  const date = new Date(dt);
  if (isNaN(date.getTime())) return "?";
  // Define local time components separately
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  if (timeMode?.devMode) {
    return `${day}.${month}.${year}, ${hour}:${minute}:${second}`;
  }

  if (timeMode?.showTime) {
    return `${day}.${month}.${year}, ${hour}:${minute} ${t("Uhr")}`;
  }

  return `${day}.${month}.${year}`;
}

/**
 * Formats time information into a 24-hour time format string (HH:MM).
 * @param hours number of hours (0-23)
 * @param minutes number of minutes (0-59)
 * @returns formatted time string
 */
export function formatTime24(hours: number, minutes: number): string {
  return ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2);
}
