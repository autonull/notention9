import { 
  HelpEngine, 
  progressStore, 
  getProgressStore, 
  ProgressStore, 
  StepExecutor, 
  createStepExecutor,
  type HelpTopic, 
  type HelpCategory, 
  type HelpSearchResult, 
  type HelpProgress, 
  type HelpAnalyticsEvent, 
  type HelpSettings,
  type StepExecutionContext,
  type StepResult,
} from '@notention/core/help';

const VIDEO_BASE_URL = '/videos';

export const helpEngine = new HelpEngine({
  videoBaseUrl: VIDEO_BASE_URL,
});

export { progressStore, getProgressStore, ProgressStore, StepExecutor, createStepExecutor };
export type { HelpTopic, HelpCategory, HelpSearchResult, HelpProgress, HelpAnalyticsEvent, HelpSettings, StepExecutionContext, StepResult };

export async function initializeHelp(): Promise<void> {
  await helpEngine.initialize();
}