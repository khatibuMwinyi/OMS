import mysql, {
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
  type PoolConnection,
} from "mysql2/promise";

type QueryValue = string | number | boolean | Date | null;
type DatabaseErrorCode =
  | "ETIMEDOUT"
  | "ECONNREFUSED"
  | "EHOSTUNREACH"
  | "ENOTFOUND"
  | "PROTOCOL_CONNECTION_LOST"
  | "ER_CON_COUNT_ERROR"
  | "POOL_CLOSED";

const DATABASE_CONNECTIVITY_ERROR_CODES = new Set<DatabaseErrorCode>([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "PROTOCOL_CONNECTION_LOST",
  "ER_CON_COUNT_ERROR",
  "POOL_CLOSED",
]);

function resolveDatabaseHost(host?: string) {
  const value = host?.trim();
  if (!value) {
    return "127.0.0.1";
  }

  // Force IPv4 for localhost to avoid intermittent IPv6 timeout issues.
  if (value.toLowerCase() === "localhost") {
    return "127.0.0.1";
  }

  return value;
}

type ErrorWithCode = {
  code?: string;
};

export function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as ErrorWithCode).code;
  if (!code) {
    return false;
  }

  return DATABASE_CONNECTIVITY_ERROR_CODES.has(code as DatabaseErrorCode);
}

declare global {
  // eslint-disable-next-line no-var
  var __oweruDatabasePool: Pool | undefined;
}

const databasePool =
  globalThis.__oweruDatabasePool ??
  mysql.createPool({
    host: resolveDatabaseHost(process.env.DB_HOST),
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "oweru_db",
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    namedPlaceholders: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__oweruDatabasePool = databasePool;
}

export async function queryRows<T>(
  sql: string,
  params: QueryValue[] = [],
): Promise<T[]> {
  const [rows] = await databasePool.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function execute(
  sql: string,
  params: QueryValue[] = [],
): Promise<ResultSetHeader> {
  const [result] = await databasePool.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
