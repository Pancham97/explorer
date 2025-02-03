import { and, eq } from "drizzle-orm";
import { unescape } from "html-escaper";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import { ulid } from "ulid";
import UserAgents from "user-agents";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";

type Metadata = {
    lang: Nullable<string>;
    author: Nullable<string>;
    title: Nullable<string>;
    publisher: Nullable<string>;
    image: Nullable<string>;
    description: Nullable<string>;
    url: Nullable<string>;
    logo: Nullable<string>;
};

type OGResponse = {
    openGraphData?: OgObject;
    metadata?: Metadata;
};

const DEFAULT_DB_VALUES = {
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    updatedAt: new Date(),
    description: "",
    faviconUrl: "",
    isFavorite: 0,
    metadata: {},
    tags: {},
    thumbnailUrl: "",
    title: "",
    type: "text" as const,
    url: "",
};

function convertToUTF8(input: string) {
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    try {
        const utf8Bytes = textEncoder.encode(input);
        // Filter out 4-byte sequences (anything above 0xFFFF)
        const filteredBytes = new Uint8Array(utf8Bytes.length);
        let outputIndex = 0;

        for (let i = 0; i < utf8Bytes.length; i++) {
            // Check for 4-byte sequence start
            if ((utf8Bytes[i] & 0xf8) === 0xf0) {
                // Skip the 4-byte sequence
                i += 3;
                continue;
            }

            filteredBytes[outputIndex++] = utf8Bytes[i];
        }

        // Trim the filtered bytes to the actual size
        const finalBytes = filteredBytes.slice(0, outputIndex);

        return textDecoder.decode(finalBytes);
    } catch (error) {
        return input;
    }
}

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

export async function getOpenGraphData(requestUrl: URL): Promise<OGResponse> {
    const userAgent = new UserAgents({
        deviceCategory: "desktop",
    });

    try {
        const endpoint =
            process.env.NODE_ENV === "production"
                ? "https://n3hdumbu6docpxby3e2wv5cuoi0lsykn.lambda-url.ap-south-1.on.aws"
                : "https://7qv4apcznftiudu35cgrsxcuk40zmnfx.lambda-url.ap-south-1.on.aws";

        const response = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify({
                url: requestUrl,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch Open Graph data");
        }

        const { metadata } = await response.json();

        console.log("metadata", metadata);
        return {
            metadata,
        };
    } catch (error) {
        console.error("Error fetching OG data", error);
    }

    try {
        const htmlOptions: OpenGraphScraperOptions = {
            url: requestUrl.toString(),
            fetchOptions: {
                headers: {
                    "User-Agent": userAgent.random().toString(),
                },
            },
        };

        const { result } = await ogs(htmlOptions);
        return {
            openGraphData: result,
        };
    } catch (error) {
        console.error("Error fetching OG data", error);
        return {};
    }
}

export function isURLRelative(url: string) {
    return !url.startsWith("http://") && !url.startsWith("https://");
}

export function prepareUrl(relativePath: Maybe<string>, requestUrl: string) {
    if (!relativePath) return "";
    if (isURLRelative(relativePath)) {
        if (relativePath.startsWith("/")) {
            return `${new URL(requestUrl).origin}${relativePath}`;
        } else {
            return `${new URL(requestUrl).origin}/${relativePath}`;
        }
    }

    return unescape(relativePath);
}

export async function savePrimaryInformation(content: string, user: User) {
    const itemData = {
        ...DEFAULT_DB_VALUES,
        content,
        userId: user.id,
    };

    return db.transaction(async (tx) => {
        const existing = await tx
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.content, content),
                    eq(itemTable.userId, user.id)
                )
            )
            .limit(1);

        if (existing[0]) {
            await tx
                .update(itemTable)
                .set({ updatedAt: new Date() })
                .where(eq(itemTable.id, existing[0].id));

            return { id: existing[0].id };
        }

        const id = ulid();
        await tx.insert(itemTable).values({ ...itemData, id });
        return { id };
    });
}

export async function processItem(id: string, user: User) {
    const [item] = await db
        .selectDistinct()
        .from(itemTable)
        .where(and(eq(itemTable.id, id), eq(itemTable.userId, user.id)));
    console.log("processing item", item);

    if (!item) {
        return null;
    }

    if (item.type === "file") {
        return null;
    } else if (item.content && isURL(item.content)) {
        return await processURLItem(item, user);
    }

    return await processTextItem(item, user);
}

export async function deleteItem(itemId: string, user: User) {
    return await db
        .delete(itemTable)
        .where(and(eq(itemTable.id, itemId), eq(itemTable.userId, user.id)))
        .$dynamic();
}

async function processURLItem(item: typeof itemTable.$inferSelect, user: User) {
    if (!item.content) {
        return null;
    }

    const { openGraphData, metadata } = await getOpenGraphData(
        new URL(item.content)
    );

    if (!metadata && !openGraphData) {
        return null;
    }

    console.log("metadata -<<<<>>>>>", metadata);

    return await db
        .update(itemTable)
        .set({
            content: getDescription(metadata, openGraphData),
            description: getDescription(metadata, openGraphData),
            faviconUrl: prepareUrl(
                openGraphData?.favicon,
                openGraphData?.ogUrl || openGraphData?.requestUrl || ""
            ),
            metadata: getMetadata(metadata, openGraphData),
            tags: {},
            thumbnailUrl: getThumbnail(metadata, openGraphData),
            title: getTitle(item, metadata, openGraphData),
            type: "url" as const,
            updatedAt: new Date(),
            url: item.content,
        })
        .where(and(eq(itemTable.id, item.id), eq(itemTable.userId, user.id)))
        .$dynamic();
}

async function processTextItem(
    item: typeof itemTable.$inferSelect,
    user: User
) {
    return await db
        .update(itemTable)
        .set({
            content: item.content || "",
            description: item.description || "",
            lastAccessedAt: new Date(),
            metadata: {},
            tags: {},
            title: item.title || "",
            updatedAt: new Date(),
        })
        .where(and(eq(itemTable.id, item.id), eq(itemTable.userId, user.id)))
        .$dynamic();
}

function getTitle(
    item: typeof itemTable.$inferSelect,
    metadata?: Metadata,
    ogData?: OgObject
): string {
    return convertToUTF8(
        metadata?.title ||
            ogData?.ogTitle ||
            ogData?.twitterTitle ||
            item.title ||
            ""
    ).slice(0, 360);
}

function getDescription(metadata?: Metadata, ogData?: OgObject): string {
    return convertToUTF8(
        metadata?.description ||
            ogData?.ogDescription ||
            ogData?.twitterDescription ||
            ""
    ).slice(0, 360);
}

function getThumbnail(metadata?: Metadata, ogData?: OgObject): string {
    return prepareUrl(
        metadata?.image ||
            ogData?.ogImage?.[0]?.url ||
            ogData?.twitterImage?.[0]?.url ||
            "",
        ogData?.requestUrl || ogData?.ogUrl || ""
    );
}

function getMetadata(metadata?: Metadata, ogData?: OgObject) {
    return {
        ...metadata,
        ...ogData,
        customMetaTags: ogData?.customMetaTags || [],
    };
}
