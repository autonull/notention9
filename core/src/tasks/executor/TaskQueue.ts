import { AutonomousTask, TaskPriority } from '../types.js';
import { generateId } from '../../utils/common.js';

interface QueueEntry {
  task: AutonomousTask;
  enqueuedAt: number;
  resolve: (value: AutonomousTask) => void;
  reject: (reason: Error) => void;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.LOW]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.HIGH]: 2,
  [TaskPriority.CRITICAL]: 3,
};

export class TaskQueue {
  private readonly queue: QueueEntry[] = [];
  private readonly maxConcurrent: number;
  private activeCount = 0;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue(task: AutonomousTask): Promise<AutonomousTask> {
    return new Promise((resolve, reject) => {
      const entry: QueueEntry = {
        task,
        enqueuedAt: Date.now(),
        resolve,
        reject,
      };

      const insertIndex = this.queue.findIndex(
        e => PRIORITY_ORDER[e.task.priority] < PRIORITY_ORDER[task.priority]
      );
      if (insertIndex === -1) {
        this.queue.push(entry);
      } else {
        this.queue.splice(insertIndex, 0, entry);
      }

      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      this.activeCount++;
      entry.resolve(entry.task);
    }
  }

  release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.processQueue();
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueuedCount(): number {
    return this.queue.length;
  }

  getAllQueued(): AutonomousTask[] {
    return this.queue.map(e => e.task);
  }

  remove(taskId: string): boolean {
    const index = this.queue.findIndex(e => e.task.id === taskId);
    if (index !== -1) {
      const entry = this.queue.splice(index, 1)[0];
      entry.reject(new Error(`Task ${taskId} removed from queue`));
      return true;
    }
    return false;
  }

  clear(): void {
    for (const entry of this.queue) {
      entry.reject(new Error('Queue cleared'));
    }
    this.queue.length = 0;
  }
}

export function createTaskQueue(maxConcurrent: number = 3): TaskQueue {
  return new TaskQueue(maxConcurrent);
}