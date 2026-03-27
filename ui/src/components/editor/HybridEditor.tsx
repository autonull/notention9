import React, { forwardRef } from 'react';
import { TiptapEditor, TiptapEditorRef } from './TiptapEditor';
import { AgentFeedbackPanel } from './AgentFeedbackPanel';

// We inherit props from TiptapEditor
interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> { }

export const HybridEditor = forwardRef<TiptapEditorRef, HybridEditorProps>((props, ref) => {
    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <TiptapEditor ref={ref} {...props} />
            </div>
            {/* Active Feedback Panel - Always visible for now, or toggleable can be added later */}
            <div className="border-l border-gray-700 bg-gray-900 w-64 hidden lg:block">
                <AgentFeedbackPanel />
            </div>
        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
