import { NetworkProvider, NetworkRegistry } from './types.js';

class DefaultNetworkRegistry implements NetworkRegistry {
    private providers = new Map<string, NetworkProvider>();

    registerProvider(provider: NetworkProvider): void {
        this.providers.set(provider.id, provider);
    }

    getProvider(id: string): NetworkProvider | undefined {
        return this.providers.get(id);
    }

    getAllProviders(): NetworkProvider[] {
        return Array.from(this.providers.values());
    }

    getActiveProviders(): NetworkProvider[] {
        return this.getAllProviders().filter(p => p.enabled && p.isSupported());
    }
}

export const networkRegistry = new DefaultNetworkRegistry();
