import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationQueue } from '@/store/notificationQueue'
import type { Notification } from '@/types/notification'

function makeNotification(id: string): Notification {
  return {
    id,
    title: `Alert ${id}`,
    body: `Body for ${id}`,
    severity: 'critical',
    sourceName: 'PagerDuty',
    sourceType: 'pagerduty',
    timestamp: { seconds: 1700000000, nanoseconds: 0 },
  }
}

describe('NotificationQueue', () => {
  let queue: NotificationQueue

  beforeEach(() => {
    queue = new NotificationQueue()
  })

  it('starts with zero pending items', () => {
    expect(queue.pending).toBe(0)
  })

  it('enqueue adds to the queue and increments pending', () => {
    queue.enqueue(makeNotification('1'))

    expect(queue.pending).toBe(1)

    queue.enqueue(makeNotification('2'))

    expect(queue.pending).toBe(2)
  })

  it('flush returns all queued items in enqueue order', () => {
    queue.enqueue(makeNotification('1'))
    queue.enqueue(makeNotification('2'))
    queue.enqueue(makeNotification('3'))

    const flushed = queue.flush()

    expect(flushed).toHaveLength(3)
    expect(flushed[0].id).toBe('1')
    expect(flushed[1].id).toBe('2')
    expect(flushed[2].id).toBe('3')
  })

  it('flush clears the queue', () => {
    queue.enqueue(makeNotification('1'))
    queue.enqueue(makeNotification('2'))

    queue.flush()

    expect(queue.pending).toBe(0)
  })

  it('flush on empty queue returns empty array', () => {
    const flushed = queue.flush()

    expect(flushed).toEqual([])
    expect(queue.pending).toBe(0)
  })

  it('supports multiple enqueue/flush cycles', () => {
    // First cycle
    queue.enqueue(makeNotification('1'))
    queue.enqueue(makeNotification('2'))
    const first = queue.flush()
    expect(first).toHaveLength(2)
    expect(queue.pending).toBe(0)

    // Second cycle
    queue.enqueue(makeNotification('3'))
    const second = queue.flush()
    expect(second).toHaveLength(1)
    expect(second[0].id).toBe('3')
    expect(queue.pending).toBe(0)

    // Third cycle — empty flush
    const third = queue.flush()
    expect(third).toEqual([])
  })

  it('flushed array is a copy, not a reference to internal state', () => {
    queue.enqueue(makeNotification('1'))
    const flushed = queue.flush()

    // Mutating the flushed array should not affect the queue
    flushed.push(makeNotification('2'))

    expect(queue.pending).toBe(0)
    expect(queue.flush()).toEqual([])
  })
})
