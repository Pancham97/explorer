import { and, eq } from "drizzle-orm";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import { ulid } from "ulid";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

export async function getOGData(url: string): Promise<OgObject> {
    try {
        const options: OpenGraphScraperOptions = {
            url,
            fetchOptions: {
                headers: {
                    // Some sites block default User-Agent
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.124 Safari/537.36",
                },
            },
            timeout: 4000,
        };

        const { result } = await ogs(options);

        return result;
    } catch (error) {
        throw error;
    }
}

export function isURLRelative(url: string) {
    return url.startsWith("/");
}

export function fetchDomainFromURL(url: string) {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

export function prepareFaviconUrl(
    favicon: string | undefined,
    requestUrl: string
) {
    if (!favicon) return "";
    return isURLRelative(favicon)
        ? `${fetchDomainFromURL(requestUrl)}${favicon}`
        : favicon;
}

type TextItem = {
    title?: string;
    content?: string;
    description?: string;
    url?: string;
};

export async function storeItem(item: File | TextItem, user: User) {
    if (item instanceof File) {
    } else {
        if (isURL(item.content || "")) {
            try {
                const openGraphData = await getOGData(item.content ?? "");
                // console.log("openGraphData", openGraphData);
                const {
                    author,
                    customMetaTags,
                    favicon,
                    ogDescription,
                    ogImage,
                    ogSiteName,
                    ogTitle,
                    ogType,
                    ogUrl,
                    requestUrl,
                    twitterDescription,
                    twitterImage,
                    twitterSite,
                    twitterSiteId,
                    twitterTitle,
                } = openGraphData;

                const itemID = ulid();

                return await db
                    .insert(itemTable)
                    .values({
                        id: itemID,
                        url: item.content || requestUrl,
                        title: ogTitle || twitterTitle || item.title || "",
                        type: "url",
                        tags: {},
                        isFavorite: 0,
                        metadata: {
                            author,
                            customMetaTags,
                            favicon,
                            ogDescription,
                            ogImage,
                            ogSiteName,
                            ogTitle,
                            ogType,
                            ogUrl,
                            requestUrl,
                            twitterDescription,
                            twitterImage,
                            twitterSite,
                            twitterSiteId,
                            twitterTitle,
                        },
                        userId: user.id,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        lastAccessedAt: new Date(),
                        description:
                            ogDescription ||
                            twitterDescription ||
                            item.description ||
                            "",
                        faviconUrl: prepareFaviconUrl(
                            favicon,
                            requestUrl || ogUrl || item.content || ""
                        ),
                        thumbnailUrl:
                            ogImage?.[0]?.url || twitterImage?.[0]?.url || "",
                    })
                    .$dynamic();
            } catch (error) {
                throw error;
            }
        } else {
            const itemID = ulid();
            return await db
                .insert(itemTable)
                .values({
                    id: itemID,
                    url: null,
                    title: item.title || "",
                    content: item.content || "",
                    type: "text",
                    tags: {},
                    isFavorite: 0,
                    metadata: {},
                    userId: user.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastAccessedAt: new Date(),
                    description: item.description || "",
                    faviconUrl: "",
                    thumbnailUrl: "",
                })
                .$dynamic();
        }
    }
}

export async function deleteItem(itemId: string, user: User) {
    return await db
        .delete(itemTable)
        .where(and(eq(itemTable.id, itemId), eq(itemTable.userId, user.id)))
        .$dynamic();
}
