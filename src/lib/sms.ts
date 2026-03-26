const SMS_BASE = process.env.HORMUD_SMS_BASE_URL!
const SMS_USERNAME = process.env.HORMUD_SMS_USERNAME!
const SMS_PASSWORD = process.env.HORMUD_SMS_PASSWORD!

let cachedToken: string | null = null
let tokenExpiry: number = 0

async function getSmsToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const params = new URLSearchParams({
    username: SMS_USERNAME,
    password: SMS_PASSWORD,
    grant_type: 'password',
  })

  const res = await fetch(`${SMS_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 min cache
  return cachedToken!
}

export async function sendSMS(params: {
  mobile: string
  message: string
  refid?: string
  senderid?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getSmsToken()

    const res = await fetch(`${SMS_BASE}/api/SendSMS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        refid: params.refid ?? '0',
        mobile: params.mobile,
        message: params.message,
        senderid: params.senderid ?? 'Bayzara',
        validity: 0,
      }),
    })

    const data = await res.json()

    if (data.ResponseCode === '200') {
      return { success: true, messageId: data.Data?.MessageID }
    } else {
      return { success: false, error: `${data.ResponseCode}: ${data.ResponseMessage}` }
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'SMS failed' }
  }
}
