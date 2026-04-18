/**
 * Rendering error retry utility for the Notification Hub.
 * Wraps SDK rendering calls (rebuildPageContainer, textContainerUpgrade)
 * with a single retry after a 500ms delay.
 *
 * @see Requirement 13.2, 13.4
 */

const RETRY_DELAY_MS = 500

/**
 * Execute an async rendering operation with a single retry on failure.
 * If the first attempt fails, waits 500ms and retries once.
 * If the retry also fails, logs the error and returns false.
 *
 * @param operation - The async rendering function to execute
 * @param label - A descriptive label for error logging
 * @returns true if the operation succeeded, false if it failed after retry
 */
export async function withRenderRetry(
  operation: () => Promise<unknown>,
  label: string,
): Promise<boolean> {
  try {
    await operation()
    return true
  } catch (firstError) {
    console.warn(`[RenderRetry] ${label} failed, retrying in ${RETRY_DELAY_MS}ms:`, firstError)

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))

    try {
      await operation()
      return true
    } catch (retryError) {
      console.error(`[RenderRetry] ${label} failed after retry, skipping:`, retryError)
      return false
    }
  }
}
