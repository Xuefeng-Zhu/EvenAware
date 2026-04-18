import { createGlassScreenRouter } from 'even-toolkit/glass-screen-router'
import type { AppSnapshot, AppActions } from './shared'
import { feedScreen } from './screens/feed'
import { detailScreen } from './screens/detail'
import { severityFilterScreen } from './screens/severityFilter'
import { sourceFilterScreen } from './screens/sourceFilter'

export type { AppSnapshot, AppActions }

export const { toDisplayData, onGlassAction } = createGlassScreenRouter<AppSnapshot, AppActions>({
  'feed': feedScreen,
  'detail': detailScreen,
  'severity-filter': severityFilterScreen,
  'source-filter': sourceFilterScreen,
}, 'feed')
