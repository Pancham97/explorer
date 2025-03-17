import {
    json,
    primaryKey,
    singlestoreTable,
    varchar,
} from "drizzle-orm/singlestore-core";

export const metadata = singlestoreTable(
    "metadata",
    {
        id: varchar({ length: 255 }).notNull(),
        strippedUrl: varchar({ length: 4096 }).notNull(),
        metadata: json(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "metadata_id" })]
);
