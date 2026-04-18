import type { GlassScreen } from 'even-toolkit/glass-screen-router'
import { buildScrollableList } from 'even-toolkit/glass-display-builders'
import { moveHighlight } from 'even-toolkit/glass-nav'
import type { AppSnapshot, AppActions } from '../shared'
import type { SeverityFilter } from '@/types/filters'

/** Display labels for the severity filter screen list */
const FILTER_ITEMS = ['All', 'Critical Only', 'Warning & Critical', 'Filter by Source']

/** Maps list item index to SeverityFilter value (index 3 is "Filter by Source", not a severity) */
const INDEX_TO_SEVERITY: Record<number, SeverityFilter> = {
  0: 'all',
  1: 'critical',
  2: 'warning-critical',
}

export const severityFilterScreen: GlassScreen<AppSnapshot, AppActions> = {
  display(_snapshot, nav) {
    return {
      lines: buildScrollableList({
        items: FILTER_ITEMS,
        highlightedIndex: nav.highlightedIndex,
        maxVisible: 4,
        formatter: (item) => item,
      }),
    }
  },

  action(action, nav, _snapshot, ctx) {
    if (action.type === 'HIGHLIGHT_MOVE') {
      return {
        ...nav,
        highlightedIndex: moveHighlight(nav.highlightedIndex, action.direction, FILTER_ITEMS.length - 1),
      }
    }

    if (action.type === 'SELECT_HIGHLIGHTED') {
      const index = nav.highlightedIndex

      // "Filter by Source" — navigate to the source filter screen
      if (index === 3) {
        ctx.navigate('/source-filter')
        return { ...nav, highlightedIndex: 0 }
      }

      // Apply the selected severity filter and return to the feed
      const severity = INDEX_TO_SEVERITY[index] ?? 'all'
      ctx.setSeverityFilter(severity)
      ctx.navigate('/feed')
      return { ...nav, highlightedIndex: 0 }
    }

    if (action.type === 'GO_BACK') {
      ctx.navigate('/feed')
      return { ...nav, highlightedIndex: 0 }
    }

    return nav
  },
}
