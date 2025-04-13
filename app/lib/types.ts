import { item as itemTable } from "~/db/schema/item";
import { metadata as metadataTable } from "~/db/schema/metadata";

export type ItemRow = typeof itemTable.$inferSelect;

export type Metadata = {
    author: Maybe<string>;
    description: Maybe<string>;
    image: Maybe<string>;
    lang: Maybe<string>;
    logo: Maybe<string>;
    publisher: Maybe<string>;
    siteName: Maybe<string>;
    title: Maybe<string>;
    type: Maybe<string>;
    url: Maybe<string>;
};

export type FileMetadata = {
    sunchayAssetUrl: string;
    originalURL: string;
    image: string;
};

export type ItemWithMetadata = Omit<ItemRow, "metadata"> & {
    metadata: Metadata;
    fileMetadata: FileMetadata;
};
