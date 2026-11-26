export { HelpEngine, helpEngine } from './HelpEngine.js';
export { StepExecutor, createStepExecutor, type StepExecutionContext, type StepResult } from './StepExecutor.js';
export { ProgressStore, progressStore, type HelpSettings } from './ProgressStore.js';
export { TopicLoader, createTopicLoader, type TopicLoaderOptions } from './TopicLoader.js';
export { VideoPlayer, createVideoPlayer, type VideoMetadata, type VideoChapter, type VideoPlayerState, type VideoPlayerEvent } from './VideoPlayer.js';
export { InteractiveExample, createInteractiveExample, ComponentSandbox, createComponentSandbox, type InteractiveExampleState, type SandboxConfig } from './InteractiveExample.js';
export { validateHelpTopic } from './validation.js';
export { PluginHelpIntegration, pluginHelpIntegration, type PluginHelpConfig } from './PluginHelpIntegration.js';

export type { 
  HelpTopic, 
  HelpStep, 
  HelpTarget, 
  HelpAction, 
  HelpValidation, 
  HelpChoice, 
  SpotlightConfig,
  InteractiveDemoConfig,
  HelpCategory,
  HelpProgress,
  HelpSearchResult,
  HelpEngineConfig,
  HelpAnalyticsEvent,
  ContextualTrigger,
} from '../types/help.js';