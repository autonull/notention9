import type { Property } from '../../types/index.js';
import { OntologyService } from '../../ontology/ontologyService.js';
import { REGEX } from '../parsing/index.js';
import {
  PATTERNS,
  INTENTS,
  LOCATION_PATTERNS,
  DATE_PATTERNS,
  STOP_WORDS
} from './patterns.js';

export const extractIntents = (text: string): Property[] =>
  INTENTS
    .filter(intent => intent.regex.test(text))
    .map(intent => ({ key: 'intent', operator: 'is', values: [intent.key] }));

export const extractRegexProps = (text: string, ontologyService: OntologyService): Property[] => {
  const props: Property[] = [];

  const sendToMatch = text.match(PATTERNS.SEND_TO);
  if (sendToMatch) props.push({ key: 'to', operator: 'send to', values: [sendToMatch[1]] });

  const channelMatch = text.match(PATTERNS.CHANNEL);
  if (channelMatch) {
    const channel = channelMatch[1].toLowerCase();
    if (ontologyService.getEnumOptions('channel')?.includes(channel)) {
      props.push({ key: 'channel', operator: 'is', values: [channel] });
    }
  }

  const phoneMatch = text.match(REGEX.PHONE);
  if (phoneMatch && !props.some(p => p.key === 'to')) {
    props.push({ key: 'from', operator: 'is', values: [phoneMatch[1]] });
  }

  const emailMatch = text.match(REGEX.EMAIL);
  if (emailMatch) props.push({ key: 'email', operator: 'is', values: [emailMatch[1]] });

  const budgetMatch = text.match(REGEX.BUDGET);
  if (budgetMatch) {
    const amount = (budgetMatch[1] || budgetMatch[2]).replace(/,/g, '');
    props.push({ key: 'budget', operator: 'is', values: [amount] });
  }

  return props;
};

export const extractLocation = (text: string): Property[] => {
  const match = LOCATION_PATTERNS.find(p => p.regex.test(text));
  if (!match) return [];
  const location = text.match(match.regex)![0].replace(match.prefix, '').trim();
  return [{ key: 'location', operator: 'is near', values: [location] }];
};

export const extractDate = (text: string): Property[] => {
  const pattern = DATE_PATTERNS.find(p => p.regex.test(text));
  if (!pattern) return [];

  const date = new Date();
  date.setDate(date.getDate() + pattern.offset);
  return [{ key: 'date', operator: 'is', values: [date.toISOString().split('T')[0]] }];
};

export const extractFuzzy = (text: string, ontologyService: OntologyService): Property[] => {
  const words = text.split(/\s+/);
  const existingKeys = new Set<string>();

  return words.slice(0, -1).flatMap((word, i) => {
    if (word.length <= 3) return [];
    const [match] = ontologyService.getFuzzyMatches(word, 1);
    if (!match || existingKeys.has(match)) return [];

    const nextWord = words[i + 1];
    if (nextWord.length > 2 && !STOP_WORDS.has(nextWord.toLowerCase())) {
      existingKeys.add(match);
      return [{ key: match, operator: 'contains', values: [nextWord] }];
    }
    return [];
  });
};