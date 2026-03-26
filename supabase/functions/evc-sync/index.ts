// Supabase Edge Function: evc-sync
// Runs every 60 seconds via cron to poll Hormud EVC Plus API
// Deployed: supabase functions deploy evc-sync
// Scheduled: supabase functions schedule evc-sync --schedule "*/1 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVC_API_BASE = 'https://api.waafipay.net/asm'

interface EvcTransaction {
  tranId: string
  tranAmount: number
  tranDirection: 'DEBIT' | 'CREDIT'
  msisdn: string
  senderName?: string
  receiverMsisdn?: string
  tranDateTime: string
  balAfterTran: number
  description?: string
}

async function getSessionToken(phone: string, pin: string): Promise<string | null> {
  try {
    const res = await fetch(EVC_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: '1.0',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        channelName: 'WEB',
        serviceName: 'API_MERCHANT_LOGIN',
        serviceParams: {
          merchantUid: phone,
          apiUserId: phone,
          apiKey: pin,
        }
      }),
    })

    const data = await res.json()
    if (data.responseCode === '2001') {
      return data.params?.sessionId ?? null
    }
    return null
  } catch {
    return null
  }
}

async function fetchTransactions(
  sessionToken: string,
  merchantPhone: string,
  lastTranId?: string
): Promise<EvcTransaction[]> {
  try {
    const res = await fetch(EVC_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: '1.0',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        channelName: 'WEB',
        serviceName: 'API_MERCHANT_TRANSACTION_LIST',
        serviceParams: {
          sessionId: sessionToken,
          merchantUid: merchantPhone,
          direction: 'CREDIT',
          startIndex: 1,
          maxNoOfRows: 50,
        }
      }),
    })

    const data = await res.json()
    if (data.responseCode === '2001') {
      const txns: EvcTransaction[] = data.params?.transactions ?? []
      // Filter out already processed transactions
      if (lastTranId) {
        const idx = txns.findIndex(t => t.tranId === lastTranId)
        return idx > -1 ? txns.slice(0, idx) : txns
      }
      return txns
    }
    return []
  } catch {
    return []
  }
}

async function getBalance(sessionToken: string, merchantPhone: string): Promise<number | null> {
  try {
    const res = await fetch(EVC_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: '1.0',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        channelName: 'WEB',
        serviceName: 'API_MERCHANT_BALANCE',
        serviceParams: {
          sessionId: sessionToken,
          merchantUid: merchantPhone,
        }
      }),
    })

    const data = await res.json()
    if (data.responseCode === '2001') {
      return data.params?.availableBalance ?? null
    }
    return null
  } catch {
    return null
  }
}

async function resolveSenderName(phone: string, sessionToken: string, merchantPhone: string): Promise<string | null> {
  try {
    const res = await fetch(EVC_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: '1.0',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        channelName: 'WEB',
        serviceName: 'API_CUSTOMER_PROFILE',
        serviceParams: {
          sessionId: sessionToken,
          merchantUid: merchantPhone,
          customerMsisdn: phone,
        }
      }),
    })

    const data = await res.json()
    if (data.responseCode === '2001') {
      return data.params?.customerName ?? null
    }
    return null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Load all active EVC connections
  const { data: connections, error } = await supabase
    .from('evc_connections')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: Record<string, unknown>[] = []

  for (const conn of connections ?? []) {
    try {
      let sessionToken = conn.session_token

      // Refresh session if needed (try stored first)
      if (!sessionToken) {
        // session_token not stored in DB for security — skip for now
        results.push({ id: conn.id, status: 'no_session' })
        continue
      }

      // Fetch new transactions
      const newTxns = await fetchTransactions(sessionToken, conn.merchant_phone, conn.last_tran_id)

      if (newTxns.length === 0) {
        // Still update balance
        const balance = await getBalance(sessionToken, conn.merchant_phone)
        if (balance !== null) {
          await supabase.from('evc_connections').update({
            current_balance: balance,
            last_synced_at: new Date().toISOString(),
          }).eq('id', conn.id)
        }
        results.push({ id: conn.id, status: 'no_new_txns' })
        continue
      }

      // Process each new transaction
      for (const tx of newTxns) {
        // Resolve sender name if not provided
        let senderName = tx.senderName ?? null
        if (!senderName && tx.msisdn) {
          senderName = await resolveSenderName(tx.msisdn, sessionToken, conn.merchant_phone)
        }

        // Try to match a client by EVC phone
        const { data: clientMatch } = await supabase
          .from('clients')
          .select('id')
          .eq('business_id', conn.business_id)
          .eq('evc_phone', tx.msisdn)
          .maybeSingle()

        // Try to match an open invoice for this client
        let matchedDocumentId: string | null = null
        let needsReview = false

        if (clientMatch?.id) {
          const { data: openInvoice } = await supabase
            .from('documents')
            .select('id, amount_due')
            .eq('business_id', conn.business_id)
            .eq('client_id', clientMatch.id)
            .eq('type', 'invoice')
            .in('status', ['sent', 'partially_paid', 'overdue'])
            .is('deleted_at', null)
            .order('due_date', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (openInvoice) {
            matchedDocumentId = openInvoice.id
            needsReview = Math.abs(openInvoice.amount_due - tx.tranAmount) > 0.01
          } else {
            needsReview = true
          }
        } else {
          needsReview = true
        }

        // Insert EVC transaction (ignore conflicts — deduplication by tran_id)
        const { data: newTxRecord, error: txError } = await supabase
          .from('evc_transactions')
          .insert({
            business_id: conn.business_id,
            evc_connection_id: conn.id,
            tran_id: tx.tranId,
            amount: tx.tranAmount,
            direction: tx.tranDirection === 'CREDIT' ? 'in' : 'out',
            sender_phone: tx.msisdn,
            sender_name: senderName,
            tran_date: tx.tranDateTime,
            balance_after: tx.balAfterTran,
            description: tx.description,
            is_recorded: false,
            needs_review: needsReview,
            client_id: clientMatch?.id ?? null,
            document_id: matchedDocumentId,
          })
          .select()
          .single()

        if (txError && !txError.message.includes('duplicate')) {
          console.error('Error inserting tx:', txError.message)
          continue
        }

        // Auto-record payment if we have a match and amounts match
        if (!needsReview && matchedDocumentId && clientMatch?.id && newTxRecord) {
          // Get default EVC payment account for this business
          const { data: payAcct } = await supabase
            .from('payment_accounts')
            .select('id')
            .eq('business_id', conn.business_id)
            .eq('evc_connection_id', conn.id)
            .eq('is_active', true)
            .maybeSingle()

          if (payAcct) {
            const { data: payRecord } = await supabase
              .from('payment_records')
              .insert({
                business_id: conn.business_id,
                document_id: matchedDocumentId,
                payment_account_id: payAcct.id,
                amount: tx.tranAmount,
                date: new Date(tx.tranDateTime).toISOString().split('T')[0],
                method: 'evc',
                reference: tx.tranId,
                notes: `Auto-recorded from EVC. Sender: ${senderName ?? tx.msisdn}`,
                evc_tran_id: tx.tranId,
              })
              .select()
              .single()

            if (payRecord) {
              // Update the EVC transaction as recorded
              await supabase.from('evc_transactions').update({
                is_recorded: true,
                needs_review: false,
                payment_record_id: payRecord.id,
              }).eq('id', newTxRecord.id)
            }
          }
        }
      }

      // Update connection with latest tran_id and balance
      const balance = await getBalance(sessionToken, conn.merchant_phone)
      await supabase.from('evc_connections').update({
        last_tran_id: newTxns[0]?.tranId ?? conn.last_tran_id,
        current_balance: balance ?? conn.current_balance,
        last_synced_at: new Date().toISOString(),
        status: 'active',
      }).eq('id', conn.id)

      results.push({ id: conn.id, status: 'synced', newTxns: newTxns.length })

    } catch (err) {
      console.error(`Error syncing connection ${conn.id}:`, err)

      await supabase.from('evc_connections').update({
        status: 'error',
        updated_at: new Date().toISOString(),
      }).eq('id', conn.id)

      results.push({ id: conn.id, status: 'error', error: String(err) })
    }
  }

  return new Response(
    JSON.stringify({ synced: results.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
