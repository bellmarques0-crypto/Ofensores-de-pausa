/**
 * Utility functions for parsing, normalization, and calculations
 */

/**
 * Normalizes an email address: trimmed, lowercase, stripped of invalid spaces
 */
export function normalizeEmail(email: any): string {
  if (!email) return '';
  return String(email)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Normalizes a username string
 */
export function normalizeUsername(user: any): string {
  if (user === null || user === undefined) return '';
  let str = String(user).trim().toLowerCase();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
}

/**
 * Normalizes column names for flexible matching
 * e.g. "Email do atendente" -> "emaildoatendente"
 * e.g. "Atendente entrou na chamada (Formatado)" -> "atendenteentrounachamadaformatado"
 */
export function normalizeColumnHeader(header: string): string {
  if (!header) return '';
  return String(header)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
}

/**
 * Parses time strings into seconds.
 * Supports:
 * - "00:05:30" -> 330
 * - "05:30" -> 330
 * - "5:30" -> 330
 * - "330" / 330 -> 330
 */
export function parseTimeToSeconds(timeInput: any): number {
  if (timeInput === null || timeInput === undefined || timeInput === '') return 0;

  if (typeof timeInput === 'number') {
    // If it's a fractional day from Excel (e.g., 0.00381944 = 5.5 mins)
    if (timeInput > 0 && timeInput < 1) {
      return Math.round(timeInput * 86400);
    }
    // If input is in milliseconds (> 86400 seconds = 24 hours)
    if (timeInput > 86400) {
      let inSec = Math.round(timeInput / 1000);
      if (inSec > 86400) {
        inSec = Math.round(inSec / 1000);
      }
      return Math.min(inSec, 86400);
    }
    return Math.round(timeInput);
  }

  const str = String(timeInput).trim();
  if (!str) return 0;

  // Pure number as string
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 0 && num < 1) {
      return Math.round(num * 86400);
    }
    if (num > 86400) {
      let inSec = Math.round(num / 1000);
      if (inSec > 86400) {
        inSec = Math.round(inSec / 1000);
      }
      return Math.min(inSec, 86400);
    }
    return Math.round(num);
  }

  // HH:MM:SS or MM:SS or H:M:S
  const parts = str.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    let total = Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (total > 86400) {
      total = Math.round(total / 1000);
    }
    return Math.min(total, 86400);
  } else if (parts.length === 2) {
    return Math.round(parts[0] * 60 + parts[1]);
  } else if (parts.length === 1) {
    return Math.round(parts[0]);
  }

  return 0;
}

/**
 * Helper to parse time string like "10:15:00" or "10:15" or "11/08/2026 10:15:00" into seconds from midnight
 */
export function parseTimeToSecondsFromFormattedStr(strInput: any): number {
  if (!strInput) return 0;
  let str = String(strInput).trim();
  if (!str) return 0;

  if (str.includes(' ')) {
    const spaceParts = str.split(/\s+/);
    str = spaceParts[spaceParts.length - 1];
  }

  const parts = str.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  } else if (parts.length === 2) {
    return Math.round(parts[0] * 3600 + parts[1] * 60);
  }
  return 0;
}

/**
 * Calculates accurate pause duration in seconds.
 * Prefers (fim - inicio) when available and valid.
 * Otherwise handles milliseconds and caps single pause at 24h.
 */
export function calculatePauseDurationSeconds(inicioStr: string, fimStr: string, tempoRaw?: any): number {
  if (inicioStr && fimStr) {
    const secInicio = parseTimeToSecondsFromFormattedStr(inicioStr);
    const secFim = parseTimeToSecondsFromFormattedStr(fimStr);
    if (secFim > secInicio) {
      const diff = secFim - secInicio;
      if (diff > 0 && diff <= 86400) {
        return diff;
      }
    }
  }

  return parseTimeToSeconds(tempoRaw);
}

/**
 * Formats seconds into HH:MM:SS string.
 * Preserves negative sign if seconds < 0 (e.g. -00:15:30)
 */
export function formatSecondsToHHMMSS(seconds: number): string {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00:00';
  
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(Math.round(seconds));

  const hrs = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  const formatted = `${hh}:${mm}:${ss}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses date string or Excel date value into ISO YYYY-MM-DD format
 * Handles DD/MM/YYYY, YYYY-MM-DD, DD/MM/YYYY HH:mm, etc.
 */
export function parseDateToISO(dateInput: any): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'number') {
    // Excel serial date
    const dateObj = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  const str = String(dateInput).trim();
  if (!str) return '';

  // Match DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Fallback to JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

/**
 * Parses timestamp string (e.g. "11/08/2026 19:56") into milliseconds epoch
 */
export function parseFormattedTimestampToMs(dateTimeStr: any): number {
  if (!dateTimeStr) return 0;

  if (typeof dateTimeStr === 'number') {
    // Excel serial datetime
    return Math.round((dateTimeStr - 25569) * 86400 * 1000);
  }

  const str = String(dateTimeStr).trim();
  if (!str) return 0;

  // Pattern: "DD/MM/YYYY HH:mm" or "DD/MM/YYYY HH:mm:ss"
  const brPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = str.match(brPattern);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;

    const date = new Date(year, month, day, hours, minutes, seconds);
    return date.getTime();
  }

  // Pattern: "YYYY-MM-DD HH:mm:ss"
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const matchIso = str.match(isoPattern);
  if (matchIso) {
    const year = parseInt(matchIso[1], 10);
    const month = parseInt(matchIso[2], 10) - 1;
    const day = parseInt(matchIso[3], 10);
    const hours = matchIso[4] ? parseInt(matchIso[4], 10) : 0;
    const minutes = matchIso[5] ? parseInt(matchIso[5], 10) : 0;
    const seconds = matchIso[6] ? parseInt(matchIso[6], 10) : 0;

    const date = new Date(year, month, day, hours, minutes, seconds);
    return date.getTime();
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
}

/**
 * Calculates duration in seconds between Nuvidio exit and entry timestamps
 */
export function calculateNuvidioDurationSeconds(entradaStr: string, saidaStr: string): number {
  const entradaMs = parseFormattedTimestampToMs(entradaStr);
  const saidaMs = parseFormattedTimestampToMs(saidaStr);

  if (!entradaMs || !saidaMs) return 0;

  const diffMs = saidaMs - entradaMs;
  return Math.max(0, Math.round(diffMs / 1000));
}

/**
 * Creates a unique hash/fingerprint for deduplication
 */
export function createFingerprint(...parts: string[]): string {
  return parts.map((p) => String(p || '').trim().toLowerCase()).join('||');
}
