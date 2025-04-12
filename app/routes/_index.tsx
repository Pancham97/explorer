import { data, useFetcher, useLoaderData } from "@remix-run/react";
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@vercel/remix";
import { Loader2 } from "lucide-react";
import React from "react";
import { ContentCard } from "~/components/ui/content-card";
import { InProgressCard } from "~/components/ui/in-progress-card";
import { InputCard } from "~/components/ui/input-card";
import { MasonryGrid } from "~/components/ui/masonry-grid";
import { Motion } from "~/components/ui/motion";
import { useToast } from "~/hooks/use-toast";
import type { loader as itemsLoader } from "~/routes/resources.items";
import { requireUserSession } from "~/session";
import { deleteItem, saveItem, uploadFileToS3 } from "~/util/util.server";

type BaseFetcherData = {
    success: boolean;
    message: string;
};

type ContentFetcherData = BaseFetcherData & {
    content: string;
    itemId?: string;
};

type DeleteFetcherData = BaseFetcherData & {
    itemId: string;
};

type Item = Awaited<ReturnType<typeof itemsLoader>>[number] & {
    type?: string;
    metadata: {
        id: string;
        createdAt: string;
        updatedAt: string;
        strippedUrl: string;
        metadata: unknown;
    };
};

export const meta: MetaFunction = () => {
    return [
        { title: "Sunchay" },
        {
            name: "description",
            content:
                "Welcome to Sunchay! A place to save anything and explore it later.",
        },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) {
        return { user: null };
    }

    return data({ user });
}

export default function Index() {
    const [items, setItems] = React.useState<Item[]>([]);
    const [showCard, setShowCard] = React.useState(false);

    const { user } = useLoaderData<typeof loader>();

    const pasteRef = React.useRef<HTMLFormElement>(null);
    const formRef = React.useRef<HTMLFormElement>(null);

    const itemsFetcher = useFetcher<Item[]>();

    const deleteFetcher = useFetcher<DeleteFetcherData>({
        key: "delete-fetcher",
    });

    // First load on mount
    React.useEffect(() => {
        itemsFetcher.load("/resources/items");
    }, []);

    React.useEffect(() => {
        const interval = setInterval(() => {
            itemsFetcher.load("/resources/items");
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    // React.useEffect(() => {
    //     if (deleteFetcher.state !== "idle") return;

    //     let interval: NodeJS.Timeout | null = null;

    //     const startPolling = () => {
    //         if (!interval) {
    //             interval = setInterval(() => {
    //                 itemsFetcher.load("/resources/items");
    //             }, 7000);
    //         }
    //     };

    //     const stopPolling = () => {
    //         if (interval) {
    //             clearInterval(interval);
    //             interval = null;
    //         }
    //     };

    //     const handleVisibilityChange = () => {
    //         if (document.visibilityState === "visible") {
    //             startPolling();
    //         } else {
    //             stopPolling();
    //         }
    //     };

    //     document.addEventListener("visibilitychange", handleVisibilityChange);

    //     // Start polling if visible on mount
    //     if (document.visibilityState === "visible") {
    //         startPolling();
    //     }

    //     return () => {
    //         stopPolling();
    //         document.removeEventListener(
    //             "visibilitychange",
    //             handleVisibilityChange
    //         );
    //     };
    // }, [deleteFetcher.state, itemsFetcher]);

    React.useEffect(() => {
        if (itemsFetcher.data?.length) {
            setItems(itemsFetcher.data);
        }
    }, [itemsFetcher.data]);

    const { toast } = useToast();

    const pasteFetcher = useFetcher<ContentFetcherData>({
        key: "paste-fetcher",
    });
    const customInputFetcher = useFetcher<ContentFetcherData>({
        key: "input-card",
    });

    React.useEffect(() => {
        const deleteError =
            !deleteFetcher.data?.success && deleteFetcher.data?.itemId;
        if (deleteError) {
            toast({
                title: deleteFetcher.data?.message,
                description: "Delete failed. Please try again.",
                variant: "destructive",
            });
        }
    }, [deleteFetcher.data, toast]);

    React.useEffect(() => {
        const customInputError =
            !customInputFetcher.data?.success &&
            customInputFetcher.data?.content;
        if (customInputError) {
            toast({
                title: customInputFetcher.data?.message,
                description: "Custom input failed. Please try again.",
                variant: "destructive",
            });
        }
    }, [customInputFetcher.data, toast]);

    React.useEffect(() => {
        const pasteError =
            !pasteFetcher.data?.success && pasteFetcher.data?.content;
        if (pasteError) {
            toast({
                title: pasteFetcher.data?.message,
                description:
                    "We have pasted your content to the input card. Please edit it as needed and try again.",
                variant: "destructive",
            });
        } else if (
            pasteFetcher.data?.success &&
            pasteFetcher.data?.content &&
            user
        ) {
            // Handle successful file upload
            toast({
                title: "File uploaded successfully!",
                description:
                    "Your file has been uploaded and is ready to view.",
                variant: "default",
            });
            // Optionally add the file URL to the items list
            if (pasteFetcher.data.itemId) {
                const newItem: Item = {
                    id: pasteFetcher.data.itemId,
                    content: pasteFetcher.data.content,
                    type: "file",
                    title: "Uploaded File",
                    description: "A file you uploaded",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: user.id,
                    isFavorite: 0,
                    lastAccessedAt: null,
                    metadata: {
                        id: pasteFetcher.data.itemId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        strippedUrl: "",
                        metadata: {},
                    },
                    metadataId: "",
                    tags: {},
                    url: "",
                };
                setItems((prevItems) => [...prevItems, newItem]);
            }
        }
    }, [pasteFetcher.data, toast, user]);

    React.useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const activeElement = document.activeElement;

            const clipboardData = event.clipboardData;
            if (!clipboardData) return;

            const files = clipboardData.files;

            if (files.length > 0) {
                // FILE PASTE - Upload
                const file = files[0];
                const formData = new FormData();
                formData.set("pastedContent", file);
                formData.set("intent", "paste");

                pasteFetcher.submit(formData, {
                    method: "post",
                    encType: "multipart/form-data",
                });

                event.preventDefault();
                return;
            }

            const pastedText = clipboardData.getData("text");
            if (!pastedText) return;

            const isTextAreaFocused = activeElement?.tagName === "TEXTAREA";

            if (isTextAreaFocused) {
                // TEXTAREA FOCUS - Append text to input (let browser handle it)
                return; // Don't prevent default
            } else {
                // TEXT ELSEWHERE - Trigger upload
                event.preventDefault();
                const formData = new FormData();
                formData.set("pastedContent", pastedText);
                formData.set("intent", "paste");

                pasteFetcher.submit(formData, {
                    method: "post",
                });
            }
        };

        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, []);

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

    let savedItemsCards;
    if (items.length > 0) {
        savedItemsCards = items
            .filter((item) => deleteFetcher.data?.itemId !== item.id)
            .map((item) => (
                <Motion key={item.id}>
                    <ContentCard
                        key={item.id}
                        data={item}
                        onDelete={handleDelete}
                    />
                </Motion>
            ));
    }

    if (!itemsFetcher.data) {
        return (
            <div className="min-h-screen px-4 md:px-6 pb-6 pt-2 md:pt-6">
                <div className="flex justify-center items-center h-full">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                            Loading...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 md:px-6 pb-6 pt-2 md:pt-6">
            <MasonryGrid>
                <InputCard
                    formRef={formRef}
                    formError=""
                    name="content"
                    intent="custom-input"
                    key="input-card"
                    user={user}
                />
                {showCard && <InProgressCard setShowCard={setShowCard} />}
                {savedItemsCards}
            </MasonryGrid>
            <pasteFetcher.Form ref={pasteRef}>
                <input type="hidden" name="pastedContent" />
                <input type="hidden" name="intent" value="paste" />
            </pasteFetcher.Form>
        </div>
    );
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");

    if (!user) {
        return { message: "User not found", success: false };
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    switch (intent) {
        case "custom-input":
            const typedContent = formData.get("content");

            if (typedContent) {
                return saveItem(typedContent.toString(), user);
            }

        case "paste":
            if (
                request.headers
                    .get("Content-Type")
                    ?.includes("multipart/form-data")
            ) {
                const file = formData.get("pastedContent") as File;
                if (file) {
                    const uploadResult = await uploadFileToS3(file, user);
                    if (uploadResult.success && uploadResult.url) {
                        saveItem(uploadResult.url, user);
                        return {
                            success: true,
                            message: "File uploaded successfully!",
                            content: uploadResult.url,
                            itemId: uploadResult.id,
                        };
                    } else {
                        return {
                            success: false,
                            message: "Failed to upload file",
                            content: null,
                        };
                    }
                }
            }

            const pastedContent = formData.get("pastedContent");
            console.log("pastedContent", pastedContent);
            if (pastedContent) {
                return saveItem(pastedContent.toString(), user);
            }

        case "delete":
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
                console.error("failed to delete item", error);
                return {
                    success: false,
                    message: "Item could not be deleted",
                    itemId,
                };
            }
    }
}
