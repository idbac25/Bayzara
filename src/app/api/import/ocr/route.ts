import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image_base64, media_type } = await req.json()
  if (!image_base64) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const imgType = allowedTypes.includes(media_type) ? media_type : 'image/jpeg'

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imgType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: image_base64,
            },
          },
          {
            type: 'text',
            text: `This is a photo of a handwritten debt/credit ledger book. Extract all records you can see.

For each row/entry in the book, return a JSON object with these fields:
- name: customer name (string)
- phone: phone number if visible (string or null)
- balance: total amount owed/outstanding (number, positive means they owe money)
- notes: any extra info like dates or items (string or null)

Return ONLY a JSON array of objects, nothing else. Example:
[
  {"name": "Ahmed Ali", "phone": "0612345678", "balance": 5000, "notes": "Started Jan 2024"},
  {"name": "Faadumo", "phone": null, "balance": 2500, "notes": null}
]

If a cell is illegible, skip it. If the amount column shows a running balance, use the final/latest balance. Convert any currency symbols or abbreviations to plain numbers.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) {
    return NextResponse.json({ error: 'Could not parse ledger data from image', raw: text }, { status: 422 })
  }

  try {
    const rows = JSON.parse(match[0])
    return NextResponse.json({ rows })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in OCR response', raw: text }, { status: 422 })
  }
}
