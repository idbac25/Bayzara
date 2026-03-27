import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}
        >
          <span className="text-white font-bold text-2xl">B</span>
        </div>
        <h1 className="text-6xl font-bold text-[#0F4C81] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-500 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Home
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-8">
          Bayzara · Built by Keyd Solutions
        </p>
      </div>
    </div>
  )
}
