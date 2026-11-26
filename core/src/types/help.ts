export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes: number;
  tags: string[];
  steps: HelpStep[];
  videoId?: string;
  interactiveDemo?: InteractiveDemoConfig;
  relatedTopics: string[];
  version: number;
  locale: string;
}

export interface HelpStep {
  id: string;
  type: 'action' | 'explanation' | 'validation' | 'choice' | 'branching';
  title: string;
  description: string;
  target?: HelpTarget;
  action?: HelpAction;
  validation?: HelpValidation;
  choices?: HelpChoice[];
  autoAdvance?: boolean;
  spotlight?: SpotlightConfig;
}

export interface HelpTarget {
  testId?: string;
  selector?: string;
  role?: string;
  name?: string;
  modal?: string;
}

export interface HelpAction {
  type: 'click' | 'fill' | 'hover' | 'scroll' | 'wait' | 'navigate';
  value?: string;
  options?: Record<string, unknown>;
}

export interface HelpValidation {
  type: 'stateEquals' | 'stateContains' | 'elementVisible' | 'elementExists' | 'custom';
  statePath?: string;
  expectedValue?: unknown;
  target?: HelpTarget;
  customValidator?: string;
}

export interface HelpChoice {
  id: string;
  label: string;
  description?: string;
  nextStepId: string;
  condition?: string;
}

export interface SpotlightConfig {
  enabled: boolean;
  target: HelpTarget;
  style?: 'highlight' | 'dim' | 'pulse';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  offset?: { x: number; y: number };
}

export interface InteractiveDemoConfig {
  component: string;
  props: Record<string, unknown>;
  instructions: string[];
  validationSteps: HelpStep[];
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  topicIds: string[];
}

export interface HelpProgress {
  topicId: string;
  startedAt: number;
  completedAt?: number;
  currentStepIndex: number;
  completedSteps: string[];
  stepAttempts: Record<string, number>;
  timeSpentMs: number;
  rating?: number;
  feedback?: string;
  lastAccessedAt: number;
}

export interface HelpSearchResult {
  topicId: string;
  title: string;
  category: string;
  snippet: string;
  score: number;
  matchedTags: string[];
}

export interface HelpEngineConfig {
  topicsPath: string;
  defaultLocale: string;
  supportedLocales: string[];
  searchIndexPath?: string;
  videoBaseUrl?: string;
}

export interface HelpAnalyticsEvent {
  type: 'topic_start' | 'topic_complete' | 'step_complete' | 'step_fail' | 'search' | 'video_play' | 'video_complete' | 'demo_start' | 'demo_complete' | 'feedback_submit' | 'contextual_trigger' | 'contextual_accept' | 'contextual_dismiss';
  topicId?: string;
  stepId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  sessionId: string;
}

export interface ContextualTrigger {
  id: string;
  name: string;
  condition: 'idle' | 'error' | 'feature_gate' | 'first_visit' | 'custom';
  config: Record<string, unknown>;
  targetTopicId: string;
  priority: number;
  cooldownMs: number;
  maxShowsPerSession: number;
  enabled: boolean;
}