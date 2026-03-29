import { parseProperties } from '../src/parsing.js';
import { describe, it, expect } from 'vitest';

describe('Property Composition (Macros)', () => {

    it('should expand @freelancer macro', () => {
        const props = parseProperties('Looking for @freelancer');

        // @freelancer -> [role:is:freelancer], [available:is:true]
        expect(props).toHaveLength(2);

        const roleProp = props.find(p => p.key === 'role');
        expect(roleProp).toBeDefined();
        expect(roleProp?.values).toEqual(['freelancer']);

        const availProp = props.find(p => p.key === 'available');
        expect(availProp).toBeDefined();
        expect(availProp?.values).toEqual(['true']);
    });

    it('should expand macro alongside standard properties', () => {
        const props = parseProperties('Need @urgent work [skill:is:react]');

        // @urgent -> [priority:is:high], [status:is:active]
        // + [skill:is:react]
        expect(props).toHaveLength(3);

        const priority = props.find(p => p.key === 'priority');
        expect(priority?.values).toEqual(['high']);

        const skill = props.find(p => p.key === 'skill');
        expect(skill?.values).toEqual(['react']);
    });

    it('should ignore unknown macros', () => {
        const props = parseProperties('Hello @world');
        // @world is not defined, should return empty array
        expect(props).toHaveLength(0);
    });
});
