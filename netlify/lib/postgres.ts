import type { Pool, QueryResult } from 'pg';
import type { Database, DatabaseResult, DatabaseStatement } from '../../app/lib/database';

function result<T>(value: QueryResult): DatabaseResult<T> {
  return { results: value.rows as T[], meta: { changes: value.rowCount ?? 0 } };
}
class Statement implements DatabaseStatement {
  constructor(readonly owner: PostgresDatabase, readonly sql: string, readonly values: any[] = []) {}
  bind(...values: any[]) { return new Statement(this.owner, this.sql, values); }
  async first<T>() { return (await this.all<T>()).results[0] ?? null; }
  async all<T>() { return result<T>(await this.owner.pool.query(this.sql, this.values)); }
  async run() { return this.all<Record<string, unknown>>(); }
}
export class PostgresDatabase implements Database {
  constructor(readonly pool: Pool) {}
  prepare(sql: string) {
    // Static application SQL uses ? parameters; values never enter SQL text.
    let parameter = 0;
    return new Statement(this, sql.replace(/\?/g, () => `$${++parameter}`));
  }
  async batch(statements: DatabaseStatement[]) {
    const queries = statements.map(statement => {
      if (!(statement instanceof Statement) || statement.owner !== this) throw new Error('Statement belongs to a different database');
      return statement;
    });
    for (let attempt = 0; ; attempt++) {
      const client = await this.pool.connect();
      try {
        // State, request and audit commit together on one connection.
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        const results: DatabaseResult<any>[] = [];
        for (const query of queries) results.push(result(await client.query(query.sql, query.values)));
        await client.query('COMMIT');
        return results;
      } catch (error: any) {
        await client.query('ROLLBACK').catch(() => {});
        if (!['40001', '40P01'].includes(error?.code) || attempt >= 3) throw error;
      } finally { client.release(); }
    }
  }
}
