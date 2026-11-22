import React, { useState, useEffect } from 'react';
import { useNetworkManagement } from '../../hooks/useNetworkManagement';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import { GlobeIcon, SignalIcon, LoadingSpinner, LockIcon } from '../ui/icons';
import { agentService } from '../../services/AgentService';
import { useToast } from '../../hooks/useToast';
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { networkRegistry, MeshtasticNetworkProvider } from '@notention/core';
import { cn } from '../../utils/ui';

export function NetworkManagementSection() {
    const {
        providers,
        toggleProvider,
        updateProviderSettings,
        setPrivacyMode,
        isPrivateMode,
        meshtasticSettings,
        nostrSettings
    } = useNetworkManagement();
    const [meshPort, setMeshPort] = useState(meshtasticSettings.port || '/dev/ttyUSB0');
    const [connectionType, setConnectionType] = useState<'webserial' | 'server-proxy'>(meshtasticSettings.connectionType as 'webserial' | 'server-proxy' || 'webserial');
    const [isConnecting, setIsConnecting] = useState(false);
    const [meshStatus, setMeshStatus] = useState<{connected: boolean}>({ connected: false });
    const { addToast } = useToast();

    useEffect(() => {
        const provider = networkRegistry.getProvider('meshtastic');
        if (provider) {
            const errorHandler = (err: Error) => {
                addToast(`Mesh Error: ${err.message}`, 'error');
            };
            provider.on('error', errorHandler);
            return () => provider.off('error', errorHandler);
        }
    }, [addToast]);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (connectionType === 'server-proxy' && agentService.isConnected) {
                try {
                    const status = await agentService.getMeshStatus();
                    setMeshStatus(status);
                } catch (e) {}
            } else if (connectionType === 'webserial') {
                const provider = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
                if (provider) {
                    setMeshStatus({ connected: provider.getStatus().connected });
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [connectionType]);

    const handleConnect = async () => {
        setIsConnecting(true);
        updateProviderSettings('meshtastic', { connectionType, port: meshPort });
        try {
            if (connectionType === 'server-proxy') {
                await agentService.meshConnect(meshPort);
                addToast('Connected to mesh via Agent', 'success');
            } else {
                // WebSerial Connection
                const transport = await TransportWebSerial.create();
                const device = new MeshDevice(transport);

                const provider = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
                if (provider) {
                    provider.setTransport({
                        send: async (data: Uint8Array) => {
                            // @ts-expect-error - MeshDevice API
                            await device.sendPacket({
                                data: { data, portnum: 120 },
                                destination: 0xFFFFFFFF
                            });
                        },
                        onData: (callback) => {
                            // @ts-expect-error - MeshDevice API
                            device.onTextPacket((packet: any) => {
                                if (packet.data.data) {
                                    callback(packet.data.data as Uint8Array, packet.from.toString());
                                }
                            });
                        }
                    });

                    // Listen for telemetry/position in WebSerial mode as well
                    // @ts-expect-error - MeshDevice API
                    device.onTelemetryPacket(async (packet: any) => {
                        const nodeId = packet.from.toString();
                        provider.handleTelemetry(nodeId, packet.data);
                    });

                    // @ts-expect-error - MeshDevice API
                    device.onPositionPacket(async (packet: any) => {
                        const nodeId = packet.from.toString();
                        provider.handlePosition(nodeId, packet.data);
                    });
                }

                addToast('WebSerial mesh device connected', 'success');
                setMeshStatus({ connected: true });
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            addToast(`Connection failed: ${message}`, 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Privacy Mode Toggle */}
            <div className="p-4 rounded-lg border bg-neutral-800/50 border-neutral-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPrivateMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            <LockIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-neutral-100">Local-Only Mode</h4>
                            <p className="text-sm text-neutral-400">
                                {isPrivateMode 
                                    ? 'All network providers disabled. No data leaves this device. Notes sync when re-enabled.' 
                                    : 'Network providers can connect and sync data. Nostr and Meshtastic are available.'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isPrivateMode}
                            onChange={(e) => setPrivacyMode(e.target.checked ? 'local-only' : 'shared')}
                        />
                        <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                        <span className={`ml-3 text-sm font-medium ${isPrivateMode ? 'text-yellow-400' : 'text-neutral-400'}`}>
                            {isPrivateMode ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <GlobeIcon className="h-5 w-5 text-blue-400" />
                        Network Providers
                    </h3>
                    <p className="text-sm text-neutral-400">Enable or disable external network protocols.</p>
                </div>
            </div>

            <div className="divide-y divide-neutral-800 overflow-hidden rounded-xl border border-neutral-800">
                {providers.map(provider => {
                    const status = provider.getStatus();
                    const statusLabel = status.details || (status.connected ? 'Connected' : provider.enabled ? 'Enabled' : 'Disabled');
                    const publishEnabled = provider.id === 'nostr'
                        ? nostrSettings?.publishEnabled !== false
                        : meshtasticSettings?.publishEnabled === true;
                    const providerId = provider.id === 'nostr' ? 'nostr' : 'meshtastic';
                    return (
                        <div key={provider.id}>
                            <div className="flex items-center gap-3 bg-neutral-900/40 px-4 py-3">
                                <div className={`rounded-lg p-2 ${provider.enabled ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-900 text-neutral-500'}`}>
                                    {provider.id === 'nostr' ? <GlobeIcon className="h-5 w-5"/> : <SignalIcon className="h-5 w-5"/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-sm font-medium text-neutral-100">{provider.name}</h4>
                                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-meta text-neutral-400">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.connected ? 'bg-green-500' : provider.enabled ? 'bg-blue-400' : 'bg-neutral-600'}`}/>
                                        <span>{statusLabel}</span>
                                        <span className="text-neutral-600">·</span>
                                        <span>{publishEnabled ? 'Publishing enabled' : 'Publishing off'}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-pressed={publishEnabled}
                                    onClick={() => updateProviderSettings(providerId, {publishEnabled: !publishEnabled})}
                                    className={cn(
                                        'hidden h-8 shrink-0 rounded-lg px-2 text-meta transition-colors sm:block',
                                        publishEnabled ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-800'
                                    )}
                                >
                                    Publish target
                                </button>
                                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        role="switch"
                                        className="peer sr-only"
                                        checked={provider.enabled}
                                        onChange={(event) => toggleProvider(provider.id, event.target.checked)}
                                        disabled={isPrivateMode}
                                        aria-label={`Enable ${provider.name}`}
                                        aria-checked={provider.enabled}
                                    />
                                    <div className="h-6 w-11 rounded-full bg-neutral-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"/>
                                </label>
                            </div>
                            {provider.enabled && provider.id === 'meshtastic' && (
                                <details className="border-t border-neutral-800 bg-neutral-900/20" open>
                                    <summary className="cursor-pointer px-4 py-2 text-meta text-neutral-400">Connection settings</summary>
                                    <div className="space-y-4 px-4 pb-4">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-neutral-400">Connection Type</label>
                                                <select
                                                    className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-200"
                                                    value={connectionType}
                                                    onChange={(event) => setConnectionType(event.target.value as 'webserial' | 'server-proxy')}
                                                >
                                                    <option value="webserial">WebSerial (Browser Direct)</option>
                                                    <option value="server-proxy">Agent Proxy (USB/Serial)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Input
                                                    label={connectionType === 'server-proxy' ? 'Serial Port' : 'Device Info'}
                                                    value={meshPort}
                                                    onChange={(event) => setMeshPort(event.target.value)}
                                                    placeholder={connectionType === 'server-proxy' ? '/dev/ttyUSB0' : 'Auto-detected'}
                                                    disabled={connectionType === 'webserial'}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${meshStatus.connected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}></div>
                                                <span className="text-xs text-neutral-400">
                                                    {meshStatus.connected ? 'Connected to Mesh' : 'Disconnected'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="auto-save"
                                                        className="rounded border-neutral-700 bg-neutral-900 text-blue-600 focus:ring-blue-500"
                                                        checked={meshtasticSettings.saveReceivedNotes}
                                                        onChange={(event) => {
                                                            const saveReceivedNotes = event.target.checked;
                                                            updateProviderSettings('meshtastic', {saveReceivedNotes});
                                                            if (connectionType === 'server-proxy') {
                                                                agentService.meshUpdateConfig({saveReceivedNotes});
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="auto-save" className="cursor-pointer text-xs text-neutral-300">Auto-save received notes</label>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={handleConnect}
                                                    disabled={isConnecting}
                                                    icon={isConnecting ? LoadingSpinner : SignalIcon}
                                                >
                                                    {isConnecting ? 'Connecting...' : (meshStatus.connected ? 'Reconnect' : 'Connect')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
