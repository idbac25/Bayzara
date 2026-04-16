// APK-facing. Receives an SMS body forwarded from a paired Android device.
// Authenticated by Bearer token (the device_token issued at /pair/complete).
//
// Pipeline:
//   1. Verify token → look up device + business
//   2. Parse SMS body using parseEvcSms()
//   3. Best-effort match counterparty_phone → pos_customers / vendors
//   4. Insert sms_events row (idempotent on raw_sms + occurred_at)
//   5. Update device.last_seen_at

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseEvcSms } from '@/lib/sms/parse-evc'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface IncomingPayload {
  raw_sms: string
  received_at?: string  // device-side timestamp; we store occurred_at parsed from body
  app_version?: string
}

function getBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

export async function POST(req: NextRequest) {
  const token = getBearer(req)
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  const body = await req.json() as IncomingPayload
  const raw = String(body.raw_sms ?? '').trim()
  if (!raw) {
    return NextResponse.json({ error: 'raw_sms required' }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Verify device
  const { data: device } = await supabase
    .from('sms_listener_devices')
    .select('id, business_id, paired_at, revoked_at')
    .eq('device_token', token)
    .maybeSingle()

  if (!device) {
    return NextResponse.json({ error: 'Invalid device token' }, { status: 401 })
  }
  if (!device.paired_at) {
    return NextResponse.json({ error: 'Device not yet paired' }, { status: 403 })
  }
  if (device.revoked_at) {
    return NextResponse.json({ error: 'Device revoked' }, { status: 403 })
  }

  // Parse
  const parsed = parseEvcSms(raw)

  // Best-effort match by phone
  let matched_customer_id: string | null = null
  let matched_vendor_id: string | null = null

  if (parsed.counterparty_phone) {
    const phone = parsed.counterparty_phone

    if (parsed.direction === 'in') {
      const { data: cust } = await supabase
        .from('pos_customers')
        .select('id')
        .eq('business_id', device.business_id)
        .eq('primary_phone', phone)
        .maybeSingle()
      matched_customer_id = cust?.id ?? null
    } else if (parsed.direction === 'out') {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('business_id', device.business_id)
        .or(`phone.eq.${phone},evc_phone.eq.${phone}`)
        .maybeSingle()
      matched_vendor_id = vendor?.id ?? null
    }
  }

  // Insert (idempotent on (business_id, raw_sms, occurred_at))
  const { data: event, error } = await supabase
    .from('sms_events')
    .upsert({
      business_id: device.business_id,
      device_id: device.id,
      raw_sms: raw,
      parsed,
      direction: parsed.direction,
      amount: parsed.amount,
      currency: parsed.currency,
      counterparty_phone: parsed.counterparty_phone,
      balance_after: parsed.balance_after,
      matched_customer_id,
      matched_vendor_id,
      status: 'pending',
      occurred_at: parsed.occurred_at,
    }, {
      onConflict: 'business_id,raw_sms,occurred_at',
      ignoreDuplicates: false,
    })
    .select('id, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Heartbeat
  await supabase
    .from('sms_listener_devices')
    .update({
      last_seen_at: new Date().toISOString(),
      ...(body.app_version ? { app_version: String(body.app_version).trim() } : {}),
    })
    .eq('id', device.id)

  return NextResponse.json({
    event_id: event?.id,
    status: event?.status ?? 'pending',
    parsed: {
      direction: parsed.direction,
      amount: parsed.amount,
      counterparty_phone: parsed.counterparty_phone,
    },
    matched: {
      customer_id: matched_customer_id,
      vendor_id: matched_vendor_id,
    },
  })
}
