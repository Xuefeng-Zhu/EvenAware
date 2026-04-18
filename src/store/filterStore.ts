import { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  type FilterState,
  type SeverityFilter,
  STORAGE_KEY_SEVERITY_FILTER,
  STORAGE_KEY_SOURCE_FILTER,
  STORAGE_DEFAULT_SEVERITY,
  STORAGE_DEFAULT_SOURCE,
  DEFAULT_FILTER_STATE,
} from '@/types/filters'

/** Set of valid severity filter values for validation */
const VALID_SEVERITY_FILTERS: ReadonlySet<string> = new Set<SeverityFilter>([
  'all',
  'critical',
  'warning-critical',
])

/**
 * Load persisted filter state from SDK Storage.
 * Returns DEFAULT_FILTER_STATE if no persisted values exist.
 */
export async function loadFilters(): Promise<FilterState> {
  try {
    const bridge = EvenAppBridge.getInstance()

    const [rawSeverity, rawSource] = await Promise.all([
      bridge.getLocalStorage(STORAGE_KEY_SEVERITY_FILTER),
      bridge.getLocalStorage(STORAGE_KEY_SOURCE_FILTER),
    ])

    // Validate severity — default to STORAGE_DEFAULT_SEVERITY if missing or invalid
    const severity: SeverityFilter =
      rawSeverity !== null && VALID_SEVERITY_FILTERS.has(rawSeverity)
        ? (rawSeverity as SeverityFilter)
        : STORAGE_DEFAULT_SEVERITY

    // Convert source: empty string or null → null (all sources), otherwise use the value
    const source: string | null =
      rawSource === null || rawSource === '' ? null : rawSource

    return { severity, source }
  } catch (error) {
    console.warn('[FilterStore] Failed to load filters from SDK Storage:', error)
    return { ...DEFAULT_FILTER_STATE }
  }
}

/**
 * Persist the current filter state to SDK Storage.
 */
export async function saveFilters(filter: FilterState): Promise<void> {
  const bridge = EvenAppBridge.getInstance()
  const sourceValue = filter.source === null ? STORAGE_DEFAULT_SOURCE : filter.source

  await Promise.all([
    bridge.setLocalStorage(STORAGE_KEY_SEVERITY_FILTER, filter.severity),
    bridge.setLocalStorage(STORAGE_KEY_SOURCE_FILTER, sourceValue),
  ])
}
