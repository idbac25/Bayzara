import type { SupabaseClient } from '@supabase/supabase-js'

export type ImportSource = 'csv' | 'ocr' | 'manual'
export type ImportTypeKey = 'customers' | 'products' | 'suppliers' | 'debt' | 'vendor-debts'

export async function logImport(
  supabase: SupabaseClient,
  args: {
    business_id: string
    user_id: string | undefined
    import_type: ImportTypeKey
    source?: ImportSource
    imported: number
    skipped: number
    errors: string[]
  }
) {
  await supabase.from('import_history').insert({
    business_id: args.business_id,
    user_id: args.user_id ?? null,
    import_type: args.import_type,
    source: args.source ?? 'csv',
    imported: args.imported,
    skipped: args.skipped,
    errors_count: args.errors.length,
    errors: args.errors.length > 0 ? args.errors.slice(0, 50) : null,
  })
}
