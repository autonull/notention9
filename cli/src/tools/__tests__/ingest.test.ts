import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ingest from '../ingest.js';
import fs from 'fs/promises';
import { CliClient } from '../../client.js';
import * as utils from '../../utils.js';

vi.mock('fs/promises');
vi.mock('../../client.js');
vi.mock('../../utils.js');

describe('ingest tools', () => {
    let mockCli: CliClient;

    beforeEach(() => {
        mockCli = new CliClient('http://localhost:3000');
        vi.mocked(mockCli.callTool).mockResolvedValue({
            content: [{ text: JSON.stringify({ id: 'note-123' }) }]
        } as any);
        vi.mocked(utils.isBinary).mockResolvedValue(false);
        vi.mocked(utils.resolveSafePath).mockImplementation((p) => p);
        vi.mocked(fs.readFile).mockResolvedValue('file content');
        vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);
        vi.mocked(fs.readdir).mockResolvedValue([]);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('ingestFile', () => {
        it('should ingest a text file successfully', async () => {
            const result = await ingest.ingestFile('test.txt', mockCli, false);
            expect(result).toBe('note-123');
            expect(mockCli.callTool).toHaveBeenCalledWith('create_note', expect.objectContaining({
                title: 'Ingested: test.txt',
                tags: expect.arrayContaining(['ingested', 'cli', 'document'])
            }));
        });

        it('should skip binary files', async () => {
            vi.mocked(utils.isBinary).mockResolvedValue(true);
            const result = await ingest.ingestFile('image.png', mockCli, false);
            expect(result).toBeNull();
            expect(mockCli.callTool).not.toHaveBeenCalled();
        });

        it('should handle dry run', async () => {
            const result = await ingest.ingestFile('test.ts', mockCli, true);
            expect(result).toBe('[DryRun] test.ts');
            expect(mockCli.callTool).not.toHaveBeenCalled();
        });

        it('should map extensions to tags correctly', async () => {
            await ingest.ingestFile('script.py', mockCli, false);
            expect(mockCli.callTool).toHaveBeenCalledWith('create_note', expect.objectContaining({
                tags: expect.arrayContaining(['code', 'python'])
            }));
        });
    });

    describe('createIngestTools', () => {
        it('should return tools', () => {
            const tools = ingest.createIngestTools(mockCli);
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe('ingest_local_path');
        });

        it('should ingest a directory recursively', async () => {
            const tools = ingest.createIngestTools(mockCli);
            const tool = tools[0];

            // Mock file system structure
            // root/
            //   file1.txt
            //   subdir/
            //     file2.md

            vi.mocked(fs.stat).mockImplementation(async (path: any) => {
                if (path === 'root' || path === 'root/subdir') return { isFile: () => false, isDirectory: () => true } as any;
                return { isFile: () => true, isDirectory: () => false } as any;
            });

            vi.mocked(fs.readdir).mockImplementation(async (path: any) => {
                if (path === 'root') {
                    return [
                        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
                        { name: 'subdir', isFile: () => false, isDirectory: () => true }
                    ] as any;
                }
                if (path === 'root/subdir') {
                    return [
                        { name: 'file2.md', isFile: () => true, isDirectory: () => false }
                    ] as any;
                }
                return [];
            });

            const result = await tool.execute({ path: 'root' });
            expect(result).toContain('Processed 2 files');
            expect(mockCli.callTool).toHaveBeenCalledTimes(2);
        });
    });
});
