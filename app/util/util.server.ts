import { and, eq } from "drizzle-orm";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import { ulid } from "ulid";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";

type Product = {
    name: string | undefined | null;
    image: string | undefined | null;
    description: string | undefined | null;
};

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

export async function getOGData(
    url: string
): Promise<{ openGraphData: OgObject; product: Product }> {
    const isPuppeteerEnabled = process.env.ENABLE_PUPPETEER === "true";

    if (isPuppeteerEnabled) {
        const response = await fetch(
            "https://n3hdumbu6docpxby3e2wv5cuoi0lsykn.lambda-url.ap-south-1.on.aws",
            {
                method: "POST",
                body: JSON.stringify({
                    url,
                    isLocal: process.env.NODE_ENV === "development",
                }),
            }
        );

        const { content, product } = await response.json();

        const options: OpenGraphScraperOptions = {
            html: content,
            timeout: 4000,
        };

        const { result } = await ogs(options);

        return {
            openGraphData: result,
            product,
        };
    }

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

    return {
        openGraphData: result,
        product: { description: null, image: null, name: null },
    };
}

export function isURLRelative(url: string) {
    return url.startsWith("/");
}

export function fetchDomainFromURL(url: string) {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

export function prepareUrl(
    relativePath: string | undefined,
    requestUrl: string
) {
    if (!relativePath) return "";
    return isURLRelative(relativePath)
        ? `${fetchDomainFromURL(requestUrl)}${relativePath}`
        : relativePath;
}

type TextItem = {
    title?: string;
    content?: string;
    description?: string;
    url?: string;
};

export async function storeItem(item: File | TextItem, user: User) {
    if (item instanceof File) {
        return null;
    } else {
        if (isURL(item.content || "")) {
            const { openGraphData, product } = await getOGData(
                item.content ?? ""
            );
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
                dcType,
                twitterImage,
                twitterSite,
                twitterSiteId,
                twitterTitle,
            } = openGraphData;

            // console.log("openGraphData", openGraphData);

            const itemID = ulid();

            // const content = await fetchWithPuppeteer(item.content || "");

            return await db
                .insert(itemTable)
                .values({
                    id: itemID,
                    url: item.content || requestUrl,
                    title:
                        product.name ||
                        ogTitle ||
                        twitterTitle ||
                        item.title ||
                        "",
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
                        dcType,
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
                        product.description ||
                        ogDescription ||
                        twitterDescription ||
                        item.description ||
                        "",
                    faviconUrl: prepareUrl(
                        favicon,
                        requestUrl || ogUrl || item.content || ""
                    ),
                    thumbnailUrl:
                        product.image ||
                        ogImage?.[0]?.url ||
                        twitterImage?.[0]?.url ||
                        "",
                })
                .$dynamic();
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
