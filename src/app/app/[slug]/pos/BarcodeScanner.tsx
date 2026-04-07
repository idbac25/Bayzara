'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { X, Camera, CameraOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)
  const [lastScan, setLastScan] = useState<string | null>(null)
  // Prevent duplicate rapid scans
  const lastScanTime = useRef(0)

  useEffect(() => {
    let active = true

    const start = async () => {
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        await reader.decodeFromVideoDevice(
          undefined, // use default camera
          videoRef.current!,
          (result, err) => {
            if (!active) return
            if (result) {
              const now = Date.now()
              // Debounce: ignore same barcode within 2 seconds
              if (now - lastScanTime.current < 2000) return
              lastScanTime.current = now
              const text = result.getText()
              setLastScan(text)
              // Brief visual flash then fire
              setTimeout(() => {
                if (active) {
                  onDetected(text)
                  setLastScan(null)
                }
              }, 400)
            }
            if (err && !(err instanceof NotFoundException)) {
              // Non-critical decode errors are normal — ignore
            }
          }
        )
        setScanning(true)
      } catch (e: unknown) {
        if (!active) return
        const msg = e instanceof Error ? e.message : 'Camera access failed'
        if (msg.includes('Permission') || msg.includes('NotAllowed')) {
          setError('Camera permission denied. Please allow camera access and try again.')
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
          setError('No camera found on this device.')
        } else {
          setError('Could not start camera: ' + msg)
        }
        setScanning(false)
      }
    }

    start()

    return () => {
      active = false
      if (readerRef.current) {
        BrowserMultiFormatReader.releaseAllStreams()
        readerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#1a2744] text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="font-semibold text-sm">Scan Barcode</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative aspect-square bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Scan overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br" />
                {/* Scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-[#F5A623] shadow-[0_0_6px_#F5A623] animate-scan-line" />
              </div>
            </div>
          )}

          {/* Flash on scan */}
          {lastScan && (
            <div className="absolute inset-0 bg-green-400/40 flex items-center justify-center animate-pulse">
              <div className="bg-white rounded-xl px-4 py-2 shadow-lg text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Detected</p>
                <p className="font-mono font-bold text-sm">{lastScan}</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <CameraOff className="h-12 w-12 text-white/40" />
              <p className="text-white/70 text-sm">{error}</p>
            </div>
          )}

          {/* Loading */}
          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 text-center bg-gray-50 border-t">
          <p className="text-xs text-muted-foreground">
            Point the camera at a product barcode (EAN-13, UPC, Code128…)
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
