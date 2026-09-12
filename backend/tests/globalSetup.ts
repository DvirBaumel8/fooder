import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default async function setup() {
  const dataDir = mkdtempSync(join(tmpdir(), "fooder-test-pg-"));
  const port = 54329;
  const user = "postgres";
  const password = "postgres";
  const database = "fooder_test";
  const databaseUrl = `postgresql://${user}:${password}@localhost:${port}/${database}`;

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  execSync("npx prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  process.env.DATABASE_URL = databaseUrl;

  return async () => {
    await pg.stop();
    rmSync(dataDir, { recursive: true, force: true });
  };
}
