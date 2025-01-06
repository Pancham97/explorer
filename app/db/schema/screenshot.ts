import {
    primaryKey,
    singlestoreTable,
    varchar,
} from "drizzle-orm/singlestore-core";

export const screenshotTable = singlestoreTable(
    "screenshot",
    {
        id: varchar({ length: 255 }).primaryKey(),
        url: varchar({ length: 4096 }).notNull(),
        screenshotUrl: varchar({ length: 4096 }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "screenshot_id" })]
);
