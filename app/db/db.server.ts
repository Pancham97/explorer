import "dotenv/config";
import { drizzle } from "drizzle-orm/singlestore";

export const db = drizzle({
    connection: {
        host: process.env.DATABASE_HOST!,
        port: parseInt(process.env.DATABASE_PORT!),
        user: process.env.DATABASE_USER!,
        password: process.env.DATABASE_PASSWORD!,
        database: process.env.DATABASE_NAME!,
        ssl: {
            ca: process.env.DATABASE_SSL_CA!,
        },
    },
});
