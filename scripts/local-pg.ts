import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const dataDir = path.resolve(process.cwd(), '.local-pgdata');
mkdirSync(dataDir, { recursive: true });

async function main() {
  const db = new PGlite(dataDir);
  await db.waitReady;

  const server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 5433,
    maxConnections: 10,
  });

  await server.start();
  console.log(
    'Local PostgreSQL (PGlite) ready on postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1'
  );
  console.log(`Persisting data to ${dataDir}`);

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
