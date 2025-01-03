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
        title: varchar({ length: 255 }).notNull(),
        content: text(),
        description: varchar({ length: 255 }),
        type: singlestoreEnum(["file", "url", "text"]).notNull(),
        faviconUrl: varchar("favicon_url", { length: 255 }),
        tags: json(),
        isFavorite: tinyint("is_favorite").default(0).notNull(),
        metadata: json(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
        lastAccessedAt: timestamp("last_accessed_at", { mode: "date" }),
        url: varchar({ length: 4096 }),
        thumbnailUrl: varchar("thumbnail_url", { length: 4096 }),
    },
    (table) => [primaryKey({ columns: [table.id], name: "item_id" })]
);
