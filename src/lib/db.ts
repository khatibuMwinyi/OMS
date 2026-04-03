import mysql, {
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
  type PoolConnection,
} from "mysql2/promise";

type QueryValue = string | number | boolean | Date | null;

declare global {
  // eslint-disable-next-line no-var
  var __oweruDatabasePool: Pool | undefined;
}

const databasePool =
  globalThis.__oweruDatabasePool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "oweru_db",
    waitForConnections: true,
    connectionLimit: 10,
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
