import {
    boolean,
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
        id: varchar({ length: 255 }).notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        content: text(),
        type: singlestoreEnum(["file", "url", "text"]).notNull(),
        faviconUrl: varchar("favicon_url", { length: 255 }),
        tags: json(),
        isFavorite: tinyint("is_favorite").default(0).notNull(),
        metadata: json(),
        createdAt: timestamp("created_at", { mode: "string" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
        lastAccessedAt: timestamp("last_accessed_at", { mode: "string" }),
        url: varchar({ length: 4096 }),
        thumbnailUrl: varchar("thumbnail_url", { length: 4096 }),
        title: varchar({ length: 360 }),
        description: varchar({ length: 360 }),
    },
    (table) => [primaryKey({ columns: [table.id], name: "item_id" })]
);
