
export class Capabilities {
    private static instance: Capabilities;
    private flags: Map<string, boolean> = new Map();

    private constructor() {
        // Defaults: Secure by default
        this.flags.set('browser', false);
        this.flags.set('files', false);
        this.flags.set('api', true);
    }

    public static getInstance(): Capabilities {
        if (!Capabilities.instance) {
            Capabilities.instance = new Capabilities();
        }
        return Capabilities.instance;
    }

    public set(feature: string, enabled: boolean) {
        this.flags.set(feature, enabled);
    }

    public isEnabled(feature: string): boolean {
        return this.flags.get(feature) || false;
    }

    public reset() {
        this.flags.set('browser', false);
        this.flags.set('files', false);
        this.flags.set('api', true);
    }
}
