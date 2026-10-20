export const NUMERIC_OPS = new Set([
  'less than', 'greater than', 'less than or equal', 'greater than or equal',
  '<', '>', '<=', '>=', 'between', 'range'
]);

export const DATE_OPS = new Set(['is after', 'is before', 'after', 'before']);

export const GEO_OPS = new Set(['is near', 'near']);

export const CANONICAL: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  py: 'python',
  python: 'python',
  react: 'react',
  reactjs: 'react',
  node: 'nodejs',
  nodejs: 'nodejs',
  dev: 'developer',
  developer: 'developer',
  engineer: 'developer',
  eng: 'engineer',
  swe: 'software engineer',
  'software engineer': 'software engineer',
  remote: 'remote',
  wfh: 'remote',
  distributed: 'remote',
};