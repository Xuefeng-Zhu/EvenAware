import type { GlassScreen } from 'even-toolkit/glass-screen-router'
import { buildScrollableList } from 'even-toolkit/glass-display-builders'
import { moveHighlight } from 'even-toolkit/glass-nav'
import type { AppSnapshot, AppActions } from '../shared'

export const sourceFilterScreen: GlassScreen<AppSnapshot, AppActions> = {
  display(snapshot, nav) {
    const items = ['All Sources', ...snapshot.availableSources]
    return {
      lines: buildScrollableList({
        items,
        highlightedIndex: nav.highlightedIndex,
        maxVisible: 5,
        formatter: (item) => item,
      }),
    }
  },

  action(action, nav, snapshot, ctx) {
    const items = ['All Sources', ...snapshot.availableSources]

    if (action.type === 'HIGHLIGHT_MOVE') {
      return {
        ...nav,
        highlightedIndex: moveHighlight(nav.highlightedIndex, action.direction, items.length - 1),
      }
    }

    if (action.type === 'SELECT_HIGHLIGHTED') {
      const index = nav.highlightedIndex
      if (index === 0) {
        // "All Sources" — clear source filter
        ctx.setSourceFilter(null)
      } else {
        // Specific source
        ctx.setSourceFilter(items[index])
      }
      ctx.navigate('/feed')
      return { ...nav, highlightedIndex: 0 }
    }

    if (action.type === 'GO_BACK') {
      ctx.navigate('/severity-filter')
      return { ...nav, highlightedIndex: 0 }
    }

    return nav
  },
}
