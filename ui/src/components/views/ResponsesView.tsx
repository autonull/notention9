import React from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {Note} from '@notention/core';
import {CheckCircleIcon, XCircleIcon, ArrowPathIcon, PencilIcon} from '../ui/icons';
import {logMatchWithdrawn, createWithdrawalNote} from '@notention/core';
import {useFrictionRecorder} from '../../hooks/useFrictionRecorder';

export function ResponsesView() {
    const {notes, addNote} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();
    const { recordResponseViewed } = useFrictionRecorder('match', 'responses');

    // Filter for response notes (intent: response)
    const responses = notes.filter(n => 
        n.properties.some(p => p.key === 'intent' && p.values.includes('response'))
    );

    // Filter for withdrawal notes (intent: withdrawal)
    const withdrawals = notes.filter(n => 
        n.properties.some(p => p.key === 'intent' && p.values.includes('withdrawal'))
    );

    // Get active responses (not withdrawn)
    const withdrawalResponseIds = new Set(
        withdrawals.map(w => w.properties.find(p => p.key === 'responseId')?.values[0]).filter(Boolean)
    );
    const activeResponses = responses.filter(r => !withdrawalResponseIds.has(r.id));

    // Get the original request/offer for each response
    const getRelatedNotes = (response: Note) => {
        const requestId = response.properties.find(p => p.key === 'requestId')?.values[0];
        const offerId = response.properties.find(p => p.key === 'offerId')?.values[0];
        const request = requestId ? notes.find(n => n.id === requestId) : undefined;
        const offer = offerId ? notes.find(n => n.id === offerId) : undefined;
        return { request, offer };
    };

    const handleWithdraw = (response: Note) => {
        // Create withdrawal note
        const withdrawalNote = createWithdrawalNote(response);
        addNote(withdrawalNote);
        
        // Log to ledger
        const requestId = response.properties.find(p => p.key === 'requestId')?.values[0];
        const offerId = response.properties.find(p => p.key === 'offerId')?.values[0];
        if (requestId && offerId) {
            logMatchWithdrawn(response.id, requestId, offerId);
        }
        
        // Record friction event
        // Note: useMatchTracking is not available here, but the ledger event is recorded
    };

    const handleNoteClick = (id: string) => {
        recordResponseViewed();
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const renderResponseCard = (response: Note) => {
        const { request, offer } = getRelatedNotes(response);
        const matchScore = response.properties.find(p => p.key === 'matchScore')?.values[0];
        
        return (
            <Card key={response.id} className="mb-2 p-3 cursor-pointer hover:bg-gray-800 transition-colors border-l-4 border-green-500" onClick={() => handleNoteClick(response.id)}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-400 font-bold">↩️ Response</span>
                            {matchScore && <span className="text-green-500 font-mono">{Number(matchScore) * 100}%</span>}
                        </div>
                        <div className="font-semibold truncate">{response.title || 'Untitled Response'}</div>
                        <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                            {request && <span>📥 {request.title}</span>}
                            {offer && <span>📤 {offer.title}</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 truncate">{response.content.slice(0, 150)}</div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 flex-shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleWithdraw(response);
                        }}
                        title="Withdraw this response"
                    >
                        <XCircleIcon className="w-4 h-4"/> Withdraw
                    </Button>
                </div>
            </Card>
        );
    };

    const renderWithdrawalCard = (withdrawal: Note) => {
        const responseId = withdrawal.properties.find(p => p.key === 'responseId')?.values[0];
        
        return (
            <Card key={withdrawal.id} className="mb-2 p-3 bg-gray-800/50 border-l-4 border-gray-600" onClick={() => handleNoteClick(withdrawal.id)}>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">↪️ Withdrawn</span>
                    <div className="font-semibold text-gray-400">{withdrawal.title || 'Untitled Withdrawal'}</div>
                    {responseId && <span className="text-xs text-gray-500 ml-2">for {responseId.slice(0, 8)}</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1 truncate">{withdrawal.content.slice(0, 150)}</div>
            </Card>
        );
    };

    return (
        <div className="h-full bg-gray-900 p-4 flex flex-col overflow-y-auto text-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-green-400">↩️</span> My Responses
                </h1>
            </div>

            {activeResponses.length === 0 && withdrawals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">↩️</div>
                    <p className="text-lg">No responses yet</p>
                    <p className="text-sm mt-2">Accept a match from the Dashboard to create a response</p>
                </div>
            ) : (
                <>
                    {activeResponses.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold mb-3 text-gray-300 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-400"/>
                                Active Responses ({activeResponses.length})
                            </h2>
                            {activeResponses.map(renderResponseCard)}
                        </div>
                    )}

                    {withdrawals.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold mb-3 text-gray-300 flex items-center gap-2">
                                <XCircleIcon className="w-5 h-5 text-gray-500"/>
                                Withdrawn ({withdrawals.length})
                            </h2>
                            {withdrawals.map(renderWithdrawalCard)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}