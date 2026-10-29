// Forward references to avoid circular dependency
export interface UXMetric {
  name: string;
  value: number;
  unit: string;
  description: string;
  threshold?: { min?: number; max?: number; target?: number; unit?: string };
}

export interface UXIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: 'matching' | 'navigation' | 'visibility' | 'feedback' | 'accessibility' | 'performance';
  description: string;
  affectedAgents: string[];
  suggestedFix: string;
}

export interface ScenarioUXReport {
  scenarioName: string;
  domain: string;
  agentCount: number;
  eventCount: number;
  duration: number;
  metrics: UXMetric[];
  issues: UXIssue[];
  recommendations: string[];
  overallScore: number;
}

export type SuggestionType =
  | 'ui-component-prop'
  | 'ui-flow-change'
  | 'ui-new-component'
  | 'ui-variant'
  | 'ui-removal'
  | 'ontology-add-property'
  | 'ontology-modify-property'
  | 'ontology-remove-property'
  | 'ontology-add-hierarchy'
  | 'ontology-modify-operator'
  | 'ontology-add-constraint'
  | 'ontology-deprecate';

export type SuggestionSeverity = 'critical' | 'major' | 'minor' | 'experimental';
export type SuggestionStatus = 'proposed' | 'reviewed' | 'approved' | 'rejected' | 'implemented' | 'tested' | 'rolled-back';

export interface MetricEvidence {
  metricName: string;
  value: number;
  threshold: { min?: number; max?: number; target?: number };
  severity: 'below-min' | 'above-max' | 'off-target';
  scenario: string;
  domain: string;
}

export interface OntologyEvidence {
  propertyKey: string;
  operator?: string;
  frequency: number;
  correlation?: number;
  scenarios: string[];
  domains: string[];
  pattern: 'high-usage' | 'co-occurrence' | 'never-matched' | 'low-relevance' | 'missing-constraint';
}

export interface ImpactEstimate {
  matchRelevanceDelta: number;
  timeToMatchDelta: number;
  acceptanceRateDelta: number;
  engagementDelta: number;
  clarityDelta: number;
  confidence: number;  // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  effort: 'trivial' | 'small' | 'medium' | 'large' | 'major';
}

export interface UIChangeProposal {
  component: string;
  changeType: 'prop' | 'variant' | 'flow' | 'component' | 'theme';
  currentValue?: unknown;
  proposedValue: unknown;
  variant?: string;
  flowId?: string;
  flowStepIndex?: number;
  rationale: string;
}

export interface OntologyChangeProposal {
  path: string;
  changeType: 'add' | 'modify' | 'remove' | 'deprecate';
  currentValue?: unknown;
  proposedValue: unknown;
  constraints?: Record<string, unknown>;
  rationale: string;
}

export interface UISuggestion {
  id: string;
  type: SuggestionType;
  severity: SuggestionSeverity;
  status: SuggestionStatus;
  title: string;
  description: string;
  evidence: MetricEvidence[];
  targetComponent: string;
  proposedChange: UIChangeProposal;
  estimatedImpact: ImpactEstimate;
  testScenario: string;
  testDomain: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  implementedAt?: Date;
  implementedBy?: string;
  testResults?: SuggestionTestResult[];
  metadata?: Record<string, unknown>;
}

export interface OntologySuggestion {
  id: string;
  type: SuggestionType;
  severity: SuggestionSeverity;
  status: SuggestionStatus;
  title: string;
  description: string;
  evidence: OntologyEvidence[];
  targetNode: string;
  proposedChange: OntologyChangeProposal;
  estimatedImpact: ImpactEstimate;
  testScenarios: string[];
  testDomains: string[];
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  implementedAt?: Date;
  implementedBy?: string;
  testResults?: SuggestionTestResult[];
  metadata?: Record<string, unknown>;
}

export type ExtensibilitySuggestion = UISuggestion | OntologySuggestion;

export interface SuggestionTestResult {
  testRunId: string;
  scenario: string;
  uiVariant: string;
  ontologyVariant: string;
  metrics: Record<string, number>;
  passed: boolean;
  issues: string[];
  timestamp: Date;
}

export interface SuggestionFilter {
  type?: SuggestionType[];
  severity?: SuggestionSeverity[];
  status?: SuggestionStatus[];
  component?: string;
  domain?: string;
  scenario?: string;
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface SuggestionStore {
  // UI Suggestions
  saveUISuggestion(suggestion: UISuggestion): Promise<void>;
  getUISuggestion(id: string): Promise<UISuggestion | null>;
  listUISuggestions(filter?: SuggestionFilter): Promise<UISuggestion[]>;
  updateUISuggestion(id: string, updates: Partial<UISuggestion>): Promise<void>;
  deleteUISuggestion(id: string): Promise<void>;

  // Ontology Suggestions
  saveOntologySuggestion(suggestion: OntologySuggestion): Promise<void>;
  getOntologySuggestion(id: string): Promise<OntologySuggestion | null>;
  listOntologySuggestions(filter?: SuggestionFilter): Promise<OntologySuggestion[]>;
  updateOntologySuggestion(id: string, updates: Partial<OntologySuggestion>): Promise<void>;
  deleteOntologySuggestion(id: string): Promise<void>;

  // Unified
  listAllSuggestions(filter?: SuggestionFilter): Promise<ExtensibilitySuggestion[]>;
  getSuggestion(id: string): Promise<ExtensibilitySuggestion | null>;
  updateSuggestionStatus(id: string, status: SuggestionStatus, user?: string): Promise<void>;
  addTestResult(id: string, result: SuggestionTestResult): Promise<void>;
}

export function generateSuggestionId(type: 'ui' | 'ontology', evidence: MetricEvidence[] | OntologyEvidence[]): string {
  const prefix = type === 'ui' ? 'ui-sugg' : 'onto-sugg';
  const hash = evidence.map(e => JSON.stringify(e)).join('|');
  const shortHash = hash.length > 50 ? hash.slice(0, 50) : hash;
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}-${shortHash.split('').reduce((a, b) => a + b.charCodeAt(0), 0).toString(36)}`;
}

export function isUISuggestion(s: ExtensibilitySuggestion): s is UISuggestion {
  return 'targetComponent' in s;
}

export function isOntologySuggestion(s: ExtensibilitySuggestion): s is OntologySuggestion {
  return 'targetNode' in s;
}