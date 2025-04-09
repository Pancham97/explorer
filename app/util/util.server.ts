import { and, eq, or } from "drizzle-orm";
import { unescape } from "html-escaper";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import { ulid } from "ulid";
import UserAgents from "user-agents";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { metadata as metadataTable } from "~/db/schema/metadata";
import { User } from "~/session";
import { emitter } from "~/util/emitter";
import metascraper from "metascraper";

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

const DEFAULT_DB_VALUES: Partial<typeof itemTable.$inferInsert> = {
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

/**
 * Keep this method in sync with the one in the metadata service
 */
const stripURL = (url: string) => {
    try {
        // Parse the URL
        const urlObj = new URL(url);

        // List of parameters to remove
        const paramsToRemove = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "fbclid",
            "gclid",
            "_ga",
            "ref",
            "source",
        ];

        // Remove specified parameters
        paramsToRemove.forEach((param) => {
            urlObj.searchParams.delete(param);
        });

        // If no search params left, remove the trailing '?'
        const cleanedUrl = urlObj.toString();
        return cleanedUrl.endsWith("?") ? cleanedUrl.slice(0, -1) : cleanedUrl;
    } catch (error) {
        console.error("Invalid URL:", error);
        return url; // Return original URL if parsing fails
    }
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

function isURL(text: string) {
    // Handle empty strings
    if (!text || text.trim() === "") {
        return false;
    }

    // Basic pattern check before attempting URL constructor
    const urlPattern =
        /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\/[^\s]*)?$/i;
    if (!urlPattern.test(text)) {
        return false;
    }

    // If the text doesn't have a protocol, add one for proper URL parsing
    const textWithProtocol = text.match(/^https?:\/\//i)
        ? text
        : "https://" + text;

    try {
        new URL(textWithProtocol);
        return true;
    } catch (e) {
        return false;
    }
}

export function isURLRelative(url: string) {
    return !url.startsWith("http://") && !url.startsWith("https://");
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
    const id = ulid();

    console.log("primary information ->>>>", content, isURL(content));

    const itemData: typeof itemTable.$inferInsert = {
        ...DEFAULT_DB_VALUES,
        id,
        content,
        url: isURL(content) ? content : "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
        type: isURL(content) ? "url" : "text",
    };

    return db.transaction(async (tx) => {
        const existing = await tx
            .select()
            .from(itemTable)
            .where(
                or(
                    and(
                        eq(itemTable.content, content),
                        eq(itemTable.userId, user.id)
                    ),
                    and(
                        eq(itemTable.url, content),
                        eq(itemTable.userId, user.id)
                    )
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
        console.log("saving item", itemData);
        await tx.insert(itemTable).values(itemData);
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

    // Emit processing start event with item type
    emitter.emit("processing-start", { id: item.id, itemType: item.type });

    if (item.type === "file") {
        // Handle file processing here
        emitter.emit("processing-update", {
            id: item.id,
            message: "Processing file content...",
        });

        // After file processing logic
        emitter.emit("processing-complete", {
            id: item.id,
            success: true,
            message: "File processing completed",
        });

        return null;
    } else if (item.url && isURL(item.url)) {
        console.log("processing URL", item.url);
        // Emit update for URL processing
        emitter.emit("processing-update", {
            id: item.id,
            message: "Fetching metadata...",
        });

        // check if the stripped URL exists in the `metadata` table if it does,
        // then update the item with the new metadata if it doesn't, then create
        // a new item with the new metadata by processing the URL
        const existingMetadata = await db
            .select()
            .from(metadataTable)
            .where(eq(metadataTable.strippedUrl, stripURL(item.url)));

        if (existingMetadata[0]?.metadata) {
            emitter.emit("processing-update", {
                id: item.id,
                message: "Fetching metadata...",
            });

            const { image, title, author, lang, publisher, description, logo } =
                existingMetadata[0].metadata as metascraper.Metadata;

            const result = await db
                .update(itemTable)
                .set({
                    description: getDescription(description),
                    faviconUrl: logo?.slice(0, 255),
                    content: item.content,
                    metadata: {
                        ...existingMetadata[0].metadata,
                        title: getTitle(title),
                    },
                    thumbnailUrl: image?.slice(0, 4096),
                    title: getTitle(title),
                    url: item.url,
                    tags: {
                        author,
                        lang,
                        publisher,
                    },
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(itemTable.id, item.id),
                        eq(itemTable.userId, user.id)
                    )
                )
                .$dynamic();

            emitter.emit("processing-complete", {
                id: item.id,
                success: true,
                message: "URL metadata processed successfully",
            });

            return result;
        } else {
            // Emit update for new URL metadata processing
            emitter.emit("processing-update", {
                id: item.id,
                message: "Fetching and processing metadata...",
            });

            // Fire and forget - don't await the processing
            processURLItem(item, user).catch((error) => {
                console.error("Error in background URL processing:", error);
                emitter.emit("processing-complete", {
                    id: item.id,
                    success: false,
                    message: "Failed to process URL in background",
                });
            });

            console.log("returning immediately");
            // Return immediately
            return { id: item.id };
        }
    }

    // For text items
    emitter.emit("processing-update", {
        id: item.id,
        message: "Processing text content...",
    });

    const result = await processTextItem(item, user);

    emitter.emit("processing-complete", {
        id: item.id,
        success: !!result,
        message: "Text content processed successfully",
    });

    return result;
}

export async function deleteItem(itemId: string, user: User) {
    return await db
        .delete(itemTable)
        .where(and(eq(itemTable.id, itemId), eq(itemTable.userId, user.id)))
        .$dynamic();
}

async function processURLItem(item: typeof itemTable.$inferSelect, user: User) {
    if (!item.url) {
        emitter.emit("processing-complete", {
            id: item.id,
            success: false,
            message: "No URL provided for processing",
        });
        return null;
    }

    emitter.emit("processing-update", {
        id: item.id,
        message: "fetching metadata...",
    });

    // const { openGraphData, metadata } = await getOpenGraphData(
    //     new URL(item.content)
    // );

    try {
        const { metadata }: { metadata: metascraper.Metadata } = await fetch(
            // process.env.NODE_ENV === "production"
            // ? // "https://pnhufpvuik.execute-api.ap-south-1.amazonaws.com/fetch-metadata",
            "https://fetcher.sunchay.com/fetch-metadata",
            // : "http://localhost:3000/fetch-metadata",
            {
                method: "POST",
                body: JSON.stringify({
                    url: item.url.trim(),
                }),
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        ).then((res) => res.json());

        if (!metadata) {
            emitter.emit("processing-complete", {
                id: item.id,
                success: false,
                message: "Failed to fetch metadata for URL",
            });
            return null;
        }

        emitter.emit("processing-update", {
            id: item.id,
            message: "Updating item with URL metadata...",
            progress: 80,
        });

        console.log("metadata -<<<<>>>>>", metadata);

        const result = await db
            .update(itemTable)
            .set({
                content: getDescription(metadata.description),
                description: getDescription(metadata.description),
                faviconUrl: prepareUrl(metadata.logo, metadata.url || ""),
                metadata,
                tags: {},
                thumbnailUrl: metadata.image,
                title: getTitle(metadata.title),
                updatedAt: new Date(),
                url: item.url,
            })
            .where(
                and(eq(itemTable.id, item.id), eq(itemTable.userId, user.id))
            )
            .$dynamic();

        // Emit success event after database update
        emitter.emit("processing-complete", {
            id: item.id,
            success: true,
            message: "URL processed successfully",
        });

        console.log("returning result", result);
        return result;
    } catch (error) {
        console.error("Error processing URL", error);
        emitter.emit("processing-complete", {
            id: item.id,
            success: false,
            message: "Error fetching metadata",
        });
        return null;
    }
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

function getTitle(title?: string): string {
    return convertToUTF8(title || "").slice(0, 360);
}

function getDescription(description?: string): string {
    return convertToUTF8(description || "").slice(0, 360);
}

export const saveItem = async (textContent: string, user: User) => {
    try {
        console.log("saving primary information");
        const savedItemInfo = await savePrimaryInformation(textContent, user);
        console.log("saved primary information", savedItemInfo);

        emitter.emit("new-item", savedItemInfo.id);

        processItem(savedItemInfo.id, user);
        return {
            success: true,
            message: "Item saved successfully!",
            data: savedItemInfo,
        };
    } catch (error) {
        console.log("failed to save item from paste", error);
        return {
            success: false,
            message: "Item could not be saved",
            data: textContent,
        };
    }
};
