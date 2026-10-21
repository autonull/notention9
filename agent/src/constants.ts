export const SYSTEM_TAGS = {
  SKILL_DEFINITION: '@skill:definition',
  CONFIG_ACTIVE: '@config:active',
  ONBOARDING_SETUP: '@onboarding:setup',
  ONTOLOGY_BASE: '@ontology:base',
} as const;

export const CONFIG_KEYS = {
  DIRECT: new Set(['llm_model', 'llm_provider', 'debug_mode', 'voice_enabled']),
  META: new Set(['config', 'setting']),
} as const;

export const DEFAULT_PORTS = {
  AGENT: 3000,
  RELAY: 7000,
  UI: 5173,
} as const;

export const DATA_PATHS = {
  NOTES_DIR: 'data',
  NOTES_FILE: 'notes.json',
  CONFIG_FILE: 'config/agents.json',
  SKILLS_DIR: 'src/skills/installed',
} as const;

export const MCP_PATHS = {
  SSE: '/mcp/sse',
  MESSAGE: '/mcp/message',
  WS_AGENT: '/ws/agent',
  RELAY: '/relay',
} as const;

export const LOG_CONTEXTS = {
  SYSTEM: 'System',
  SERVER: 'Server',
  WS: 'WS',
  MCP: 'MCP',
  RELAY: 'Relay',
  INIT: 'Init',
  CONFIG: 'Config',
  PLUGIN: 'PluginLoader',
  SKILL: 'SkillLoader',
} as const;