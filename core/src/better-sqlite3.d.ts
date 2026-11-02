declare module 'better-sqlite3' {
    interface Database {
        prepare(sql: string): Statement;
        exec(sql: string): this;
        pragma(pragma: string): any;
        close(): void;
    }

    interface Statement {
        run(...params: any[]): RunResult;
        get(...params: any[]): any;
        all(...params: any[]): any[];
    }

    interface RunResult {
        changes: number;
        lastInsertRowid: number | bigint;
    }

    const Database: {
        new(filename: string, options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number; verbose?: (sql: string) => void }): Database;
    };

    export default Database;
}