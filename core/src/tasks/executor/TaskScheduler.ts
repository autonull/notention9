import { AutonomousTask, TaskSchedulerConfig } from '../types.js';
import { generateId } from '../../utils/common.js';
import { logInfo } from '../../utils/logging.js';

export interface ScheduledTask {
  id: string;
  task: AutonomousTask;
  cronExpression?: string;
  intervalMs?: number;
  nextRun: number;
  timerId?: ReturnType<typeof setTimeout>;
}

export class TaskScheduler {
  private readonly scheduledTasks: Map<string, ScheduledTask> = new Map();
  private readonly config: TaskSchedulerConfig;

  constructor(config: TaskSchedulerConfig) {
    this.config = config;
  }

  scheduleTask(task: AutonomousTask, cronExpression: string): string {
    const scheduledId = generateId('sched_');
    const nextRun = this.parseCronNextRun(cronExpression);

    const scheduled: ScheduledTask = {
      id: scheduledId,
      task,
      cronExpression,
      nextRun,
    };

    this.scheduledTasks.set(scheduledId, scheduled);
    this.scheduleNextRun(scheduled);

    logInfo(`Task scheduled`, { scheduledId, taskId: task.id, cronExpression });
    return scheduledId;
  }

  scheduleInterval(task: AutonomousTask, intervalMs: number): string {
    const scheduledId = generateId('sched_');

    const scheduled: ScheduledTask = {
      id: scheduledId,
      task,
      intervalMs,
      nextRun: Date.now() + intervalMs,
    };

    this.scheduledTasks.set(scheduledId, scheduled);
    this.scheduleNextRun(scheduled);

    logInfo(`Interval task scheduled`, { scheduledId, taskId: task.id, intervalMs });
    return scheduledId;
  }

  unschedule(scheduledId: string): boolean {
    const scheduled = this.scheduledTasks.get(scheduledId);
    if (!scheduled) return false;

    if (scheduled.timerId) {
      clearTimeout(scheduled.timerId);
    }
    this.scheduledTasks.delete(scheduledId);
    return true;
  }

  getScheduled(scheduledId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(scheduledId);
  }

  getAllScheduled(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  private scheduleNextRun(scheduled: ScheduledTask): void {
    const delay = Math.max(0, scheduled.nextRun - Date.now());
    scheduled.timerId = setTimeout(() => this.executeScheduled(scheduled), delay);
  }

  private async executeScheduled(scheduled: ScheduledTask): Promise<void> {
    try {
      scheduled.task.status = 'executing' as any;
      await this.executeTask(scheduled.task);

      if (scheduled.cronExpression) {
        scheduled.nextRun = this.parseCronNextRun(scheduled.cronExpression);
        this.scheduleNextRun(scheduled);
      } else if (scheduled.intervalMs) {
        scheduled.nextRun = Date.now() + scheduled.intervalMs;
        this.scheduleNextRun(scheduled);
      }
    } catch (error) {
      logInfo(`Scheduled task execution failed`, { scheduledId: scheduled.id, error: error as Error });
      if (scheduled.intervalMs || scheduled.cronExpression) {
        this.scheduleNextRun(scheduled);
      }
    }
  }

  protected async executeTask(task: AutonomousTask): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { action: task.predictedAction, noteId: task.noteContext.id, timestamp: Date.now() };
  }

  private parseCronNextRun(cron: string): number {
    return Date.now() + 60000;
  }

  clear(): void {
    for (const scheduled of this.scheduledTasks.values()) {
      if (scheduled.timerId) clearTimeout(scheduled.timerId);
    }
    this.scheduledTasks.clear();
  }
}

export function createTaskScheduler(config: TaskSchedulerConfig): TaskScheduler {
  return new TaskScheduler(config);
}