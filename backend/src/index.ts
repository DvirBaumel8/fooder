import "dotenv/config";
import { createApp } from "./app.js";
import { ensureDefaultShops } from "./seed.js";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

ensureDefaultShops()
  .then(() => {
    app.listen(port, () => {
      console.log(`Fooder backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize default shops", error);
    process.exitCode = 1;
  });
