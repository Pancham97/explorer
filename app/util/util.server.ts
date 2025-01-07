import { and, eq } from "drizzle-orm";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import { ulid } from "ulid";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";
import fs from "fs";

type Product = {
    name: string | undefined | null;
    image: string | undefined | null;
    description: string | undefined | null;
};

type GetOGDataResponse = {
    openGraphData: OgObject;
    product: Product;
    // screenshotUrl: string;
};

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

export async function getOGData(url: string): Promise<GetOGDataResponse> {
    const isPuppeteerEnabled = process.env.ENABLE_PUPPETEER === "true";

    // const screenshotUrlInDB = await db
    //     .select({ screenshotUrl: screenshot.screenshotUrl })
    //     .from(screenshot)
    //     .where(eq(screenshot.url, url));

    const endpoint =
        process.env.NODE_ENV === "production"
            ? "https://n3hdumbu6docpxby3e2wv5cuoi0lsykn.lambda-url.ap-south-1.on.aws"
            : "https://7qv4apcznftiudu35cgrsxcuk40zmnfx.lambda-url.ap-south-1.on.aws";

    if (isPuppeteerEnabled) {
        const response = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify({
                url,
                // fetchScreenshot: !screenshotUrlInDB.length,
            }),
        });

        const {
            content,
            product,
            //  screenshotUrl
        } = await response.json();

        const options: OpenGraphScraperOptions = {
            html: content,
            timeout: 6000,
        };

        const { result } = await ogs(options);

        // if (
        //     !screenshotUrlInDB.length &&
        //     screenshotUrl &&
        //     screenshotUrl.length > 0
        // ) {
        //     await db.insert(screenshot).values({
        //         id: ulid(),
        //         url,
        //         screenshotUrl,
        //     });
        // }

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
        // screenshotUrl: "",
    };
}

export function isURLRelative(url: string) {
    return url.startsWith("/");
}

export function prepareUrl(
    relativePath: string | undefined,
    requestUrl: string
) {
    if (!relativePath) return "";
    return isURLRelative(relativePath)
        ? `${new URL(requestUrl).origin}${relativePath}`
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
                        product.description?.slice(0, 360) ||
                        ogDescription?.slice(0, 360) ||
                        twitterDescription?.slice(0, 360) ||
                        item.description?.slice(0, 360) ||
                        "",
                    faviconUrl: prepareUrl(
                        favicon,
                        requestUrl || ogUrl || item.content || ""
                    ),
                    thumbnailUrl: prepareUrl(
                        product.image ||
                            ogImage?.[0]?.url ||
                            twitterImage?.[0]?.url ||
                            "",
                        requestUrl || ogUrl || item.content || ""
                    ),
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
