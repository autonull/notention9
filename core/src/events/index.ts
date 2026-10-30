export {
    EventEmitter,
    eventEmitter,
    type EventCategory,
    type BaseEvent,
    type ExtractionEvent,
    type MatchEvent,
    type StrategyEvent,
    type ErrorEvent,
    type PerformanceEvent,
    type LifecycleEvent,
    type AnyEvent,
    type EventSink,
    type EventEmitterConfig,
} from './EventEmitter.js';

export {
    ConsoleSink,
    consoleSink,
    type ConsoleSinkOptions,
} from './ConsoleSink.js';

export {
    FileSink,
    type FileSinkOptions,
} from './FileSink.js';

export {
    RemoteSink,
    type RemoteSinkOptions,
} from './RemoteSink.js';