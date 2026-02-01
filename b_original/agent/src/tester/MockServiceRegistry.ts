
export interface MockService {
    id: string;
    handle(request: any): Promise<any>;
}

export class MockServiceRegistry {
    private mocks = new Map<string, MockService>();

    constructor() {
        this.registerDefaultMocks();
    }

    register(id: string, mock: MockService) {
        this.mocks.set(id, mock);
    }

    get(id: string): MockService | undefined {
        return this.mocks.get(id);
    }

    private registerDefaultMocks() {
        // Indeed Mock
        this.register('indeed.com', {
            id: 'indeed.com',
            handle: async (req: any) => ({
                jobs: [
                    { title: 'Mock React Job', company: 'Mock Co', location: 'Remote' },
                    { title: 'Mock Node Job', company: 'Test Inc', location: 'SF' }
                ]
            })
        });

        // GitHub Mock
        this.register('github.com', {
            id: 'github.com',
            handle: async (req: any) => ({
                repos: ['mock-repo-1', 'mock-repo-2']
            })
        });
    }
}
