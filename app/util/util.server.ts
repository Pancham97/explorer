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
                        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                },
            },
            timeout: 1000,
        };

        const { result } = await ogs(options);
        return result;
    } catch (error) {
        console.error("Error fetching OG data:", error);
        return { error: "Error fetching OG data" };
    }
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
            const openGraphData = await getOGData(item.content ?? "");
            const {
                ogTitle,
                twitterTitle,
                ogDescription,
                twitterDescription,
                ogUrl,
                ogImage,
                twitterImage,
                favicon,
                customMetaTags,
                requestUrl,
            } = openGraphData;

            await db.insert(itemTable).values({
                id: ulid(),
                url: item.content || requestUrl,
                title: ogTitle || twitterTitle || item.title || "",
                type: "url",
                tags: {},
                isFavorite: 0,
                metadata: {
                    ogTitle,
                    twitterTitle,
                    ogDescription,
                    twitterDescription,
                    ogUrl,
                    ogImage,
                    twitterImage,
                    favicon,
                    customMetaTags,
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
                faviconUrl: favicon,
                thumbnailUrl: ogImage?.[0]?.url || twitterImage?.[0]?.url || "",
            });
        } else {
            await db.insert(itemTable).values({
                id: ulid(),
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
            });
        }
    }
}

export async function deleteItem(itemId: string, user: User) {
    await db
        .delete(itemTable)
        .where(and(eq(itemTable.id, itemId), eq(itemTable.userId, user.id)));
}
