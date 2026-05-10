import type { Note } from '../types/index.js';

/**
 * Task status lifecycle states
 */
export enum TaskStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

/**
 * Task priority levels for scheduling and execution ordering
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Authorization configuration for autonomous task execution
 */
export interface TaskAuthorization {
  userId: string;
  authorizedActions: string[]; // List of actions the agent is authorized to perform
  autoApproveThreshold: number; // Confidence threshold for auto-approval
  requiresConfirmation: boolean; // Whether user confirmation is required
  maxExecutionTime: number; // Maximum time in milliseconds for task execution
  budgetLimit?: number; // Maximum cost allowed for this task
}

/**
 * Autonomous task representation
 * 
 * Tasks are created from pattern recognition predictions and can execute
 * automatically based on confidence levels and user authorization settings.
 */
export interface AutonomousTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  noteContext: Note; // The note that triggered this task
  predictedAction: string; // The action predicted by the pattern recognition system
  confidence: number; // Confidence level in the prediction (0.0 to 1.0)
  status: TaskStatus;
  priority: TaskPriority;
  authorization: TaskAuthorization;
  assignedAgent?: string; // Which agent is assigned to execute this task
  startTime?: number;
  endTime?: number;
  result?: any; // Result of task execution
  error?: string; // Error message if task failed
  requiresUserConfirmation?: boolean; // Whether user confirmation is needed before execution
  confirmationReceived?: boolean; // Whether user confirmed the task
  retryCount: number;
  maxRetries: number;
}

/**
 * Result of autonomous task execution
 */
export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

/**
 * Configuration for the autonomous task scheduler
 */
export interface TaskSchedulerConfig {
  maxConcurrentTasks: number;
  taskRetryLimit: number;
  defaultPriority: TaskPriority;
  autoApprovalEnabled: boolean;
  confirmationRequiredThreshold: number; // Confidence threshold above which confirmation is required
}
