import { data, useFetcher, useLoaderData } from "@remix-run/react";
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@vercel/remix";
import { desc, eq } from "drizzle-orm";
import React from "react";
import { useEventSource } from "remix-utils/sse/react";
import { ContentCard } from "~/components/ui/content-card";
import { InProgressCard } from "~/components/ui/in-progress-card";
import { EnhancedInputCard } from "~/components/ui/input-card";
import { MasonryGrid } from "~/components/ui/masonry-grid";
import { Motion } from "~/components/ui/motion";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { useToast } from "~/hooks/use-toast";
import { requireUserSession } from "~/session";
import { emitter } from "~/util/emitter";
import {
    deleteItem,
    fetchRedditData,
    processItem,
    savePrimaryInformation,
} from "~/util/util.server";
import ogs from "open-graph-scraper";
import fs from "fs";

export const meta: MetaFunction = () => {
    return [
        { title: "Sunchay | Save anything. Explore!" },
        { name: "description", content: "Welcome to Sunchay!" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) {
        return { items: [], user: null };
    }

    const items = await db
        .select()
        .from(itemTable)
        .where(eq(itemTable.userId, user?.id ?? ""))
        .orderBy(desc(itemTable.updatedAt));

    return data({ items, user });
}

export default function Index() {
    const newItemEventMessage = useEventSource("/sse/save-item", {
        event: "new-item",
    });
    const pasteRef = React.useRef<HTMLFormElement>(null);
    const formRef = React.useRef<HTMLFormElement>(null);

    const { toast } = useToast();

    const defaultStaticItem = React.useMemo(
        () => (
            <EnhancedInputCard
                formRef={formRef}
                formError=""
                name="content"
                intent="custom-input"
                key="input-card"
            />
        ),
        []
    );

    if (newItemEventMessage) {
        console.log("newItemEventMessage", newItemEventMessage);
    }

    const { items } = useLoaderData<typeof loader>();

    const [staticItems, setStaticItems] = React.useState<React.ReactNode[]>([
        defaultStaticItem,
    ]);

    const pasteFetcher = useFetcher<{
        success: boolean;
        message: string;
        content: string;
    }>({ key: "paste-fetcher" });
    const customInputFetcher = useFetcher<{
        success: boolean;
        message: string;
        content: string;
        title: string;
    }>({ key: "input-card" });
    const deleteFetcher = useFetcher<{
        itemId: string;
        success: boolean;
        message: string;
    }>({
        key: "delete-fetcher",
    });

    React.useEffect(() => {
        if (!deleteFetcher.data?.success && deleteFetcher.data?.itemId) {
            toast({
                title: deleteFetcher.data?.message,
                description: "Please try again",
                variant: "destructive",
            });
        }
    }, [deleteFetcher.data, toast]);

    React.useEffect(() => {
        if (
            !customInputFetcher.data?.success &&
            customInputFetcher.data?.content
        ) {
            toast({
                title: customInputFetcher.data?.message,
                description: "Please try again",
                variant: "destructive",
            });
        }
    }, [customInputFetcher.data, toast]);

    React.useEffect(() => {
        if (!pasteFetcher.data?.success && pasteFetcher.data?.content) {
            toast({
                title: pasteFetcher.data?.message,
                description:
                    "We have pasted your content to the input card. Please edit it as needed and try again.",
                variant: "destructive",
            });
        }
    }, [pasteFetcher.data, toast]);

    React.useEffect(() => {
        if (pasteFetcher.state === "submitting") {
            setStaticItems([
                defaultStaticItem,
                <InProgressCard key="in-progress" />,
            ]);
        }
        if (pasteFetcher.state === "loading") {
            setStaticItems([defaultStaticItem]);
        }
    }, [defaultStaticItem, pasteFetcher.data, pasteFetcher.state]);

    React.useEffect(() => {
        if (customInputFetcher.state === "submitting") {
            setStaticItems([
                defaultStaticItem,
                <InProgressCard key="in-progress" />,
            ]);
        }
        if (customInputFetcher.state === "loading") {
            setStaticItems([defaultStaticItem]);
        }
    }, [customInputFetcher.state, defaultStaticItem]);

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const copiedFiles = clipboardData.files;

        if (copiedFiles.length > 0) {
            const file = copiedFiles[0];
            const formData = new FormData(pasteRef.current!);
            formData.set("pastedContent", file);
            pasteFetcher.submit(formData, {
                method: "post",
                encType: "multipart/form-data",
            });
        } else {
            const pastedContent = clipboardData.getData("text");
            if (!pastedContent) return;

            const formData = new FormData(pasteRef.current!);
            formData.set("pastedContent", pastedContent);
            pasteFetcher.submit(formData, {
                method: "post",
            });
        }
    };

    const handleDelete = async (itemId: string) => {
        deleteFetcher.submit(
            {
                intent: "delete",
                itemId,
            },
            {
                method: "post",
            }
        );
    };

    const itemsToShow = items.filter(
        (item) => deleteFetcher.formData?.get("itemId") !== item.id
    );

    const list = (
        <MasonryGrid>
            {staticItems.map((item) => item)}
            {itemsToShow.map((item) => (
                <Motion key={item.id}>
                    <ContentCard
                        key={item.id}
                        content={item}
                        onDelete={handleDelete}
                    />
                </Motion>
            ))}
        </MasonryGrid>
    );

    return (
        <div className="p-4 md:p-8 pt-2 md:pt-6">
            <div onPaste={handlePaste}>
                <pasteFetcher.Form ref={pasteRef}>
                    <input type="hidden" name="pastedContent" />
                    <input type="hidden" name="intent" value="paste" />
                </pasteFetcher.Form>
                <div className="min-h-screen">{list}</div>
            </div>
        </div>
    );
}

export async function action({ request }: ActionFunctionArgs) {
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

    function isURL(url: string) {
        return url.startsWith("http://") || url.startsWith("https://");
    }

    const session = await requireUserSession(request);
    const user = session.get("user");

    if (!user) {
        return { message: "User not found", success: false };
    }
    const formData = await request.formData();
    const intent = formData.get("intent");

    console.log("intent", intent);

    if (intent === "paste") {
        if (request.headers.get("Content-Type") === "multipart/form-data") {
            const file = formData.get("pastedContent") as File;

            console.log("file", file.name, file.type, file.size);
            return {
                success: false,
                message: "File could not be saved",
            };
        }

        const content = formData.get("pastedContent");
        try {
            if (content) {
                console.log("saving primary information");
                const savedItemInfo = await savePrimaryInformation(
                    {
                        content: content.toString(),
                    },
                    user
                );

                emitter.emit("new-item", savedItemInfo?.id);

                if (savedItemInfo?.id) {
                    console.log("emitting new item");
                    console.log("processing item");
                    const result = await processItem(savedItemInfo?.id, user);
                    console.log("processing result", result);
                    if (result && result[0].affectedRows > 0) {
                        return {
                            success: true,
                            message: "Item saved successfully!",
                            data: result,
                        };
                    }
                }
                return {
                    success: false,
                    message: "Item could not be saved",
                    content,
                };
            }
        } catch (error) {
            console.log("failed to save item from paste", error);
            return {
                success: false,
                message: "Item could not be saved",
                content,
            };
        }
    }

    if (intent === "custom-input") {
        const title = formData.get("title");
        const content = formData.get("content");

        try {
            if (content) {
                if (isURL(content.toString())) {
                    const response = await fetch(content.toString(), {
                        redirect: "follow",
                    });

                    const html = await response.text();

                    console.log(
                        "data",
                        response.url,
                        response.redirected,
                        new URL(response.url)
                    );

                    if (new URL(response.url).hostname.includes("reddit")) {
                        console.log("reddit url");
                        const redditResponse = await fetch(
                            `${stripRedditURL(
                                new URL(response.url)
                            )}.json?limit=10`
                        );
                        console.log("redditResponse", redditResponse.headers);
                        const isJSON = redditResponse.headers
                            .get("content-type")
                            ?.includes("application/json");
                        if (isJSON) {
                            const body = await redditResponse.json();
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
                                    image =
                                        preview?.images?.[0]?.variants?.nsfw
                                            ?.source?.url;
                                }

                                console.log({
                                    description: cleanRedditText(selftext),
                                    image,
                                    is_robot_indexable,
                                    over_18,
                                    subreddit_name_prefixed,
                                    subreddit,
                                    title,
                                    url,
                                });
                                const savedItemInfo =
                                    await savePrimaryInformation(
                                        {
                                            content: content.toString(),
                                            title: title?.toString(),
                                            description:
                                                cleanRedditText(selftext),
                                            url: new URL(
                                                response.url
                                            ).toString(),
                                        },
                                        user
                                    );

                                emitter.emit("new-item", savedItemInfo?.id);

                                return {
                                    success: true,
                                    message: "Item saved successfully!",
                                    data: savedItemInfo,
                                    content,
                                    title,
                                };
                            }
                        }
                    } else {
                        const data = await ogs({ html });
                        console.log("data", data);
                        const savedItemInfo = await savePrimaryInformation(
                            {
                                content:
                                    data.result.ogDescription ||
                                    content.toString(),
                                title: data.result.ogTitle || title?.toString(),
                                description: data.result.ogDescription || "",
                                url: data.result.ogUrl,
                            },
                            user
                        );

                        emitter.emit("new-item", savedItemInfo?.id);

                        if (savedItemInfo?.id) {
                            console.log("emitting new item", savedItemInfo);

                            const result = await processItem(
                                savedItemInfo?.id ?? "",
                                user
                            );
                            if (result) {
                                return {
                                    success: result[0].affectedRows > 0,
                                    message:
                                        result[0].affectedRows > 0
                                            ? "Item saved successfully!"
                                            : "Item could not be saved",
                                    data: result,
                                    content,
                                    title,
                                };
                            }
                        }

                        return {
                            success: true,
                            message: "Item saved successfully!",
                            data: savedItemInfo,
                            content,
                            title,
                        };
                    }
                } else {
                    const savedItemInfo = await savePrimaryInformation(
                        {
                            content: content.toString(),
                        },
                        user
                    );

                    emitter.emit("new-item", savedItemInfo?.id);

                    return {
                        success: true,
                        message: "Item saved successfully!",
                        data: savedItemInfo,
                        content,
                        title,
                    };
                }

                return {
                    success: false,
                    message: "Item could not be saved",
                    content,
                    title,
                };
            }
        } catch (error) {
            console.log("failed to save item from custom input", error);
            return {
                success: false,
                message: "Item could not be saved",
                content,
                title,
            };
        }
    }

    if (intent === "delete") {
        const itemId = formData.get("itemId");
        try {
            if (itemId) {
                const result = await deleteItem(itemId.toString(), user);
                if (result && result[0].affectedRows > 0) {
                    return {
                        success: true,
                        message: "Item deleted successfully!",
                        data: result,
                        itemId,
                    };
                }

                return {
                    success: false,
                    message: "Item could not be deleted",
                    data: result,
                    itemId,
                };
            }
        } catch (error) {
            console.log("failed to delete item", error);
            return {
                success: false,
                message: "Item could not be deleted",
                itemId,
            };
        }
    }
}
