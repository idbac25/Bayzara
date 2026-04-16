/**
 * Parser for Hormuud EVC Plus SMS notifications.
 *
 * Common formats observed (Somali):
 *   "[-EVCPLUS-] waxaad $10 ka heshay 0613229925, Tar: 15/04/26 10:59:34 haraagagu waa $34.58"
 *   "[-EVCPLUS-] waxaad $5 u dirtay 0612345678, Tar: 15/04/26 11:02:11 haraagagu waa $29.58"
 *
 * Direction phrases:
 *   "ka heshay"   = received from   (incoming)
 *   "u dirtay"    = sent to         (outgoing)
 *   "ka qaadatay" = withdrew from   (outgoing — ATM/agent)
 *   "ka bixiyey"  = paid to         (outgoing — bill)
 *
 * Tolerant of spacing / casing variants, EN/SO mixing, currency $ or USD.
 */

export type ParsedDirection = 'in' | 'out' | 'unknown'

export interface ParsedEvcSms {
  direction: ParsedDirection
  amount: number | null
  currency: string
  counterparty_phone: string | null
  balance_after: number | null
  occurred_at: string | null   // ISO
  raw: string
  matched_pattern: string | null
}

const INCOMING_PATTERNS = [
  /waxaad\s+\$?\s*([\d.,]+)\s+(?:USD\s+)?ka\s+heshay\s+(\+?\d{8,})/i,
  /received\s+\$?\s*([\d.,]+)\s+from\s+(\+?\d{8,})/i,
]

const OUTGOING_PATTERNS = [
  /waxaad\s+\$?\s*([\d.,]+)\s+(?:USD\s+)?u\s+dirtay\s+(\+?\d{8,})/i,
  /waxaad\s+\$?\s*([\d.,]+)\s+(?:USD\s+)?ka\s+qaadatay\s+(\+?\d{8,})/i,
  /waxaad\s+\$?\s*([\d.,]+)\s+(?:USD\s+)?ka\s+bixiyey\s+(\+?\d{8,})/i,
  /sent\s+\$?\s*([\d.,]+)\s+to\s+(\+?\d{8,})/i,
]

const BALANCE_PATTERNS = [
  /haraagagu\s+waa\s+\$?\s*([\d.,]+)/i,
  /balance(?:\s+is)?\s+\$?\s*([\d.,]+)/i,
]

// Tar: 15/04/26 10:59:34   (DD/MM/YY HH:MM:SS)
const DATE_PATTERN = /(?:tar(?:iikh)?|date)[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i

function num(s: string | undefined): number | null {
  if (!s) return null
  const cleaned = s.replace(/,/g, '').trim()
  const v = parseFloat(cleaned)
  return Number.isFinite(v) ? v : null
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  // Somali numbers are typically 9-10 digits with leading 0; preserve leading 0.
  // Strip +252 country code if present.
  if (digits.startsWith('+252')) return '0' + digits.slice(4)
  if (digits.startsWith('252') && digits.length >= 11) return '0' + digits.slice(3)
  return digits
}

function parseOccurredAt(text: string): string | null {
  const m = text.match(DATE_PATTERN)
  if (!m) return null
  const [, dd, mm, yyRaw, hh, mi, ss] = m
  const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw
  // EAT = UTC+3 (Somalia)
  const iso = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${mi}:${ss ?? '00'}+03:00`
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

export function parseEvcSms(raw: string): ParsedEvcSms {
  const text = raw.trim()
  let direction: ParsedDirection = 'unknown'
  let amount: number | null = null
  let counterparty: string | null = null
  let matched: string | null = null

  for (const re of INCOMING_PATTERNS) {
    const m = text.match(re)
    if (m) {
      direction = 'in'
      amount = num(m[1])
      counterparty = normalizePhone(m[2])
      matched = re.source
      break
    }
  }

  if (direction === 'unknown') {
    for (const re of OUTGOING_PATTERNS) {
      const m = text.match(re)
      if (m) {
        direction = 'out'
        amount = num(m[1])
        counterparty = normalizePhone(m[2])
        matched = re.source
        break
      }
    }
  }

  let balance: number | null = null
  for (const re of BALANCE_PATTERNS) {
    const m = text.match(re)
    if (m) {
      balance = num(m[1])
      break
    }
  }

  const currency = /USD|\$/.test(text) ? 'USD' : 'SOS'

  return {
    direction,
    amount,
    currency,
    counterparty_phone: counterparty,
    balance_after: balance,
    occurred_at: parseOccurredAt(text),
    raw: text,
    matched_pattern: matched,
  }
}

/**
 * Quick check: does this look like an EVC payment SMS at all?
 * Used by the APK regex filter before forwarding.
 */
export function isLikelyEvcSms(raw: string): boolean {
  return /\bEVCPLUS\b|waxaad\s+.+(ka heshay|u dirtay|ka qaadatay|ka bixiyey)/i.test(raw)
}
