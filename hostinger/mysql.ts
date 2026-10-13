import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Database, DatabaseResult, DatabaseStatement } from '../app/lib/database';

export function translateSQL(sql: string) {
  // Application SQL is static; parameter values always remain bound separately.
  return sql.replace(/\bkey\b/g, '`key`').replace(
    /ON CONFLICT\(`key`\) DO UPDATE SET count=CASE WHEN login_attempts\.since<\? THEN 1 ELSE login_attempts\.count\+1 END,since=CASE WHEN login_attempts\.since<\? THEN excluded\.since ELSE login_attempts\.since END/,
    'ON DUPLICATE KEY UPDATE count=CASE WHEN since<? THEN 1 ELSE count+1 END,since=CASE WHEN since<? THEN VALUES(since) ELSE since END',
  );
}
function result<T>(rows: RowDataPacket[] | ResultSetHeader): DatabaseResult<T> {
  return Array.isArray(rows)
    ? { results: rows as T[], meta: { changes: 0 } }
    : { results: [], meta: { changes: rows.affectedRows } };
}
class Statement implements DatabaseStatement {
  constructor(readonly owner: MySQLDatabase, readonly sql: string, readonly values: any[] = []) {}
  bind(...values: any[]) { return new Statement(this.owner, this.sql, values); }
  async first<T>() { return (await this.all<T>()).results[0] ?? null; }
  async all<T>() {
    const [rows] = await this.owner.pool.query(this.sql, this.values);
    return result<T>(rows as RowDataPacket[] | ResultSetHeader);
  }
  async run() { return this.all<Record<string, unknown>>(); }
}
export class MySQLDatabase implements Database {
  constructor(readonly pool: Pool) {}
  prepare(sql: string) { return new Statement(this, translateSQL(sql)); }
  async batch(statements: DatabaseStatement[]) {
    const queries = statements.map(statement => {
      if (!(statement instanceof Statement) || statement.owner !== this) throw new Error('Statement belongs to another database');
      return statement;
    });
    for (let attempt = 0; ; attempt++) {
      const connection = await this.pool.getConnection();
      try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        await connection.beginTransaction();
        const results: DatabaseResult<any>[] = [];
        for (const query of queries) {
          const [rows] = await connection.query(query.sql, query.values);
          results.push(result(rows as RowDataPacket[] | ResultSetHeader));
        }
        await connection.commit();
        return results;
      } catch (error: any) {
        await connection.rollback().catch(() => {});
        if (!['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error?.code) || attempt >= 3) throw error;
      } finally { connection.release(); }
    }
  }
}
