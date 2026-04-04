// AES-GCM encryption/decryption for storing EVC merchant credentials.
// Uses the Web Crypto API — works in Node.js 18+, Deno, and Edge runtimes.
//
// Key: EVC_CREDENTIALS_SECRET hex string imported directly as AES-256-GCM key.
// Per-tenant binding: business_id is passed as AES-GCM Additional Authenticated Data (AAD).
//   → Ciphertext encrypted for tenant A cannot be decrypted as tenant B (auth tag fails).
// Output format: base64( iv[12] || ciphertext+tag )

const ALG = 'AES-GCM'

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') return globalThis.crypto
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('crypto').webcrypto
}

async function importKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const subtle = getCrypto().subtle
  // Secret is a 64-char hex string → 32 bytes → AES-256 key
  const raw = new Uint8Array(secret.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  return subtle.importKey('raw', raw, ALG, false, usage)
}

export async function encryptCredential(
  plaintext: string,
  secret: string,
  businessId: string,
): Promise<string> {
  const subtle = getCrypto().subtle
  const key    = await importKey(secret, ['encrypt'])
  const iv     = getCrypto().getRandomValues(new Uint8Array(12))
  const enc    = new TextEncoder()

  const ciphertext = await subtle.encrypt(
    { name: ALG, iv, additionalData: enc.encode(businessId) },
    key,
    enc.encode(plaintext),
  )

  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)

  return btoa(String.fromCharCode(...combined))
}

export async function decryptCredential(
  base64: string,
  secret: string,
  businessId: string,
): Promise<string> {
  const subtle   = getCrypto().subtle
  const key      = await importKey(secret, ['decrypt'])
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const iv       = combined.slice(0, 12)
  const data     = combined.slice(12)
  const enc      = new TextEncoder()

  const plaintext = await subtle.decrypt(
    { name: ALG, iv, additionalData: enc.encode(businessId) },
    key,
    data,
  )
  return new TextDecoder().decode(plaintext)
}
