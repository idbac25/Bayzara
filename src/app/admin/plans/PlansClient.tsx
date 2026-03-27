'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FEATURE_LABELS, type FeatureKey } from '@/lib/features'
import { toast } from 'sonner'
import { CreditCard, Save, ChevronDown, ChevronUp } from 'lucide-react'

interface PlanTemplate {
  id: string; name: string; label: string; price_usd: number
  features: Record<string, boolean | number>; is_active: boolean; sort_order: number
}

const featureKeys = Object.keys(FEATURE_LABELS) as FeatureKey[]

export function PlansClient({ plans: initial }: { plans: PlanTemplate[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [plans, setPlans] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(initial[0]?.id ?? null)
  const [saving, setSaving] = useState<string | null>(null)

  function updateFeature(planId: string, key: string, val: boolean | number) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: { ...p.features, [key]: val } } : p
    ))
  }

  function updatePlan(planId: string, field: string, val: unknown) {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, [field]: val } : p))
  }

  async function savePlan(plan: PlanTemplate) {
    setSaving(plan.id)
    const { error } = await supabase.from('plan_templates').update({
      label: plan.label,
      price_usd: plan.price_usd,
      features: plan.features,
      is_active: plan.is_active,
    }).eq('id', plan.id)
    setSaving(null)
    if (error) { toast.error(error.message); return }
    toast.success(`"${plan.label}" plan saved`)
    router.refresh()
  }

  const planColors: Record<string, string> = {
    free: 'border-gray-200',
    pro: 'border-[#F5A623]',
    enterprise: 'border-purple-400',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-[#0F4C81]" /> Plan Templates
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Define what each plan includes. Apply to businesses from their detail page.
        </p>
      </div>

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white border-2 rounded-xl shadow-sm overflow-hidden ${planColors[plan.name] ?? 'border-gray-200'}`}>
            {/* Plan Header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(e => e === plan.id ? null : plan.id)}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                  plan.name === 'pro' ? 'bg-[#F5A623]/15 text-[#e09520]' :
                  plan.name === 'enterprise' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-500'
                }`}>{plan.name}</span>
                <span className="font-semibold text-gray-900">{plan.label}</span>
                <span className="text-gray-400 text-sm">${plan.price_usd}/month</span>
                {!plan.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-500 font-medium">Inactive</span>
                )}
              </div>
              {expanded === plan.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {expanded === plan.id && (
              <div className="px-5 pb-5 border-t border-gray-100">
                {/* Plan meta */}
                <div className="grid grid-cols-3 gap-4 py-4 border-b border-gray-100 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Display Label</label>
                    <input
                      value={plan.label}
                      onChange={e => updatePlan(plan.id, 'label', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price (USD/mo)</label>
                    <input
                      type="number" min={0}
                      value={plan.price_usd}
                      onChange={e => updatePlan(plan.id, 'price_usd', parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                      <button
                        onClick={() => updatePlan(plan.id, 'is_active', !plan.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${plan.is_active ? 'bg-[#0F4C81]' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${plan.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                {/* Feature toggles */}
                <div className="divide-y divide-gray-50">
                  {featureKeys.map(key => {
                    const meta = FEATURE_LABELS[key]
                    const val = plan.features[key]
                    return (
                      <div key={key} className="flex items-center justify-between py-2.5 gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                          <p className="text-xs text-gray-400">{meta.description}</p>
                        </div>
                        {meta.type === 'toggle' ? (
                          <button
                            onClick={() => updateFeature(plan.id, key, val === false ? true : false)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${val !== false ? 'bg-[#0F4C81]' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${val !== false ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number" min={0}
                              value={typeof val === 'number' ? val : 0}
                              onChange={e => updateFeature(plan.id, key, parseInt(e.target.value) || 0)}
                              className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-[#0F4C81]"
                            />
                            <span className="text-xs text-gray-400">0=∞</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => savePlan(plan)}
                    disabled={saving === plan.id}
                    className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving === plan.id ? 'Saving...' : 'Save Plan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
