// Scoring engine for matching inbound EVC transactions to a pending POS sale.
//
// Signals used:
//   Amount match  — up to 50 pts  (exact = 50, ≤$0.50 = 35, ≤$2 = 15)
//   Time proximity — up to 30 pts  (≤30s = 30, ≤90s = 20, ≤180s = 10)
//   Known phone   — 25 pts bonus   (sender is a known pos_customer phone)
//
// Confidence thresholds:
//   high   ≥ 70 pts
//   medium ≥ 35 pts
//   low    < 35 pts

export interface RawTransaction {
  id: string
  tran_id: string
  amount: number
  sender_name: string | null
  sender_phone: string | null
  tran_date: string
}

export interface ScoredTransaction extends RawTransaction {
  score: number
  confidence: 'high' | 'medium' | 'low'
  secondsAgo: number   // seconds between tran_date and saleInitiatedAt (negative = came in after)
}

export function scoreTransactions(
  transactions: RawTransaction[],
  expectedAmount: number,
  saleInitiatedAt: Date,
  knownPhones: string[] = [],
): ScoredTransaction[] {
  const scored = transactions.map(tx => {
    let score = 0
    const txTime = new Date(tx.tran_date)
    const secondsAgo = (saleInitiatedAt.getTime() - txTime.getTime()) / 1000

    // Amount scoring
    const diff = Math.abs(tx.amount - expectedAmount)
    if (diff === 0)      score += 50
    else if (diff <= 0.5) score += 35
    else if (diff <= 2)   score += 15

    // Time proximity (works both ways — customer may pay slightly before or after cashier opens checkout)
    const absSeconds = Math.abs(secondsAgo)
    if (absSeconds <= 30)       score += 30
    else if (absSeconds <= 90)  score += 20
    else if (absSeconds <= 180) score += 10

    // Known customer phone bonus
    if (tx.sender_phone) {
      const normalized = tx.sender_phone.replace(/\s+/g, '')
      if (knownPhones.some(p => p.replace(/\s+/g, '') === normalized)) {
        score += 25
      }
    }

    const confidence: 'high' | 'medium' | 'low' =
      score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low'

    return { ...tx, score, confidence, secondsAgo }
  })

  // Sort: higher score first, then more recent first as tiebreaker
  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return Math.abs(a.secondsAgo) - Math.abs(b.secondsAgo)
  })
}
