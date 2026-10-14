import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminDashboard } from './api'
import { getPresetDateRange } from './presets'
import type { DashboardData, DashboardDateRange, DashboardPreset } from './types'

export interface UseAdminDashboardOptions {
  initialPreset?: DashboardPreset
  initialCustomRange?: DashboardDateRange
}

export function useAdminDashboard(options: UseAdminDashboardOptions = {}) {
  const [preset, setPreset] = useState<DashboardPreset>(options.initialPreset ?? '30d')
  const [customRange, setCustomRange] = useState<DashboardDateRange | undefined>(
    options.initialCustomRange,
  )

  const activeRange = useMemo<DashboardDateRange>(() => {
    if (preset === 'custom' && customRange) {
      return customRange
    }
    return getPresetDateRange(preset === 'custom' ? '30d' : preset)
  }, [preset, customRange])

  const query = useQuery<DashboardData, Error>({
    queryKey: ['admin', 'dashboard', activeRange.from, activeRange.to],
    queryFn: () => getAdminDashboard(activeRange.from, activeRange.to),
    staleTime: 60 * 1000,
  })

  return {
    ...query,
    preset,
    setPreset,
    customRange,
    setCustomRange,
    activeRange,
  }
}
