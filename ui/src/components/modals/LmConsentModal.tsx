import React from 'react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';

interface LmConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAllow: () => void;
    onDecline: () => void;
    providerName: string;
    text: string;
}

/**
 * One-time consent for remote providers. The text is shown verbatim so the
 * decision is an informed one; declining falls back to local heuristics.
 */
export function LmConsentModal({isOpen, onClose, onAllow, onDecline, providerName, text}: LmConsentModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send this text to a remote model?">
            <div className="space-y-4">
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-100">
                    The text below will leave this device and be sent to <strong>{providerName}</strong>. You are asked
                    once; the choice is remembered and can be revoked in Settings → AI.
                </div>

                <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">What will be sent</div>
                    <p className="rounded-xl border border-gray-700 bg-gray-900/70 p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                        {text.trim()}
                    </p>
                </div>

                <div className="flex justify-end gap-3">
                    <Button onClick={onDecline} variant="secondary">
                        Don&apos;t send
                    </Button>
                    <Button onClick={onAllow} variant="primary">
                        Allow and remember
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
