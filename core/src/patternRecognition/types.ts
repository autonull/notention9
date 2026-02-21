import { Note, Property } from '../types/index.js';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  conditions: Property[];
  predictedActions: string[]; // Actions the system predicts the user will take
  confidence: number; // 0.0 to 1.0
  lastUsed: number;
  usageCount: number;
  accuracyRate: number; // Track how often predictions are accurate
}

export interface UserBehaviorPattern {
  userId: string;
  patterns: Pattern[];
  lastUpdated: number;
}

export interface Prediction {
  pattern: Pattern;
  noteContext: Note;
  predictedAction: string;
  confidence: number;
  timestamp: number;
}

export interface PredictionResult {
  prediction: Prediction;
  wasAccurate: boolean; // Whether the prediction matched user's actual behavior
  feedback?: string; // Optional user feedback
}
