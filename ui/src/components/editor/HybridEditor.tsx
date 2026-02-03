import React, { forwardRef } from 'react';
import { TiptapEditor, TiptapEditorRef } from './TiptapEditor';
// We inherit props from TiptapEditor
interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> { }

export const HybridEditor = forwardRef<TiptapEditorRef, HybridEditorProps>((props, ref) => {
    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <TiptapEditor ref={ref} {...props} />
            </div>
        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
