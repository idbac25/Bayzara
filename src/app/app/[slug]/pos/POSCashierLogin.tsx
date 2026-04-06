'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Delete, ArrowLeft, ShieldCheck, UserCog } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  role: 'owner' | 'manager' | 'cashier'
  has_pin: boolean
}

interface CashierSession {
  id: string
  name: string
  role: string
}

interface Props {
  businessName: string
  businessId: string
  staff: StaffMember[]
  onLogin: (session: CashierSession) => void
  onSkip: () => void
}

const ROLE_COLOR = {
  owner:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-slate-100 text-slate-700',
}

export function POSCashierLogin({ businessName, businessId, staff, onLogin, onSkip }: Props) {
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const activeStaff = staff.filter(s => s.has_pin)

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) verifyPin(next)
  }

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const verifyPin = async (enteredPin: string) => {
    if (!selected) return
    setChecking(true)
    try {
      const res = await fetch('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, staff_id: selected.id, pin: enteredPin }),
      })
      const data = await res.json()
      if (data.valid) {
        onLogin({ id: selected.id, name: selected.name, role: selected.role })
      } else {
        setError('Wrong PIN. Try again.')
        setPin('')
      }
    } catch {
      setError('Connection error. Try again.')
      setPin('')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1a2744] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">B</span>
        </div>
        <h1 className="text-white text-xl font-bold">{businessName}</h1>
        <p className="text-white/50 text-sm mt-1">Point of Sale</p>
      </div>

      {!selected ? (
        /* Staff selection */
        <div className="w-full max-w-md">
          <p className="text-white/60 text-sm text-center mb-4 uppercase tracking-wide font-medium">
            Who is using the POS?
          </p>

          {activeStaff.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              <UserCog className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No staff with PIN set up yet.</p>
              <p className="text-xs mt-1">Add staff members and set their PINs in the Staff section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {activeStaff.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setPin(''); setError('') }}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-4 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-lg">{s.name[0].toUpperCase()}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${ROLE_COLOR[s.role]}`}>
                    {s.role}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onSkip}
            className="w-full text-white/40 hover:text-white/70 text-sm py-3 transition-colors"
          >
            Continue without login
          </button>
        </div>
      ) : (
        /* PIN entry */
        <div className="w-full max-w-xs">
          <button
            onClick={() => { setSelected(null); setPin(''); setError('') }}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Avatar */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold text-2xl">{selected.name[0].toUpperCase()}</span>
            </div>
            <p className="text-white font-semibold">{selected.name}</p>
            <p className="text-white/50 text-xs mt-0.5">Enter your 4-digit PIN</p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  'w-4 h-4 rounded-full border-2 transition-all duration-150',
                  i < pin.length
                    ? 'bg-[#F5A623] border-[#F5A623]'
                    : 'bg-transparent border-white/30'
                )}
              />
            ))}
          </div>

          {/* Error */}
          <p className={cn(
            'text-center text-sm mb-4 h-5 transition-opacity',
            error ? 'text-red-400 opacity-100' : 'opacity-0'
          )}>
            {error || ' '}
          </p>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                disabled={checking}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all text-white text-2xl font-semibold disabled:opacity-50"
              >
                {d}
              </button>
            ))}
            {/* Row 4 */}
            <button
              onClick={handleBackspace}
              disabled={checking || pin.length === 0}
              className="h-16 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 transition-all text-white/60 flex items-center justify-center disabled:opacity-30"
            >
              <Delete className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDigit('0')}
              disabled={checking}
              className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all text-white text-2xl font-semibold disabled:opacity-50"
            >
              0
            </button>
            <div className="h-16 flex items-center justify-center">
              {checking && (
                <div className="w-6 h-6 border-2 border-white/30 border-t-[#F5A623] rounded-full animate-spin" />
              )}
              {!checking && pin.length === 4 && (
                <ShieldCheck className="h-6 w-6 text-[#F5A623]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
