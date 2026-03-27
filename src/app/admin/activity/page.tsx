import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Activity, Building2, Users, Shield, Zap, CreditCard } from 'lucide-react'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  plan_changed:           { label: 'Plan changed',         color: 'bg-[#F5A623]/15 text-[#e09520]' },
  features_changed:       { label: 'Features updated',     color: 'bg-blue-100 text-blue-700' },
  business_suspended:     { label: 'Business suspended',   color: 'bg-red-100 text-red-600' },
  business_unsuspended:   { label: 'Business unsuspended', color: 'bg-green-100 text-green-700' },
  role_changed:           { label: 'Role changed',         color: 'bg-purple-100 text-purple-700' },
  member_removed:         { label: 'Member removed',       color: 'bg-gray-100 text-gray-600' },
}

const TARGET_ICON: Record<string, React.ElementType> = {
  business: Building2,
  user: Users,
  evc_connection: Zap,
}

export default async function ActivityPage() {
  const { data: logs } = await admin
    .from('admin_audit_log')
    .select('*, profiles:admin_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#0F4C81]" /> Activity Log
        </h1>
        <p className="text-gray-500 text-sm mt-1">All admin actions across the platform (last 200)</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {(logs ?? []).length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No activity yet. Actions taken from the admin panel will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(logs ?? []).map(log => {
              const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-500' }
              const Icon = TARGET_ICON[log.target_type] ?? CreditCard
              const adminProfile = log.profiles as { full_name: string | null; email: string | null } | null
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                      {log.target_name && (
                        <span className="text-sm font-medium text-gray-900">{log.target_name}</span>
                      )}
                    </div>
                    {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Object.entries(log.metadata as Record<string, unknown>)
                          .filter(([k]) => !['features'].includes(k))
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' → ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {adminProfile?.full_name ?? adminProfile?.email ?? 'Unknown admin'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
