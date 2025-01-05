import { and, eq } from "drizzle-orm";
import ogs from "open-graph-scraper";
import { OgObject, OpenGraphScraperOptions } from "open-graph-scraper/types";
// import type { Page, Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ulid } from "ulid";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { User } from "~/session";

// All of these are imported because of a stupid thing with Vercel deployment
// https://github.com/vercel/pkg/issues/910

import "puppeteer-extra-plugin-stealth/evasions/chrome.app";
import "puppeteer-extra-plugin-stealth/evasions/chrome.csi";
import "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes";
import "puppeteer-extra-plugin-stealth/evasions/chrome.runtime";
import "puppeteer-extra-plugin-stealth/evasions/defaultArgs";
import "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow";
import "puppeteer-extra-plugin-stealth/evasions/media.codecs";
import "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency";
import "puppeteer-extra-plugin-stealth/evasions/navigator.languages";
import "puppeteer-extra-plugin-stealth/evasions/navigator.permissions";
import "puppeteer-extra-plugin-stealth/evasions/navigator.plugins";
import "puppeteer-extra-plugin-stealth/evasions/navigator.vendor";
import "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver";
import "puppeteer-extra-plugin-stealth/evasions/sourceurl";
import "puppeteer-extra-plugin-stealth/evasions/user-agent-override";
import "puppeteer-extra-plugin-stealth/evasions/webgl.vendor";
import "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions";
import "puppeteer-extra-plugin-user-data-dir";
import "puppeteer-extra-plugin-user-preferences";

// This is required to avoid detection by some websites
puppeteer.use(StealthPlugin());

// chromium.setHeadlessMode = true;
// const remoteExecutablePath =
//     "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

let browser: Browser;

const chromeArgs = [
    // @sparticuz/chromium has default chromeArgs to improve serverless performance, but you can add others as you deem appropriate
    "--font-render-hinting=none", // Improves font-rendering quality and spacing
];

type Product = {
    name: string | undefined | null;
    image: string | undefined | null;
    description: string | undefined | null;
};

async function getProductName(page: Page) {
    const selectors = [
        "#productTitle",
        "#title",
        ".product-title-word-break",
        "h1.a-spacing-none",
    ];

    for (const selector of selectors) {
        try {
            const element = await page.$(selector);
            if (element) {
                return await page.evaluate(
                    (el) => el.textContent?.trim(),
                    element
                );
            }
        } catch (error) {
            console.warn(
                `Failed to get product name with selector ${selector}:`,
                error
            );
        }
    }

    return null;
}

async function getProductImage(page: Page) {
    const imageSelectors = [
        "#landingImage",
        "#imgBlkFront",
        "#main-image",
        "#main-image-container img[data-old-hires]",
        "#imageBlock_feature_div img",
    ];

    for (const selector of imageSelectors) {
        try {
            const img = await page.$(selector);
            if (img) {
                // Try different image attributes
                for (const attr of [
                    "src",
                    "data-old-hires",
                    "data-a-dynamic-image",
                ]) {
                    const value = await page.evaluate(
                        (el, attribute) => el.getAttribute(attribute),
                        img,
                        attr
                    );

                    if (value) {
                        if (attr === "data-a-dynamic-image") {
                            try {
                                const images = JSON.parse(value);
                                return Object.keys(images)[0];
                            } catch (e) {
                                console.warn(
                                    "Failed to parse dynamic image JSON"
                                );
                                continue;
                            }
                        }
                        return value;
                    }
                }
            }
        } catch (error) {
            console.warn(
                `Failed to get product image with selector ${selector}:`,
                error
            );
        }
    }

    return null;
}

async function getProductDescription(page: Page) {
    const descriptionSelectors = [
        "#productDescription",
        "#feature-bullets",
        ".product-description",
        "#description",
    ];

    for (const selector of descriptionSelectors) {
        try {
            const element = await page.$(selector);
            if (element) {
                const text = await page.evaluate(
                    (el) => el.textContent?.trim(),
                    element
                );
                return text?.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
            }
        } catch (error) {
            console.warn(
                `Failed to get product description with selector ${selector}:`,
                error
            );
        }
    }

    return null;
}

async function parseProduct(page: Page) {
    // Wait for some common elements to ensure the page is loaded
    try {
        await page.waitForSelector(
            [
                "#productTitle",
                "#title",
                ".product-title-word-break",
                "h1.a-spacing-none",
            ].join(", "),
            { timeout: 5000 }
        );
    } catch (error) {
        console.warn("Timeout waiting for product elements to load");
    }

    const [name, image, description] = await Promise.all([
        getProductName(page),
        getProductImage(page),
        getProductDescription(page),
    ]);

    return {
        name,
        image,
        description,
    };
}

function isURL(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
}

async function getBrowser() {
    if (browser && browser.connected) return browser;

    chromium.setGraphicsMode = false;

    // @sparticuz/chromium does not work on ARM, so we use a standard Chrome
    // executable locally - see issue
    // https://github.com/Sparticuz/chromium/issues/186
    if (process.env.NODE_ENV === "development") {
        browser = await puppeteer.launch({
            headless: true,
            channel: "chrome",
        });
    } else {
        browser = await puppeteer.launch({
            args: chromeArgs,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }
    return browser;
}

async function fetchWithPuppeteer(url: string) {
    try {
        browser = await getBrowser();

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 3840 });
        await page.goto(url, {
            waitUntil: ["domcontentloaded"],
        });
        const content = await page.content();

        if (process.env.NODE_ENV === "development") {
            await page.screenshot({
                path: "pancham-screenshot.png",
                type: "webp",
                quality: 80,
            });
        }
        // fs.writeFileSync("content.html", content);

        const product = await parseProduct(page);
        console.log("product", product);
        await browser.close();
        return { content, product };
    } catch (error) {
        console.error("error fetching with puppeteer", error);
        throw error;
    } finally {
        if (process.env.NODE_ENV === "development") {
            await browser.close();
        }
    }
}

export async function getOGData(
    url: string
): Promise<{ openGraphData: OgObject; product: Product }> {
    const isPuppeteerEnabled = process.env.ENABLE_PUPPETEER === "true";

    if (isPuppeteerEnabled) {
        const { content, product } = await fetchWithPuppeteer(url);
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
                    faviconUrl: prepareFaviconUrl(
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
