import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  pool ??= new Pool({ connectionString: databaseUrl });
  return pool;
}

function toPositionalParams(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

class PgPreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly pool: pg.Pool,
    private readonly sql: string,
    private readonly values: unknown[] = []
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new PgPreparedStatement(this.pool, this.sql, values);
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.pool.query(toPositionalParams(this.sql), this.values);
    return (result.rows[0] as T | undefined) ?? null;
  }

  async all<T = unknown>(): Promise<{ results?: T[] }> {
    const result = await this.pool.query(toPositionalParams(this.sql), this.values);
    return { results: result.rows as T[] };
  }

  async run(): Promise<unknown> {
    const result = await this.pool.query(toPositionalParams(this.sql), this.values);
    return { changes: result.rowCount ?? 0 };
  }
}

class PgDatabase implements D1Database {
  constructor(private readonly pool: pg.Pool) {}

  prepare(query: string): D1PreparedStatement {
    return new PgPreparedStatement(this.pool, query);
  }
}

export function getDatabase(): D1Database | undefined {
  const activePool = getPool();
  if (!activePool) {
    return undefined;
  }

  return new PgDatabase(activePool);
}
