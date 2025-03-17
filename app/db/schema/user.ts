import {
    singlestoreTable,
    singlestoreSchema,
    AnySingleStoreColumn,
    primaryKey,
    varchar,
    date,
    timestamp,
} from "drizzle-orm/singlestore-core";
import { sql } from "drizzle-orm";

export const usersTable = singlestoreTable(
    "users_table",
    {
        id: varchar({ length: 255 }).notNull(),
        // you can use { mode: 'date' }, if you want to have Date as type for this column
        birthDate: date("birth_date", { mode: "date" }),
        email: varchar({ length: 255 }).notNull(),
        firstName: varchar("first_name", { length: 255 }).notNull(),
        lastName: varchar("last_name", { length: 255 }),
        avatarUrl: varchar("avatar_url", { length: 255 }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
        userName: varchar("user_name", { length: 255 }),
        source: varchar("source", { length: 255 }),
    },
    (table) => [primaryKey({ columns: [table.id], name: "users_table_id" })]
);
