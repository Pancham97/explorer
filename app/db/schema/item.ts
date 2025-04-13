import {
    json,
    primaryKey,
    singlestoreEnum,
    singlestoreTable,
    text,
    timestamp,
    tinyint,
    varchar,
} from "drizzle-orm/singlestore-core";

export const item = singlestoreTable(
    "item",
    {
        content: text(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull(),
        description: varchar({ length: 360 }),
        id: varchar({ length: 255 }).notNull(),
        isFavorite: tinyint("is_favorite").default(0).notNull(),
        lastAccessedAt: timestamp("last_accessed_at", { mode: "date" }),
        metadata: json(),
        metadataId: varchar("metadata_id", { length: 255 }),
        status: singlestoreEnum([
            "pending",
            "processing",
            "partial",
            "completed",
            "failed",
        ]).notNull(),
        tags: json(),
        title: varchar({ length: 360 }),
        type: singlestoreEnum(["file", "url", "text"]).notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
        url: varchar({ length: 4096 }),
        userId: varchar("user_id", { length: 255 }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "item_id" })]
);
