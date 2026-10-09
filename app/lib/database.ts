// Shared subset used by the API. Each platform supplies its own database.
export interface DatabaseResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}

export interface DatabaseStatement {
  bind(...values: any[]): DatabaseStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
  run(): Promise<DatabaseResult>;
}

export interface Database {
  prepare(sql: string): DatabaseStatement;
  batch(statements: DatabaseStatement[]): Promise<DatabaseResult<any>[]>;
}

export interface HandlerOptions {
  requireSetupToken?: boolean;
  setupToken?: string;
  clientIP?: string;
}
