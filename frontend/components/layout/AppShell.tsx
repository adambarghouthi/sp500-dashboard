'use client'

import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/lib/api'
import { SeedingScreen } from '@/components/loading/SeedingScreen'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: stocksApi.getHealth,
    retry: 5,
    retryDelay: 2000,
    staleTime: 30_000,
  })

  if (isLoading || !health) {
    return <SeedingScreen progress={0} message="Connecting to server..." />
  }

  return <>{children}</>
}
