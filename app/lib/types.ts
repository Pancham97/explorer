import { item as itemTable } from "~/db/schema/item";
import { metadata as metadataTable } from "~/db/schema/metadata";

export type ItemRow = typeof itemTable.$inferSelect;

export type ItemWithMetadata = Omit<ItemRow, "metadata"> & {
    metadata: typeof metadataTable.$inferSelect;
};
