import { Skeleton } from '@/components/ui/skeleton'

export default function POSLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden">
      <div className="flex-1 p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="w-80 border-l p-4 space-y-4 bg-white">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <div className="mt-auto space-y-2 pt-4 border-t">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-11 w-full mt-2" />
        </div>
      </div>
    </div>
  )
}
