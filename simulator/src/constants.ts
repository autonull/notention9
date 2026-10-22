export const DEFAULT_PORTS = {
  relay: 4444,
  dashboard: 8000,
  ui: 5173,
  movieUI: 3000,
} as const;

export const DEFAULT_MOVIE_OPTIONS = {
  framerate: 2,
  resolution: { width: 1920, height: 1080 },
  view: 'dashboard' as const,
} as const;

export const UI_SERVER_CONFIG = {
  checkInterval: 1000,
  startupTimeout: 30000,
} as const;

export const SIMULATION_CONFIG = {
  agentSpawnDelay: 100,
  postSimulationDelay: 2000,
  eventMatchThreshold: 0.5,
  subscriptionLimit: 50,
  kinds: [1, 35000] as const,
} as const;

export const SCENARIO_DEFAULTS = {
  generatedAgentCount: 5,
  generatedDuration: 30,
  eventInterval: 2,
} as const;

export const MOVIE_SERVER_CONFIG = {
  dashboardPortBase: 4000,
  dashboardPortRange: 1000,
} as const;

export const AGENT_COLORS = [
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
] as const;

export const ROLES = ['Developer', 'Designer', 'Client', 'Manager', 'Analyst'] as const;
export const SKILLS = ['react', 'typescript', 'python', 'design', 'management', 'sql', 'figma'] as const;
export const LOCATIONS = ['Remote', 'New York', 'London', 'Berlin', 'San Francisco'] as const;
export const INPUT_METHODS = ['raw', 'autocomplete', 'form'] as const;

export const FILE_PATTERNS = {
  frame: 'frame_%05d.png',
  frameFile: (n: number) => `frame_${String(n).padStart(5, '0')}.png`,
} as const;