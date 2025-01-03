import {
    primaryKey,
    singlestoreTable,
    timestamp,
    varchar,
} from "drizzle-orm/singlestore-core";

export const providersTable = singlestoreTable(
    "provider",
    {
        id: varchar({ length: 255 }).notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        provider: varchar("provider", { length: 255 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "providers_id" })]
);
