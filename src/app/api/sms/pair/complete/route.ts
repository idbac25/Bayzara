// APK-facing. Exchanges a 6-digit pairing code for a long-lived device token.
// Uses the service role since the APK is not authenticated as a Supabase user.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { pairing_code, device_phone, app_version } = await req.json()

  const code = String(pairing_code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid pairing code' }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const { data: device } = await supabase
    .from('sms_listener_devices')
    .select('id, business_id, device_token, pairing_code_expires_at, paired_at')
    .eq('pairing_code', code)
    .is('paired_at', null)
    .maybeSingle()

  if (!device) {
    return NextResponse.json({ error: 'Pairing code not found or already used' }, { status: 404 })
  }

  if (!device.pairing_code_expires_at || new Date(device.pairing_code_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Pairing code expired' }, { status: 410 })
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('sms_listener_devices')
    .update({
      paired_at: now,
      last_seen_at: now,
      device_phone: device_phone ? String(device_phone).trim() : null,
      app_version: app_version ? String(app_version).trim() : null,
      pairing_code: null,                  // burn the code
      pairing_code_expires_at: null,
    })
    .eq('id', device.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    device_id: device.id,
    business_id: device.business_id,
    device_token: device.device_token,
  })
}
