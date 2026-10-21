import { ProviderFactory } from './providers/factory.js';
import { configManager } from './config-manager.js';
import { withSpinner } from './utils.js';
import { log } from './utils.js';
import type { LLMProviderConfig } from './providers/base.js';
import type { AppConfig } from './config-manager.js';

export interface SwitchProviderOptions {
  providerName: string;
  modelOverride?: string;
  currentConfig: AppConfig | Omit<LLMProviderConfig, 'apiKey'>;
  onSuccess?: (providerName: string) => void;
  onError?: (error: Error) => void;
}

export async function switchProvider(options: SwitchProviderOptions): Promise<boolean> {
  const { providerName, modelOverride, currentConfig, onSuccess, onError } = options;

  try {
    const newConfigData: LLMProviderConfig = {
      provider: providerName,
      model: modelOverride || currentConfig.model || configManager.getDefaultModel(providerName),
      baseURL: currentConfig.baseURL,
      apiKey: 'apiKey' in currentConfig ? currentConfig.apiKey : undefined,
      temperature: currentConfig.temperature ?? 0.7,
      maxTokens: currentConfig.maxTokens ?? 2000
    };

    const validation = configManager.validateConfig(newConfigData as AppConfig);
    if (!validation.valid) {
      log.error('Configuration validation failed:');
      validation.errors.forEach(err => log.error(`  - ${err}`));
      onError?.(new Error('Configuration validation failed'));
      return false;
    }

    const newProvider = ProviderFactory.create(newConfigData);

    const healthResult = await withSpinner(
      `Connecting to ${providerName}...`,
      () => newProvider.healthCheck()
    );

    if (!healthResult.healthy) {
      log.error(`Provider health check failed: ${healthResult.message}`);
      log.warn('Provider not switched.');
      onError?.(new Error(healthResult.message || 'Health check failed'));
      return false;
    }

    configManager.saveConfig({
      provider: providerName,
      model: newConfigData.model
    });

    onSuccess?.(providerName);
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    log.error('Failed to switch provider', error);
    onError?.(error);
    return false;
  }
}

export function listProviders(): void {
  const providers = ProviderFactory.getSupportedProviders();
  log.info('Supported providers:');
  providers.forEach(provider => {
    const desc = ProviderFactory.getProviderDescription(provider);
    console.log(`  ${provider}: ${desc}`);
  });
}

export function showCurrentProvider(config: AppConfig | Omit<LLMProviderConfig, 'apiKey'>): void {
  console.log(`Current provider: ${config.provider || 'default'}`);
}