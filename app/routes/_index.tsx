import { data, useFetcher, useLoaderData } from "@remix-run/react";
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@vercel/remix";
import React from "react";
import { ContentCard } from "~/components/ui/content-card";
import { InProgressCard } from "~/components/ui/in-progress-card";
import { InputCard } from "~/components/ui/input-card";
import { MasonryGrid } from "~/components/ui/masonry-grid";
import { Motion } from "~/components/ui/motion";
import { useToast } from "~/hooks/use-toast";
import type { loader as itemsLoader } from "~/routes/resources.items";
import { requireUserSession } from "~/session";
import { deleteItem, saveItem } from "~/util/util.server";

type BaseFetcherData = {
    success: boolean;
    message: string;
};

type ContentFetcherData = BaseFetcherData & {
    content: string;
};

type DeleteFetcherData = BaseFetcherData & {
    itemId: string;
};

type Item = Awaited<ReturnType<typeof itemsLoader>>[number];

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
    const deleteFetcher = useFetcher<DeleteFetcherData>({
        key: "delete-fetcher",
    });

    React.useEffect(() => {
        const deleteError =
            deleteFetcher.data?.success === false && deleteFetcher.data?.itemId;
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
            customInputFetcher.data?.success === false &&
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
            pasteFetcher.data?.success === false && pasteFetcher.data?.content;
        if (pasteError) {
            toast({
                title: pasteFetcher.data?.message,
                description:
                    "We have pasted your content to the input card. Please edit it as needed and try again.",
                variant: "destructive",
            });
        }
    }, [pasteFetcher.data, toast]);

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

    let savedItemsCards;
    if (items.length > 0) {
        savedItemsCards = items
            .filter((item) => deleteFetcher.formData?.get("itemId") !== item.id)
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

    return (
        <div
            className="min-h-screen px-4 md:px-6 pb-6 pt-2 md:pt-6"
            onPaste={handlePaste}
        >
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
            if (request.headers.get("Content-Type") === "multipart/form-data") {
                const file = formData.get("pastedContent") as File;

                return {
                    success: false,
                    message: "File could not be saved",
                };
            }

            const pastedContent = formData.get("pastedContent");
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
