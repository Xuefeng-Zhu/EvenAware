import {
  TextContainerUpgrade,
  type EvenAppBridge,
} from '@evenrealities/even_hub_sdk'

/** Duration the banner is shown before restoring original content */
const BANNER_DURATION_MS = 3000

/** Container ID for the main text container on the detail screen */
const BANNER_CONTAINER_ID = 1

/** Container name for the main text container on the detail screen */
const BANNER_CONTAINER_NAME = 'main-text'

/** Max length for the title snippet in the banner line */
const MAX_SNIPPET_LENGTH = 40

let bannerTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Show a critical notification banner on the detail screen.
 * Prepends a banner line to the current text container content,
 * then restores the original content after 3 seconds.
 *
 * @param bridge - The raw EvenAppBridge instance for calling textContainerUpgrade
 * @param criticalTitle - The title of the incoming critical notification
 * @param originalContent - The current detail screen text content to restore after the banner
 */
export function showCriticalBanner(
  bridge: EvenAppBridge,
  criticalTitle: string,
  originalContent: string,
): void {
  // Clear any existing banner timer to avoid stacking
  if (bannerTimer !== null) {
    clearTimeout(bannerTimer)
    bannerTimer = null
  }

  const titleSnippet =
    criticalTitle.length > MAX_SNIPPET_LENGTH
      ? criticalTitle.slice(0, MAX_SNIPPET_LENGTH - 3) + '...'
      : criticalTitle
  const bannerLine = `▲ NEW CRITICAL: ${titleSnippet}`
  const bannerContent = `${bannerLine}\n${originalContent}`

  // Show banner via in-place text upgrade (no full page rebuild)
  bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: BANNER_CONTAINER_ID,
      containerName: BANNER_CONTAINER_NAME,
      contentOffset: 0,
      contentLength: 2000,
      content: bannerContent,
    }),
  )

  // Restore original content after 3 seconds
  bannerTimer = setTimeout(() => {
    bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: BANNER_CONTAINER_ID,
        containerName: BANNER_CONTAINER_NAME,
        contentOffset: 0,
        contentLength: 2000,
        content: originalContent,
      }),
    )
    bannerTimer = null
  }, BANNER_DURATION_MS)
}

/**
 * Cancel any active banner timer (e.g., when navigating away from detail).
 */
export function cancelBanner(): void {
  if (bannerTimer !== null) {
    clearTimeout(bannerTimer)
    bannerTimer = null
  }
}

/**
 * Check if a banner is currently active.
 */
export function isBannerActive(): boolean {
  return bannerTimer !== null
}
