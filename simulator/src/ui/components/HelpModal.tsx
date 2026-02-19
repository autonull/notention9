import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full border border-gray-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white">Using the Movie Studio</h2>

                    <div className="space-y-6 text-gray-300">
                        <section>
                            <h3 className="text-lg font-semibold text-indigo-400 mb-2">🎬 Studio (Create)</h3>
                            <p>Launch new simulations. You can choose a pre-defined scenario (like 'Gig Economy') or generate a random one. Configure the number of agents and duration for random scenarios.</p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-indigo-400 mb-2">📺 Live Preview (Watch)</h3>
                            <p>Monitor the simulation in real-time. The dashboard shows agent interactions and system logs. You can cancel a running job from here if needed.</p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-indigo-400 mb-2">🎥 Library (Manage)</h3>
                            <p>Access your recorded simulations. Preview the generated MP4 videos, download them to your device, or delete old recordings to save space.</p>
                        </section>

                        <div className="bg-gray-900 p-4 rounded-lg text-sm border border-gray-700">
                            <strong>Note:</strong> Simulations run on the server. Closing this browser window will not stop the recording process, but you will lose the live preview until you reconnect.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
