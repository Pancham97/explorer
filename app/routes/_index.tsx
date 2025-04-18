import {
    data,
    useFetcher,
    useLoaderData,
    useRouteError,
} from "@remix-run/react";
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@vercel/remix";
import { Loader2, Paperclip } from "lucide-react";
import React from "react";
import { Dropzone } from "~/components/dropzone";
import { Button } from "~/components/ui/button";
import { ContentCard } from "~/components/ui/content-card";
import { InProgressCard } from "~/components/ui/in-progress-card";
import { InputCard } from "~/components/ui/input-card";
import { MasonryGrid } from "~/components/ui/masonry-grid";
import { Motion } from "~/components/ui/motion";
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/hooks/use-toast";
import { INPUT_CARD_FETCHER_KEY, PASTE_FETCHER_KEY } from "~/lib/constants";
import { ItemWithMetadata } from "~/lib/types";
import type { loader as itemsLoader } from "~/routes/resources.items";
import { requireUserSession } from "~/session";
import { deleteItem, saveItem } from "~/util/util.server";

const POLL_INTERVAL = 5000;
const MAX_BACKOFF = 30000;

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

const randomHeight = (): string => {
    return `${Math.floor(Math.random() * 100) + 100}px`;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) {
        return { user: null };
    }

    return data({ user });
}

const FloatingButton = ({
    onClick,
    uploading,
}: {
    onClick: () => void;
    uploading: boolean;
}) => (
    <Button
        className="fixed bottom-4 right-4 z-[10000]"
        onClick={onClick}
        disabled={uploading}
    >
        {uploading ? (
            <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
            </>
        ) : (
            <>
                <Paperclip className="w-4 h-4" />
                Upload file
            </>
        )}
    </Button>
);

export default function Index() {
    const [items, setItems] = React.useState<ItemWithMetadata[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [showCard, setShowCard] = React.useState(false);

    const { user } = useLoaderData<typeof loader>();

    const pasteRef = React.useRef<HTMLFormElement>(null);
    const formRef = React.useRef<HTMLFormElement>(null);

    const itemsFetcher = useFetcher<ItemWithMetadata[]>();
    const deleteFetcher = useFetcher<DeleteFetcherData>();

    // Get fresh data every 30 seconds.
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                itemsFetcher.load("/resources/items");
            }
        }, 5 * 1000);

        return () => clearInterval(interval);
    }, []);

    // When the fetcher comes back with new data,
    // update our `data` state.
    React.useEffect(() => {
        if (itemsFetcher.data) {
            setItems(itemsFetcher.data);
        }
    }, [itemsFetcher.data]);

    const { toast } = useToast();

    const pasteFetcher = useFetcher<ContentFetcherData>({
        key: PASTE_FETCHER_KEY,
    });
    const inputCardFetcher = useFetcher<ContentFetcherData>({
        key: INPUT_CARD_FETCHER_KEY,
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
            !inputCardFetcher.data?.success && inputCardFetcher.data?.content;
        if (customInputError) {
            toast({
                title: inputCardFetcher.data?.message,
                description: "Custom input failed. Please try again.",
                variant: "destructive",
            });
        }
    }, [inputCardFetcher.data, toast]);

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
                const newItem: ItemWithMetadata = {
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
                    status: "pending",
                    isRequestFromDevEnvironment:
                        process.env.NODE_ENV === "development" ? 1 : 0,
                    metadata: {
                        author: "",
                        description: "",
                        image: "",
                        lang: "",
                        logo: "",
                        publisher: "",
                        siteName: "",
                        title: "",
                        type: "",
                        url: "",
                    },
                    fileMetadata: {
                        sunchayAssetUrl: pasteFetcher.data.itemId,
                        originalURL: "",
                        image: "",
                    },
                    metadataId: "",
                    tags: {},
                    url: "",
                };
                setItems((prevItems) => [...prevItems, newItem]);
            }
        }
    }, [pasteFetcher.data, toast, user]);

    const handleFileUpload = React.useCallback(
        async (file: File) => {
            setUploading(true);
            try {
                // 1. Get presigned S3 upload URL
                const presignRes = await fetch(
                    `/api/presign-upload?fileName=${encodeURIComponent(
                        file.name
                    )}&fileType=${encodeURIComponent(file.type)}`
                );

                if (!presignRes.ok) {
                    throw new Error("Failed to get S3 upload URL");
                }

                const { signedUrl, publicUrl, id, originalFileName } =
                    await presignRes.json();

                // 2. Upload file directly to S3
                const uploadRes = await fetch(signedUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": file.type,
                    },
                    body: file,
                });

                if (!uploadRes.ok) {
                    throw new Error("S3 upload failed");
                }

                // 3. Submit the public URL to Remix backend
                const formData = new FormData();
                formData.set("pastedContent", publicUrl);
                formData.set("fileID", id);
                formData.set("intent", "paste");
                formData.set("originalFileName", originalFileName);
                pasteFetcher.submit(formData, {
                    method: "post",
                });

                return;
            } catch (error) {
                console.error("Paste upload failed:", error);
                toast({
                    title: "Upload failed",
                    description:
                        "There was a problem uploading the file. Please try again.",
                    variant: "destructive",
                });
                return;
            } finally {
                setUploading(false);
            }
        },
        [pasteFetcher, toast]
    );

    const handlePaste = React.useCallback(
        async (event: ClipboardEvent) => {
            const clipboardData = event.clipboardData;
            const activeElement = document.activeElement;

            if (!clipboardData) return;

            const files = clipboardData.files;
            const pastedText = clipboardData.getData("text");

            if (files.length > 0) {
                event.preventDefault();
                const file = files[0];

                handleFileUpload(file);
            }

            if (pastedText) {
                const isTextAreaFocused = activeElement?.tagName === "TEXTAREA";

                if (!isTextAreaFocused) {
                    const formData = new FormData();
                    formData.set("pastedContent", pastedText);
                    formData.set("intent", "paste");

                    pasteFetcher.submit(formData, {
                        method: "post",
                    });

                    event.preventDefault();
                }
            }
        },
        [pasteFetcher, toast, handleFileUpload]
    );

    React.useEffect(() => {
        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

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

    let savedItemsCards;
    if (items.length > 0) {
        savedItemsCards = itemsToShow.map((item) => (
            <Motion key={item.id}>
                <ContentCard
                    key={item.id}
                    data={item}
                    onDelete={handleDelete}
                />
            </Motion>
        ));
    }

    const openFileSelector = () => {
        const input = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        if (input) {
            input.click();
        }
    };

    if (!itemsFetcher.data && !items.length) {
        return (
            <div className="min-h-screen px-4 md:px-6 pb-6 pt-2 md:pt-6">
                <MasonryGrid>
                    {Array.from({ length: 25 }).map((_, index) => (
                        <Skeleton
                            key={index}
                            className={`w-full break-inside-avoid mb-2 md:mb-3 lg:mb-4`}
                            style={{ height: randomHeight() }}
                        />
                    ))}
                </MasonryGrid>
            </div>
        );
    }

    return (
        <Dropzone onFileDropped={handleFileUpload}>
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
                <FloatingButton
                    onClick={openFileSelector}
                    uploading={uploading}
                />
                <pasteFetcher.Form ref={pasteRef}>
                    <input type="hidden" name="pastedContent" />
                    <input type="hidden" name="fileID" />
                    <input type="hidden" name="originalFileName" />
                    <input type="hidden" name="intent" value="paste" />
                </pasteFetcher.Form>
            </div>
        </Dropzone>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();
    console.error("Route error:", error);
    if (error instanceof Error) {
        return (
            <div
                className="error-boundary-route h-screen flex flex-col items-center justify-center"
                style={{ padding: "2rem", textAlign: "center" }}
            >
                <h2>
                    Hmm... Something unexpected happened. Was your internet
                    connection lost?
                </h2>
                <Button
                    onClick={() => window.location.reload()}
                    style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}
                >
                    Reload Page
                </Button>
            </div>
        );
    }
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
            const pastedContent = formData.get("pastedContent");
            const fileID = formData.get("fileID");
            const originalFileName = formData.get("originalFileName");
            if (pastedContent) {
                return saveItem(
                    pastedContent.toString(),
                    user,
                    fileID?.toString(),
                    originalFileName?.toString()
                );
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
