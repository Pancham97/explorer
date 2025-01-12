import { and, eq } from "drizzle-orm";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
import UserAgents from "user-agents";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";
import { unescape } from "html-escaper";
import { ulid } from "ulid";

type Product = {
    image: Nullable<string>;
    description: Nullable<string>;
    is_robot_indexable: Nullable<boolean>;
    over_18: Nullable<boolean>;
    subreddit_name_prefixed: Nullable<string>;
    subreddit: Nullable<string>;
    title: Nullable<string>;
    url: Nullable<string>;
};

type GetOGDataResponse = {
    openGraphData: OgObject | null;
    product: Product | null;
    // screenshotUrl: string;
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

        // Convert back to string
        return textDecoder.decode(finalBytes);
    } catch (error) {
        return input;
    }
}

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

function stripRedditURL(url: URL) {
    const strippedURL = url.toString().split("?")[0];
    return strippedURL;
}

const cleanRedditText = (text: string): string => {
    return text
        .normalize("NFKD") // Normalize Unicode characters
        .replace(/[\n\r]+/g, " ") // Replace line breaks
        .replace(/\s+/g, " ") // Normalize spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
        .replace(/&amp;/g, "&") // Replace &amp; with &
        .trim()
        .slice(0, 360); // Remove leading/trailing whitespace
};

export async function fetchRedditData(requestUrl: string) {
    const response = await fetch(`${requestUrl}.json?limit=10`);
    const isJSON = response.headers
        .get("content-type")
        ?.includes("application/json");
    if (isJSON) {
        const body = await response.json();
        console.log("body", body);
        console.log("isJSON", isJSON);
        if (Object.keys(body).length > 0) {
            const {
                is_robot_indexable,
                over_18,
                preview,
                selftext,
                subreddit_name_prefixed,
                subreddit,
                title,
                url,
            } = body[0].data.children[0].data;

            let image = null;
            if (preview?.images.length > 0) {
                image = preview.images?.[0]?.source.url;
            }
            if (over_18) {
                image = preview?.images?.[0]?.variants?.nsfw?.source?.url;
            }

            return {
                description: cleanRedditText(selftext),
                image,
                is_robot_indexable,
                over_18,
                subreddit_name_prefixed,
                subreddit,
                title,
                url,
            };
        }
    }
    return null;
}

export async function getOGData(requestUrl: URL): Promise<GetOGDataResponse> {
    // const screenshotUrlInDB = await db
    //     .select({ screenshotUrl: screenshot.screenshotUrl })
    //     .from(screenshot)
    //     .where(eq(screenshot.url, url));

    const userAgent = new UserAgents({
        deviceCategory: "desktop",
    });

    try {
        if (requestUrl.hostname.includes("reddit.com")) {
            throw new Error("Reddit URL not supported");
        } else if (requestUrl.hostname.includes("amazon")) {
            throw new Error("Amazon URL not supported");
        }
        const options: OpenGraphScraperOptions = {
            url: requestUrl.toString(),
            fetchOptions: {
                headers: {
                    // Some sites block default User-Agent
                    "User-Agent": userAgent.random().toString(),
                },
            },
            timeout: 4000,
        };

        const { result } = await ogs(options);
        return {
            openGraphData: result,
            product: {
                description: null,
                image: null,
                title: null,
                url: null,
                is_robot_indexable: null,
                over_18: null,
                subreddit_name_prefixed: null,
                subreddit: null,
            },
        };
        // const options: OpenGraphScraperOptions = {
        //     url: requestUrl.toString(),
        //     fetchOptions: {
        //         headers: {
        //             // Some sites block default User-Agent
        //             "User-Agent": userAgent.random().toString(),
        //         },
        //     },
        //     timeout: 4000,
        // };

        // const ogsResponse = await ogs(options);
    } catch (error) {
        console.error("Error fetching OG data", error);
        if (requestUrl.hostname.includes("reddit.com")) {
            const strippedRedditURL = stripRedditURL(requestUrl);

            const redditData = await fetchRedditData(strippedRedditURL);
            if (redditData) {
                const {
                    description,
                    is_robot_indexable,
                    over_18,
                    subreddit_name_prefixed,
                    subreddit,
                    title,
                    url,
                    image,
                } = redditData;
                return {
                    openGraphData: {
                        // ...ogsResponse.result,
                        // ...ogsResponse.response,
                    },
                    product: {
                        description,
                        image,
                        is_robot_indexable,
                        over_18,
                        subreddit_name_prefixed,
                        subreddit,
                        title,
                        url,
                    },
                };
            }
        }

        const endpoint =
            process.env.NODE_ENV === "production"
                ? "https://n3hdumbu6docpxby3e2wv5cuoi0lsykn.lambda-url.ap-south-1.on.aws"
                : "https://7qv4apcznftiudu35cgrsxcuk40zmnfx.lambda-url.ap-south-1.on.aws";

        // const userAgent = new UserAgents({
        //     deviceCategory: "desktop",
        // });

        // console.log("calling default ogs");
        // const options: OpenGraphScraperOptions = {
        //     url,
        //     fetchOptions: {
        //         headers: {
        //             // Some sites block default User-Agent
        //             "User-Agent": userAgent.random().toString(),
        //         },
        //     },
        //     timeout: 4000,
        // };

        // try {
        //     const response = await ogs(options);
        //     console.log("defaultOgsResult", response.result);
        //     return {
        //         openGraphData: response.result,
        //         product: { description: null, image: null, name: null },
        //         // screenshotUrl: "",
        //     };
        // } catch (error) {
        //     console.error("Error fetching OG data", error);
        //     if (error) {
        const response = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify({
                url: requestUrl,
            }),
        });

        console.log("Lambda response", response);

        if (
            response.headers.get("content-type")?.includes("application/json")
        ) {
            const {
                content,
                product,
                //  screenshotUrl
            } = await response.json();

            const htmlOptions: OpenGraphScraperOptions = {
                html: content,
                timeout: 6000,
            };

            const { result } = await ogs(htmlOptions);

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
    }

    return {
        openGraphData: null,
        product: null,
    };

    //     }
    //     throw error;
    // }
}

export function isURLRelative(url: string) {
    return !url.startsWith("http://") && !url.startsWith("https://");
}

export function prepareUrl(relativePath: Maybe<string>, requestUrl: string) {
    console.log("relativePath", relativePath);
    console.log("requestUrl", requestUrl);
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

export type TextItem = {
    id?: string;
    title?: string;
    content?: string;
    description?: string;
    url?: string;
};

export async function savePrimaryInformation(item: TextItem, user: User) {
    if (item instanceof File) {
        return null;
    } else if (isURL(item.content || "")) {
        const basicItem = {
            title: item.title || "",
            userId: user.id,
            content: item.content || "",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            description: item.description || "",
        };

        const doesItemExist = await db
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.url, item.content || ""),
                    eq(itemTable.userId, user.id)
                )
            );

        console.log("doesItemExist", doesItemExist);

        if (doesItemExist.length) {
            // update the updatedAt date
            return {
                id: doesItemExist[0].id,
                affectedRows: await db
                    .update(itemTable)
                    .set({ updatedAt: new Date() })
                    .where(eq(itemTable.id, doesItemExist[0].id)),
            };
        } else {
            const id = ulid();
            return {
                id,
                affectedRows: await db
                    .insert(itemTable)
                    .values({
                        ...basicItem,
                        id,
                        url: item.content || "",
                        type: "url",
                        tags: {},
                        isFavorite: 0,
                        metadata: {},
                        faviconUrl: "",
                        thumbnailUrl: "",
                    })
                    .$returningId(),
            };
        }
    } else {
        const basicItem = {
            title: item.title || "",
            userId: user.id,
            content: item.content || "",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            description: item.description || "",
        };

        const doesItemExist = await db
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.content, item.content || ""),
                    eq(itemTable.userId, user.id)
                )
            );

        if (doesItemExist.length) {
            // update the updatedAt date
            return {
                id: doesItemExist[0].id,
                affectedRows: await db
                    .update(itemTable)
                    .set({ updatedAt: new Date() })
                    .where(eq(itemTable.id, doesItemExist[0].id)),
            };
        } else {
            const id = ulid();
            return {
                id,
                affectedRows: await db
                    .insert(itemTable)
                    .values({
                        ...basicItem,
                        id,
                        type: "text",
                    })
                    .$returningId(),
            };
        }
    }
}

export async function processItem(id: string, user: User) {
    const items = await db
        .select()
        .from(itemTable)
        .where(and(eq(itemTable.id, id), eq(itemTable.userId, user.id)));
    console.log("processing items", items);
    if (!items.length) return null;
    const item = items[0];
    if (item instanceof File) {
        return null;
    } else {
        if (item.type === "url") {
            const { openGraphData, product } = await getOGData(
                new URL(item.url || "")
            );

            if (openGraphData && product) {
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

                console.log("product -<<<<>>>>>", product);

                return await db
                    .update(itemTable)
                    .set({
                        title: convertToUTF8(
                            product.title ||
                                ogTitle ||
                                twitterTitle ||
                                item.title ||
                                ""
                        ),
                        tags: {},
                        metadata: {
                            author,
                            customMetaTags,
                            favicon,
                            ogDescription: ogDescription || product.description,
                            ogImage: ogImage || product.image,
                            ogSiteName:
                                ogSiteName || product.subreddit_name_prefixed,
                            dcType,
                            ogTitle: convertToUTF8(
                                ogTitle || product.title || ""
                            ),
                            ogType,
                            ogUrl: ogUrl || product.url,
                            requestUrl,
                            twitterDescription: convertToUTF8(
                                twitterDescription || product.description || ""
                            ),
                            twitterImage: twitterImage || product.image,
                            twitterSite: twitterSite || product.subreddit,
                            twitterSiteId,
                            twitterTitle: convertToUTF8(
                                twitterTitle || product.title || ""
                            ),
                        },
                        updatedAt: new Date(),
                        description: convertToUTF8(
                            product.description?.slice(0, 360) ||
                                ogDescription?.slice(0, 360) ||
                                twitterDescription?.slice(0, 360) ||
                                item.description?.slice(0, 360) ||
                                ""
                        ),
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
                    .where(eq(itemTable.id, item.id))
                    .$dynamic();
            }
        } else {
            return await db
                .update(itemTable)
                .set({
                    title: item.title || "",
                    tags: {},
                    metadata: {},
                    updatedAt: new Date(),
                    lastAccessedAt: new Date(),
                    description: item.description || "",
                })
                .where(eq(itemTable.id, item.id))
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
