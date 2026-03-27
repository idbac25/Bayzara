import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Receipt, Users, BarChart3, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
            <span className="text-white font-bold">B</span>
          </div>
          <span className="font-bold text-[#0F4C81] text-lg">Bayzara</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 text-[#F5A623] px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-[#F5A623]/20">
          <Zap className="h-4 w-4" />
          World&apos;s first native Hormud EVC Plus integration
        </div>
        <h1 className="text-5xl font-bold text-[#0F4C81] leading-tight mb-6">
          Business clarity<br />for Somalia
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          The only accounting platform where EVC Plus payments are automatically recorded the moment they arrive.
          No manual entry. No reconciliation. Just clarity.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-[#0F4C81] hover:bg-[#0d3f6e] px-8">
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap, color: '#F5A623', title: 'EVC Auto-Record', desc: 'Every Hormud payment recorded automatically with sender name resolved in real time.' },
            { icon: Receipt, color: '#0F4C81', title: 'Professional Invoices', desc: 'Create, send, and track invoices. Share via link or PDF with a single click.' },
            { icon: Users, color: '#27AE60', title: 'Client Management', desc: 'Complete client profiles with full payment history and activity timeline.' },
            { icon: BarChart3, color: '#8B5CF6', title: 'Reports & Insights', desc: 'Accounts receivable, income statements, EVC reports, and more.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}15` }}>
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVC Section */}
      <section className="bg-gradient-to-br from-[#0F4C81] to-[#1a6db5] text-white px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <Zap className="h-12 w-12 text-[#F5A623] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">EVC Plus Integration</h2>
          <p className="text-white/80 mb-8 text-lg">
            Connect your Hormud EVC merchant account. Every payment syncs every 60 seconds.
            Bayzara resolves the sender&apos;s name, matches the invoice, and records the payment — automatically.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            {['Money arrives', 'Name resolved', 'Invoice updated'].map((step, i) => (
              <div key={step} className="text-center">
                <div className="h-10 w-10 rounded-full bg-[#F5A623] flex items-center justify-center mx-auto mb-2 font-bold text-black">
                  {i + 1}
                </div>
                <p className="text-sm text-white/80">{step}</p>
              </div>
            ))}
          </div>
          <Button asChild size="lg" className="bg-[#F5A623] hover:bg-[#e09520] text-black font-semibold">
            <Link href="/signup">Connect EVC Plus →</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-muted-foreground border-t bg-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#0F4C81' }}>
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-[#0F4C81]">Bayzara</span>
        </div>
        <p>© 2026 Bayzara · Business clarity for Somalia</p>
        <p className="text-xs mt-1 text-gray-400">Built by Keyd Solutions</p>
      </footer>
    </div>
  )
}
