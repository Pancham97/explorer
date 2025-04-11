import {
    json,
    primaryKey,
    singlestoreTable,
    timestamp,
    varchar,
} from "drizzle-orm/singlestore-core";

export const metadata = singlestoreTable(
    "metadata",
    {
        id: varchar({ length: 255 }).notNull(),
        strippedUrl: varchar({ length: 4096 }).notNull(),
        metadata: json(),
        createdAt: timestamp("created_at", { mode: "string" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "metadata_id" })]
);
