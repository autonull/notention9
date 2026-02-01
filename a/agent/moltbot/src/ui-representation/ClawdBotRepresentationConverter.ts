import {
  AgentRepresentation,
  AgentStatistics,
  TriggerRepresentation,
  ActionRepresentation,
  ConditionRepresentation,
  RepresentationConverter
} from './UIMappingInterfaces';

export class ClawdBotRepresentationConverter implements RepresentationConverter {

  toAgentRepresentation(config: any): AgentRepresentation {
    // Convert a ClawdBot configuration to a UI-friendly representation
    return {
      id: config.id || `agent-${Date.now()}`,
      name: config.name || config.id || 'Unnamed Agent',
      description: config.description || config.settings?.description || 'No description',
      status: this.convertStatus(config.status || config.settings?.status || 'active'),
      type: config.type || config.settings?.type || 'generic',
      createdAt: config.createdAt || new Date().toISOString(),
      lastRun: config.lastRun,
      nextRun: config.nextRun,
      triggers: this.convertTriggers(config.triggers || []),
      actions: this.convertActions(config.actions || []),
      conditions: this.convertConditions(config.conditions || config.settings?.conditions || []),
      statistics: this.convertStatistics(config.statistics)
    };
  }

  fromAgentRepresentation(representation: AgentRepresentation): any {
    // Convert UI representation back to ClawdBot configuration
    return {
      id: representation.id,
      name: representation.name,
      description: representation.description,
      type: representation.type,
      status: representation.status,
      createdAt: representation.createdAt,
      lastRun: representation.lastRun,
      nextRun: representation.nextRun,
      triggers: representation.triggers,
      actions: representation.actions,
      conditions: representation.conditions,
      statistics: representation.statistics,
      settings: {
        ...representation,
        status: representation.status,
        type: representation.type,
        description: representation.description
      }
    };
  }

  updateRepresentation(current: AgentRepresentation, newData: any): AgentRepresentation {
    // Update an existing representation with new data
    return {
      ...current,
      ...newData,
      triggers: newData.triggers || current.triggers,
      actions: newData.actions || current.actions,
      conditions: newData.conditions || current.conditions,
      statistics: newData.statistics || current.statistics
    };
  }

  createDefaultRepresentation(type: string): AgentRepresentation {
    // Create a default representation for a new agent
    const now = new Date().toISOString();

    return {
      id: `new-agent-${Date.now()}`,
      name: `New ${type} Agent`,
      description: `A new ${type} agent`,
      status: 'inactive',
      type,
      createdAt: now,
      triggers: [],
      actions: [],
      conditions: [],
      statistics: {
        runs: 0,
        successes: 0,
        failures: 0
      }
    };
  }

  private convertStatus(status: string): 'active' | 'inactive' | 'paused' | 'error' {
    switch (status.toLowerCase()) {
      case 'running':
      case 'active':
      case 'enabled':
        return 'active';
      case 'stopped':
      case 'inactive':
      case 'disabled':
        return 'inactive';
      case 'paused':
      case 'suspended':
        return 'paused';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'inactive';
    }
  }

  private convertTriggers(triggers: any[]): TriggerRepresentation[] {
    return triggers.map(trigger => ({
      id: trigger.id || `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: trigger.type || 'unknown',
      description: trigger.description || trigger.expression || 'Trigger',
      enabled: trigger.enabled ?? true,
      configuration: trigger.configuration || trigger.parameters || {},
      lastTriggered: trigger.lastTriggered
    }));
  }

  private convertActions(actions: any[]): ActionRepresentation[] {
    return actions.map(action => ({
      id: action.id || `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: action.type || 'unknown',
      description: action.description || action.expression || 'Action',
      enabled: action.enabled ?? true,
      configuration: action.configuration || action.parameters || {},
      lastExecuted: action.lastExecuted,
      lastResult: action.lastResult
    }));
  }

  private convertConditions(conditions: any[]): ConditionRepresentation[] {
    return conditions.map(condition => ({
      id: condition.id || `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: condition.type || 'unknown',
      expression: condition.expression || '',
      description: condition.description || condition.expression || 'Condition',
      currentValue: condition.currentValue,
      lastEvaluated: condition.lastEvaluated,
      satisfied: condition.satisfied ?? false
    }));
  }

  private convertStatistics(stats: any): AgentStatistics | undefined {
    if (!stats) return undefined;

    return {
      runs: stats.runs || stats.executionCount || 0,
      successes: stats.successes || stats.successCount || 0,
      failures: stats.failures || stats.failureCount || 0,
      lastError: stats.lastError,
      avgRuntime: stats.avgRuntime
    };
  }
}