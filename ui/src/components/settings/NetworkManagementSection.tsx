import React, { useState, useEffect } from 'react';
import { useNetworkManagement } from '../../hooks/useNetworkManagement';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { GlobeIcon, SignalIcon, ShieldIcon, LoadingSpinner } from '../common/icons';
import { agentService } from '../../services/AgentService';
import { useToast } from '../../hooks/useToast';
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";

export function NetworkManagementSection() {
    const { providers, toggleProvider, isPrivateMode } = useNetworkManagement();
    const [meshPort, setMeshPort] = useState('/dev/ttyUSB0');
    const [connectionType, setConnectionType] = useState<'webserial' | 'server-proxy'>('webserial');
    const [isConnecting, setIsConnecting] = useState(false);
    const [meshStatus, setMeshStatus] = useState<{connected: boolean}>({ connected: false });
    const { addToast } = useToast();

    useEffect(() => {
        const interval = setInterval(async () => {
            if (connectionType === 'server-proxy' && agentService.isConnected()) {
                try {
                    const status = await agentService.getMeshStatus();
                    setMeshStatus(status);
                } catch (e) {}
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [connectionType]);

    const handleConnect = async () => {
        setIsConnecting(true);
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
                        send: async (data) => {
                            await device.sendPacket({
                                data: { data, portnum: 120 },
                                destination: 0xFFFFFFFF
                            });
                        },
                        onData: (callback) => {
                            device.onTextPacket((packet) => {
                                if (packet.data.data) {
                                    callback(packet.data.data as Uint8Array, packet.from.toString());
                                }
                            });
                        }
                    });
                }

                addToast('WebSerial mesh device connected', 'success');
                setMeshStatus({ connected: true });
            }
        } catch (e: any) {
            addToast(`Connection failed: ${e.message}`, 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <GlobeIcon className="h-5 w-5 text-blue-400" />
                        Network Providers
                    </h3>
                    <p className="text-sm text-gray-400">Enable or disable external network protocols.</p>
                </div>
                {isPrivateMode && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-xs border border-yellow-700/50">
                        <ShieldIcon className="h-4 w-4" />
                        Private Mode Active
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {providers.map(provider => (
                    <div key={provider.id} className={`p-4 rounded-lg border transition-colors ${
                        provider.enabled ? 'bg-gray-800/50 border-blue-500/30' : 'bg-gray-900/30 border-gray-700'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${provider.enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                                    {provider.id === 'nostr' ? <GlobeIcon className="h-5 w-5" /> : <SignalIcon className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-100">{provider.name}</h4>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{provider.id}</span>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={provider.enabled}
                                    onChange={(e) => toggleProvider(provider.id, e.target.checked)}
                                    disabled={isPrivateMode}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {provider.id === 'meshtastic' && provider.enabled && (
                            <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Connection Type</label>
                                        <select
                                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200"
                                            value={connectionType}
                                            onChange={(e) => setConnectionType(e.target.value as any)}
                                        >
                                            <option value="webserial">WebSerial (Browser Direct)</option>
                                            <option value="server-proxy">Agent Proxy (USB/Serial)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Input
                                            label={connectionType === 'server-proxy' ? "Serial Port" : "Device Info"}
                                            value={meshPort}
                                            onChange={(e) => setMeshPort(e.target.value)}
                                            placeholder={connectionType === 'server-proxy' ? "/dev/ttyUSB0" : "Auto-detected"}
                                            disabled={connectionType === 'webserial'}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${meshStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className="text-xs text-gray-400">
                                            {meshStatus.connected ? 'Connected to Mesh' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
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
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
