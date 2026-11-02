declare module 'better-sqlite3' {
    interface Database {
        prepare(sql: string): Statement;
        exec(sql: string): this;
        pragma(pragma: string): any;
        close(): void;
    }
    interface Statement {
        run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
        get(...params: any[]): any;
        all(...params: any[]): any[];
        iterate(...params: any[]): IterableIterator<any>;
        pluck(): this;
    }
    const Database: {
        new(filename: string, options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number; verbose?: any }): Database;
    };
    export default Database;
}