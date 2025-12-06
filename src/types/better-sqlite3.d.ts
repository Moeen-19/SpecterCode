/**
 * Type declarations for better-sqlite3
 */

declare module 'better-sqlite3' {
    interface Statement {
        run(...params: any[]): RunResult;
        get(...params: any[]): any;
        all(...params: any[]): any[];
    }

    interface RunResult {
        changes: number;
        lastInsertRowid: number;
    }

    class Database {
        constructor(filename: string, options?: any);
        prepare(sql: string): Statement;
        exec(sql: string): this;
        pragma(pragma: string, options?: any): any;
        close(): void;
    }

    export default Database;
}
