/**
 * Utility to sanitize raw RFID scans from keyboard-wedge hardware readers.
 * Many card scanners / magnetic stripe readers wrap numeric IDs in sentinel characters:
 * e.g., ";4234838479?", "?4234838479", or URL-encoded "%3B4234838479%3F".
 */
export function sanitizeRfid(rawInput: string | null | undefined): string {
  if (!rawInput) return "";

  let cleaned = decodeURIComponent(rawInput.trim());

  // Strip Track-2 delimiters: ; (start sentinel), ? (end sentinel), and control characters
  cleaned = cleaned.replace(/[;?+=%\r\n\t]/g, "").trim();

  return cleaned;
}
