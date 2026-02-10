import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketController } from '../../server/SocketController.js';
import { WebSocket } from 'ws';
import { PersistenceService } from '../../persistence.js';

// Mocks
vi.mock('../../persistence.js');
vi.mock('ws');

describe('SocketController', () => {
    let controller: SocketController;
    let mockAgentRegistry: any;
    let mockSkillExecutor: any;
    let mockFeedbackCollector: any;
    let mockWs: any;

    beforeEach(() => {
        mockAgentRegistry = {
            getDefault: vi.fn().mockReturnValue({
                executeWorkflow: vi.fn().mockResolvedValue({ success: true }),
                getStatus: vi.fn().mockResolvedValue({ status: 'idle' })
            })
        };
        mockSkillExecutor = {
            executeForNote: vi.fn().mockResolvedValue([{ id: 'result-note' }])
        };
        mockFeedbackCollector = {
            recordFeedback: vi.fn().mockResolvedValue(undefined)
        };
        mockWs = {
            on: vi.fn(),
            send: vi.fn(),
            readyState: WebSocket.OPEN
        };

        controller = new SocketController(
            mockAgentRegistry,
            mockSkillExecutor,
            mockFeedbackCollector
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('broadcast', () => {
        it('should send message to all connected clients', () => {
            const client1 = { ...mockWs, send: vi.fn(), readyState: WebSocket.OPEN };
            const client2 = { ...mockWs, send: vi.fn(), readyState: WebSocket.OPEN };

            controller.addClient(client1);
            controller.addClient(client2);

            controller.broadcast({ type: 'test' });

            expect(client1.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }));
            expect(client2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }));
        });

        it('should not send message to closed clients', () => {
            const client1 = { ...mockWs, send: vi.fn(), readyState: WebSocket.OPEN };
            const client2 = { ...mockWs, send: vi.fn(), readyState: WebSocket.CLOSED };

            controller.addClient(client1);
            controller.addClient(client2);

            controller.broadcast({ type: 'test' });

            expect(client1.send).toHaveBeenCalled();
            expect(client2.send).not.toHaveBeenCalled();
        });
    });

    describe('handleMessage', () => {
        it('should handle note_created and broadcast results', async () => {
            const client1 = { ...mockWs, send: vi.fn(), readyState: WebSocket.OPEN };
            controller.addClient(client1);

            await controller.handleMessage({ type: 'note_created', payload: { id: 'note-1' } }, mockWs);

            expect(mockSkillExecutor.executeForNote).toHaveBeenCalledWith({ id: 'note-1' });
            expect(client1.send).toHaveBeenCalledWith(expect.stringContaining('result-note'));
        });

        it('should handle get_notes using PersistenceService', async () => {
            vi.mocked(PersistenceService.getNotesSafe).mockResolvedValue([{ id: 'note-1' }] as any);

            await controller.handleMessage({ type: 'get_notes', id: 'req-1' }, mockWs);

            expect(PersistenceService.getNotesSafe).toHaveBeenCalled();
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'notes_list',
                payload: [{ id: 'note-1' }],
                id: 'req-1'
            }));
        });

        it('should handle feedback', async () => {
            await controller.handleMessage({
                type: 'feedback',
                id: 'req-2',
                payload: { rating: 5 }
            }, mockWs);

            expect(mockFeedbackCollector.recordFeedback).toHaveBeenCalledWith({ rating: 5 });
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'response',
                id: 'req-2',
                success: true
            }));
        });

        it('should send error if unknown type', async () => {
            await controller.handleMessage({ type: 'unknown_type' }, mockWs);
            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Unknown type'));
        });
    });
});
