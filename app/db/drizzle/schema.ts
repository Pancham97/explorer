import {
    singlestoreTable,
    singlestoreSchema,
    AnySingleStoreColumn,
    primaryKey,
    varchar,
    text,
    singlestoreEnum,
    tinyint,
    timestamp,
    date,
    json,
} from "drizzle-orm/singlestore-core";
import { sql } from "drizzle-orm";

export const item = singlestoreTable(
    "item",
    {
        id: varchar({ length: 255 }).notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        title: varchar({ length: 255 }).notNull(),
        content: text(),
        description: varchar({ length: 255 }),
        type: singlestoreEnum(["file", "url", "text"]).notNull(),
        thumbnailUrl: varchar("thumbnail_url", { length: 255 }),
        faviconUrl: varchar("favicon_url", { length: 255 }),
        tags: json(),
        isFavorite: tinyint("is_favorite").default(0).notNull(),
        metadata: json(),
        createdAt: timestamp("created_at", { mode: "string" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
        lastAccessedAt: timestamp("last_accessed_at", { mode: "string" }),
        url: varchar({ length: 4096 }),
    },
    (table) => [primaryKey({ columns: [table.id], name: "item_id" })]
);

export const provider = singlestoreTable(
    "provider",
    {
        id: varchar({ length: 255 }).notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        provider: varchar({ length: 255 }).notNull(),
        createdAt: timestamp("created_at", { mode: "string" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "provider_id" })]
);

export const usersTable = singlestoreTable(
    "users_table",
    {
        id: varchar({ length: 255 }).notNull(),
        // you can use { mode: 'date' }, if you want to have Date as type for this column
        birthDate: date("birth_date", { mode: "string" }),
        email: varchar({ length: 255 }).notNull(),
        firstName: varchar("first_name", { length: 255 }).notNull(),
        lastName: varchar("last_name", { length: 255 }),
        avatarUrl: varchar("avatar_url", { length: 255 }),
        createdAt: timestamp("created_at", { mode: "string" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
        userName: varchar("user_name", { length: 255 }),
    },
    (table) => [primaryKey({ columns: [table.id], name: "users_table_id" })]
);
