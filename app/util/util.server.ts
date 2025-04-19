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
import metascraper from "metascraper";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, CLOUDFRONT_URL } from "~/common/aws";
import { readFileSync } from "fs";
import { FileMetadata, Metadata } from "~/lib/types";

type OGResponse = {
    openGraphData?: OgObject;
    metadata?: Metadata;
};

const DEFAULT_DB_VALUES: Partial<typeof itemTable.$inferInsert> = {
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    updatedAt: new Date(),
    description: "",
    isFavorite: 0,
    metadata: {},
    tags: {},
    title: "",
    type: "text" as const,
    url: "",
};

const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/tiff",
    "image/bmp",
    "image/vnd.microsoft.icon",
    "image/heic",
    "image/heif",
];

const videoTypes = [
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/webm",
    "video/mkv",
];

const fileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "application/zip",
    "application/x-7z-compressed",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/x-gzip",
    "application/x-bzip2",
    "application/x-bzip",
    "application/x-compressed",
    "application/x-compressed-zip",
    "application/x-compressed-tar",
    "application/x-compressed-gzip",
    "application/x-compressed-bzip2",
    "application/x-compressed-bzip",
];

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

function getTitle(title?: string): string {
    return convertToUTF8(title || "").slice(0, 360);
}

function getDescription(description?: string): string {
    return convertToUTF8(description || "").slice(0, 360);
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
    // Empty or malformed
    if (!url) return false;

    // Full URL
    if (/^https?:\/\//i.test(url)) return false;

    // Protocol-relative URL
    if (/^\/\//.test(url)) return false;

    // It's relative
    return true;
}

function classifyResponse(headers: Headers, url: string) {
    const contentType = headers.get("content-type") || "";
    const contentDisposition = headers.get("content-disposition") || "";

    if (contentType.includes("text/html")) {
        return "website";
    }

    if (imageTypes.some((ft) => contentType.includes(ft))) {
        return "image";
    }

    if (videoTypes.some((ft) => contentType.includes(ft))) {
        return "video";
    }

    if (fileTypes.some((ft) => contentType.includes(ft))) {
        return "document";
    }

    if (
        contentDisposition.includes("attachment") ||
        contentDisposition.includes("filename")
    ) {
        return "file";
    }

    if (url.match(/\.(pdf|docx?|xlsx?|pptx?|zip|rar|jpeg|jpg|png|mp4|csv)$/i)) {
        return "file";
    }

    return "website";
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

export function prepareUrl(path: Maybe<string>, requestUrl: string) {
    if (!path) return "";

    const url = unescape(path.trim());

    if (!isURLRelative(url)) {
        // Handles absolute + protocol-relative
        if (url.startsWith("//")) {
            const protocol = new URL(requestUrl).protocol;
            return `${protocol}${url}`;
        }
        return url;
    }

    const base = new URL(requestUrl).origin;
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

async function saveURLInfo(content: string, user: User, response?: Response) {
    const id = ulid();

    const urlData: typeof itemTable.$inferInsert = {
        ...DEFAULT_DB_VALUES,
        id,
        content,
        url: content,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
        status: "pending",
        type: "url",
        isRequestFromDevEnvironment:
            process.env.NODE_ENV === "development" ? 1 : 0,
    };

    let tempMetadata: Maybe<Metadata>;
    if (response) {
        const { result: openGraphDataFromURL } = await ogs({
            html: await response.text(),
        });

        if (openGraphDataFromURL.success) {
            console.log("openGraphDataFromURL", openGraphDataFromURL);
            const {
                author,
                dcPublisher,
                favicon,
                ogArticlePublisher,
                ogDescription,
                ogImage,
                ogLocale,
                ogLogo,
                ogSiteName,
                ogTitle,
                ogType,
                twitterTitle,
            } = openGraphDataFromURL;

            urlData.description = getDescription(ogDescription);
            urlData.title = getTitle(ogTitle ?? twitterTitle);

            let transformedLogo = prepareUrl(favicon, content);
            if (ogLogo) {
                transformedLogo = prepareUrl(ogLogo, content);
            }

            console.log(
                "prepareUrl(ogImage?.[0]?.url, content)",
                prepareUrl(ogImage?.[0]?.url, content)
            );

            tempMetadata = {
                author: author,
                description: getDescription(ogDescription),
                image: prepareUrl(ogImage?.[0]?.url, content),
                lang: ogLocale,
                logo: transformedLogo,
                publisher: ogArticlePublisher ?? dcPublisher,
                title: getTitle(ogTitle ?? twitterTitle),
                url: content,
                type: ogType,
                siteName: ogSiteName,
            };
        }
    }

    return db.transaction(async (tx) => {
        const [existingURLItem] = await tx
            .selectDistinct()
            .from(itemTable)
            .where(
                or(
                    and(
                        eq(itemTable.type, "url"),
                        eq(itemTable.content, content),
                        eq(itemTable.userId, user.id)
                    ),
                    and(
                        eq(itemTable.type, "url"),
                        eq(itemTable.url, content),
                        eq(itemTable.userId, user.id)
                    )
                )
            )
            .limit(1);

        if (!existingURLItem) {
            console.log("saving URL item", urlData);

            const [existingMetadata] = await tx
                .select()
                .from(metadataTable)
                .where(eq(metadataTable.strippedUrl, stripURL(content)));

            if (existingMetadata) {
                await tx
                    .update(metadataTable)
                    .set({
                        metadata: tempMetadata,
                        updatedAt: new Date(),
                    })
                    .where(eq(metadataTable.id, existingMetadata.id));

                urlData.metadataId = existingMetadata.id;
            } else {
                const newMetadataItemID = ulid();
                const metadataTableObject: typeof metadataTable.$inferInsert = {
                    id: newMetadataItemID,
                    metadata: tempMetadata,
                    strippedUrl: stripURL(content),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                await tx.insert(metadataTable).values(metadataTableObject);
                urlData.metadataId = newMetadataItemID;
            }

            urlData.status = "partial";

            await tx.insert(itemTable).values(urlData);
            return { id };
        }

        if (existingURLItem.metadataId) {
            const newMetadataItemID = ulid();

            const [existingMetadata] = await tx
                .select({
                    id: metadataTable.id,
                    metadata: metadataTable.metadata,
                })
                .from(metadataTable)
                .where(eq(metadataTable.id, existingURLItem.metadataId));

            if (existingMetadata) {
                await tx
                    .update(metadataTable)
                    .set({
                        metadata: {
                            ...tempMetadata,
                            ...(existingMetadata.metadata as Metadata),
                        },
                        updatedAt: new Date(),
                    })
                    .where(eq(metadataTable.id, existingURLItem.metadataId));
                await tx
                    .update(itemTable)
                    .set({
                        status: "partial",
                        metadataId: existingMetadata.id,
                        isRequestFromDevEnvironment:
                            process.env.NODE_ENV === "development" ? 1 : 0,
                        updatedAt: new Date(),
                    })
                    .where(eq(itemTable.id, existingURLItem.id));

                return { id: existingURLItem.id };
            } else {
                const metadataTableObject: typeof metadataTable.$inferInsert = {
                    id: newMetadataItemID,
                    metadata: tempMetadata,
                    strippedUrl: stripURL(content),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                await tx.insert(metadataTable).values(metadataTableObject);
                await tx
                    .update(itemTable)
                    .set({
                        status: "partial",
                        metadataId: newMetadataItemID,
                        updatedAt: new Date(),
                        isRequestFromDevEnvironment:
                            process.env.NODE_ENV === "development" ? 1 : 0,
                    })
                    .where(eq(itemTable.id, existingURLItem.id));

                return { id: existingURLItem.id };
            }
        }

        await tx
            .update(itemTable)
            .set({ updatedAt: new Date(), status: "partial" })
            .where(eq(itemTable.id, existingURLItem.id));

        return { id: existingURLItem.id };
    });
}

// Created a copy from `__index.tsx`. Need to find a way to share this between the two files.
const getFileCategory = (fileExtension: string | undefined) => {
    if (!fileExtension) {
        return "file";
    }

    switch (fileExtension) {
        case "jpg":
        case "jpeg":
        case "png":
        case "heic":
        case "heif":
        case "gif":
        case "webp":
            return "image";

        case "mp4":
        case "mov":
        case "mkv":
        case "avi":
        case "webm":
            return "video";

        case "pdf":
        case "doc":
        case "docx":
        case "xls":
        case "xlsx":
        case "ppt":
        case "pptx":
        case "txt":
        case "md":
        case "csv":
        case "json":
        case "xml":
        case "yaml":
        case "yml":
        case "toml":
        case "ini":
        case "conf":
        case "cfg":
        case "config":
        case "log":
        case "sh":
        case "bash":
        case "zsh":
        case "fish":
        case "bat":
        case "ps1":
            return "document";

        default:
            return "file";
    }
};

async function saveFile(
    content: string,
    user: User,
    fileID?: string,
    originalFileName?: string,
    inferredTypeFromHeaders?: string
) {
    const id = fileID ?? ulid();

    const fileData: typeof itemTable.$inferInsert = {
        ...DEFAULT_DB_VALUES,
        id,
        content,
        url: content,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
        type:
            getFileCategory(originalFileName?.split(".").pop()) ||
            inferredTypeFromHeaders ||
            "file",
        status: "pending",
        isRequestFromDevEnvironment:
            process.env.NODE_ENV === "development" ? 1 : 0,
    };

    return db.transaction(async (tx) => {
        const [existingFileItem] = await tx
            .selectDistinct()
            .from(itemTable)
            .where(
                or(
                    and(
                        eq(
                            itemTable.type,
                            getFileCategory(
                                originalFileName?.split(".").pop()
                            ) ||
                                inferredTypeFromHeaders ||
                                "file"
                        ),
                        eq(itemTable.content, content),
                        eq(itemTable.userId, user.id)
                    ),
                    and(
                        eq(
                            itemTable.type,
                            getFileCategory(
                                originalFileName?.split(".").pop()
                            ) ||
                                inferredTypeFromHeaders ||
                                "file"
                        ),
                        eq(itemTable.url, content),
                        eq(itemTable.userId, user.id)
                    )
                )
            )
            .limit(1);

        if (existingFileItem) {
            await tx
                .update(itemTable)
                .set({
                    updatedAt: new Date(),
                })
                .where(eq(itemTable.id, existingFileItem.id));

            return { id: existingFileItem.id };
        }
        console.log("saving file URL", content);

        await tx.insert(itemTable).values(fileData);
        return { id };
    });
}

async function saveText(content: string, user: User) {
    const id = ulid();

    const textData: typeof itemTable.$inferInsert = {
        ...DEFAULT_DB_VALUES,
        id,
        content: convertToUTF8(content),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "completed",
        userId: user.id,
        type: "text",
    };

    return db.transaction(async (tx) => {
        const existingTextItem = await tx
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

        if (existingTextItem[0]) {
            await tx
                .update(itemTable)
                .set({ updatedAt: new Date() })
                .where(eq(itemTable.id, existingTextItem[0].id));

            console.log("returning existing text item", existingTextItem[0].id);
            return { id: existingTextItem[0].id };
        }
        console.log("saving item", textData);
        await tx.insert(itemTable).values(textData);
        return { id };
    });
}

export async function savePrimaryInformation(
    content: string,
    user: User,
    fileID?: string,
    originalFileName?: string
): Promise<{
    id: string;
}> {
    console.log("primary information ->>>>", content, isURL(content), fileID);

    if (!isURL(content)) {
        console.log("saving text");
        return await saveText(content, user);
    }

    if (fileID) {
        console.log("saving file");
        return await saveFile(content, user, fileID, originalFileName);
    }

    const response = await fetch(content, {
        method: "GET",
    });

    if (response.ok) {
        console.log("response", response);
        const inferredTypeFromHeaders = classifyResponse(
            response.headers,
            content
        );

        switch (inferredTypeFromHeaders) {
            case "website":
                return await saveURLInfo(content, user, response);

            case "file":
            case "image":
            case "video":
            case "document":
                return await saveFile(
                    content,
                    user,
                    fileID,
                    originalFileName,
                    inferredTypeFromHeaders
                );
        }
    }

    console.log("saving URL after failing to fetch response");
    return await saveURLInfo(content, user);
}

async function processFile(
    item: typeof itemTable.$inferSelect,
    user: User,
    fileID?: string,
    originalFileName?: string
) {
    console.log("processing file", item.url);
    if (!item.url) {
        return null;
    }

    try {
        // If we have a fileID, we have already uploaded the file from the frontend via api/presign-upload
        if (fileID) {
            console.log("fetching file metadata for an already uploaded file");
            return await fetch(
                process.env.NODE_ENV === "production"
                    ? "https://fetcher.sunchay.com/fetch-file-metadata"
                    : "http://localhost:3000/fetch-file-metadata",
                {
                    method: "POST",
                    body: JSON.stringify({
                        sunchayAssetUrl: item.url,
                        originalURL: null,
                        userID: user.id,
                        originalFileName,
                        fileID,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        } else {
            const response = await fetch(item.url, {
                method: "GET",
            });

            const contentType =
                response.headers.get("content-type") ||
                "application/octet-stream";
            const extension = contentType.split("/")[1] || "bin";
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], `${item.id}.${extension}`, {
                type: contentType,
            });
            const uploadResult = await uploadFileToS3(file, user);
            if (uploadResult.success) {
                console.log("uploading file metadata");
                return await fetch(
                    process.env.NODE_ENV === "production"
                        ? "https://fetcher.sunchay.com/fetch-file-metadata"
                        : "http://localhost:3000/fetch-file-metadata",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            sunchayAssetUrl: uploadResult.url,
                            originalURL: item.url,
                            userID: user.id,
                            originalFileName,
                        }),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
        }
    } catch (error) {
        console.error("Failed to upload file", error);
    }
}

export async function processItem(
    itemID: string,
    user: User,
    fileID?: string,
    originalFileName?: string
) {
    const [item] = await db
        .selectDistinct()
        .from(itemTable)
        .where(and(eq(itemTable.id, itemID), eq(itemTable.userId, user.id)));

    console.log("processing item", item);

    if (!item) {
        return null;
    }

    if (item.type === "text") {
        return await processTextItem(item, user);
    } else if (
        (item.type === "file" ||
            item.type === "image" ||
            item.type === "video" ||
            item.type === "document") &&
        item.url
    ) {
        return await processFile(item, user, fileID, originalFileName);
    }
}
export async function deleteItem(itemId: string, user: User) {
    return await db
        .delete(itemTable)
        .where(and(eq(itemTable.id, itemId), eq(itemTable.userId, user.id)))
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
            description: getDescription(item.description || ""),
            lastAccessedAt: new Date(),
            metadata: {},
            tags: {},
            title: getTitle(item.title || ""),
            updatedAt: new Date(),
        })
        .where(and(eq(itemTable.id, item.id), eq(itemTable.userId, user.id)))
        .$dynamic();
}

export const saveItem = async (
    textContent: string,
    user: User,
    fileID?: string,
    originalFileName?: string
) => {
    try {
        console.log("saving primary information");
        const savedItemInfo = await savePrimaryInformation(
            textContent,
            user,
            fileID,
            originalFileName
        );
        console.log("saved primary information", savedItemInfo);

        processItem(savedItemInfo.id, user, fileID, originalFileName);
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

export async function uploadFileToS3(file: File, user: User) {
    const id = ulid();
    const fileExtension = file.name.split(".").pop();
    const key = `private/uploads/${user.id}/${id}.${fileExtension}`;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const putObjectCommand = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        await s3Client.send(putObjectCommand);

        console.log("key", key);

        const cloudfrontUrl = `${CLOUDFRONT_URL}/${key}`;

        console.log("cloudfrontUrl", cloudfrontUrl);

        return {
            success: true,
            message: "File uploaded successfully!",
            url: cloudfrontUrl,
            id,
        };
    } catch (error) {
        console.error("Failed to upload file:", error);
        return {
            success: false,
            message: "Failed to upload file",
            url: null,
            id: null,
        };
    }
}
