import { buildServer } from "./server";

const port = Number(process.env.API_PORT || 4000);
const host = process.env.API_HOST || "0.0.0.0";

async function start() {
  const app = await buildServer({
    mockExtraction: process.env.MOCK_EXTRACTION === "1"
  });

  await app.listen({
    host,
    port
  });

  app.log.info(`BBB API listening on http://${host}:${port}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
