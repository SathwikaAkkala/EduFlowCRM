import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

let envLoaded = false;

export function loadBackendEnv() {
    if (envLoaded) {
        return;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, "../../.env");

    dotenv.config({ path: envPath });
    envLoaded = true;
}

export default {
    loadBackendEnv,
};
