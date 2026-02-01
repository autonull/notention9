/**
 * Custom error classes for the Notention system
 */

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class OntologyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OntologyError';
    }
}

export class PropertyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PropertyValidationError';
    }
}

export class SkillExecutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SkillExecutionError';
    }
}

export class NetworkTransmissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkTransmissionError';
    }
}