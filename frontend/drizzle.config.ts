import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./app/db/drizzle",
    schema: "./app/db/schema",
    dialect: "singlestore",
    dbCredentials: {
        database: process.env.DATABASE_NAME!,
        host: process.env.DATABASE_HOST!,
        password: process.env.DATABASE_PASSWORD!,
        port: parseInt(process.env.DATABASE_PORT!),
        user: process.env.DATABASE_USER!,
        ssl: {
            ca: process.env.DATABASE_SSL_CA!,
        },
    },
});
