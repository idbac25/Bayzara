// Owner-authenticated. Generates a 6-digit pairing code for the APK.
// The APK exchanges this code for a long-lived device token at /api/sms/pair/complete.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

function sixDigitCode() {
  // Cryptographically random 6-digit string, zero-padded.
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000
  return n.toString().padStart(6, '0')
}

function bearerToken() {
  return randomBytes(32).toString('base64url')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, name } = await req.json()
  if (!business_id) {
    return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  }

  const expires = new Date(Date.now() + 10 * 60_000) // 10 minutes
  const code = sixDigitCode()

  const { data, error } = await supabase
    .from('sms_listener_devices')
    .insert({
      business_id,
      name: name?.trim() || null,
      device_token: bearerToken(),
      pairing_code: code,
      pairing_code_expires_at: expires.toISOString(),
      created_by: user.id,
    })
    .select('id, name, pairing_code, pairing_code_expires_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not create device' }, { status: 500 })
  }

  // QR payload: APK scans this to auto-fill the pairing code.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const qr = `bayzara-pair:${data.pairing_code}@${baseUrl}`

  return NextResponse.json({
    device_id: data.id,
    pairing_code: data.pairing_code,
    expires_at: data.pairing_code_expires_at,
    qr_payload: qr,
  })
}
