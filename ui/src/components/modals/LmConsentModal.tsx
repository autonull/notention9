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
                <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
                    The text below will leave this device and be sent to <strong>{providerName}</strong>. You are asked
                    once; the choice is remembered and can be revoked in Settings → AI.
                </div>

                <div>
 <div className="mb-2 text-xs font-bold tracking-widest text-[var(--app-muted)]">What will be sent</div>
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--app-line)] bg-[var(--app-raised)] p-3 text-sm text-[var(--app-text-secondary)] custom-scrollbar">
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
