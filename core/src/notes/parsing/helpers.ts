import type { Property, OntologyNode } from '../../types/index.js';
import { resolveAlias } from '../../ontology/propertyAliases.js';
import { getCanonicalKey } from '../../ontology/ontologyHelpers.js';
import { Logger } from '../../utils/logging.js';
import { REGEX, COMMON_WORDS } from './constants.js';

const resolveKey = (key: string, ontology?: OntologyNode[]): string =>
  ontology ? getCanonicalKey(key, ontology) : resolveAlias(key);

const isValidKey = (key: string): boolean => REGEX.VALID_KEY.test(key) && !COMMON_WORDS.has(key.toLowerCase());

const logger = Logger.getInstance();

export const parseValues = (raw: string): string[] =>
  raw.trim().split(',').map(v => v.trim());

export const createProperty = (rawKey: string, operator: string, value: string, ontology?: OntologyNode[], validate = true): Property | null => {
  const key = resolveKey(rawKey.trim(), ontology);
  if (validate && !isValidKey(key)) {
    logger.debug('Property parse skipped', { rawKey, reason: 'invalid key', isCommonWord: COMMON_WORDS.has(key.toLowerCase()), invalidFormat: !REGEX.VALID_KEY.test(key) });
    return null;
  }
  return { key, operator: operator.trim(), values: parseValues(value) };
};