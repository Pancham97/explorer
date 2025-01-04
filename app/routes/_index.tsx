import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@vercel/remix";
import {
    data,
    useActionData,
    useFetcher,
    useLoaderData,
} from "@remix-run/react";
import { desc, eq } from "drizzle-orm";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AnimatePresence } from "framer-motion";
import { ContentCard } from "~/components/ui/content-card";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { EnhancedInputCard } from "~/components/ui/input-card";
import { MasonryGrid } from "~/components/ui/masonry-grid";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { requireUserSession } from "~/session";
import { deleteItem, storeItem } from "~/util/util.server";
import { Motion } from "~/components/ui/motion";

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
    const { items, user } = useLoaderData<typeof loader>();

    const pasteRef = React.useRef<HTMLFormElement>(null);
    const formRef = React.useRef<HTMLFormElement>(null);

    const fetcher = useFetcher({ key: "paste-fetcher" });
    const deleteFetcher = useFetcher<{
        itemId: string;
        success: boolean;
        message: string;
    }>({
        key: "delete-fetcher",
    });

    console.log("fetcher.data", fetcher.data);

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
            fetcher.submit(formData, {
                method: "post",
                encType: "multipart/form-data",
            });
        } else {
            const pastedContent = clipboardData.getData("text");
            if (!pastedContent) return;

            const formData = new FormData(pasteRef.current!);
            formData.set("pastedContent", pastedContent);
            fetcher.submit(formData, {
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
        console.log(
            "deleteFetcher.data",
            deleteFetcher.data,
            deleteFetcher.state
        );
    };

    const itemsToShow = items.filter(
        (item) => deleteFetcher.formData?.get("itemId") !== item.id
    );

    const list = (
        <MasonryGrid>
            <EnhancedInputCard
                formRef={formRef}
                formError=""
                name="content"
                intent="custom-input"
            />
            {itemsToShow.map((item) => (
                <ContextMenu key={item.id}>
                    <ContextMenuTrigger>
                        <Motion key={item.id}>
                            <ContentCard key={item.id} content={item} />
                        </Motion>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem>Edit</ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500"
                        >
                            Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            ))}
        </MasonryGrid>
    );

    return (
        <div className="p-8 pt-6">
            <div onPaste={handlePaste}>
                <fetcher.Form ref={pasteRef}>
                    <input type="hidden" name="pastedContent" />
                    <input type="hidden" name="intent" value="paste" />
                </fetcher.Form>
                <div className="min-h-screen">{list}</div>
            </div>
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

    console.log("intent", intent);
    switch (intent) {
        case "paste":
            switch (request.headers.get("Content-Type")) {
                case "multipart/form-data":
                    const file = formData.get("pastedContent") as File;

                    console.log("file", file.name, file.type, file.size);
                    return {
                        success: false,
                        message: "File could not be saved",
                    };

                default:
                    const content = formData.get("pastedContent");

                    if (content) {
                        const result = await storeItem(
                            {
                                content: content.toString(),
                            },
                            user
                        );

                        console.log("result", result);
                        if (result) {
                            return {
                                success: result[0].affectedRows > 0,
                                message:
                                    result[0].affectedRows > 0
                                        ? "Item saved successfully!"
                                        : "Item could not be saved",
                                data: result,
                            };
                        }

                        return {
                            success: false,
                            message: "Item could not be saved",
                        };
                    }
                    return {
                        success: false,
                        message: "Item could not be saved",
                    };
            }

        case "custom-input":
            console.log("calling custom input save");
            const title = formData.get("title");
            const content = formData.get("content");

            if (title || content) {
                const result = await storeItem(
                    {
                        title: title?.toString(),
                        content: content?.toString(),
                    },
                    user
                );
                console.log("result", result);
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

                return {
                    success: false,
                    message: "Item could not be saved",
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

        case "delete":
            const itemId = formData.get("itemId");
            if (itemId) {
                const result = await deleteItem(itemId.toString(), user);
                console.log("delete result", result);
                return {
                    success: result[0].affectedRows > 0,
                    message:
                        result[0].affectedRows > 0
                            ? "Item deleted successfully!"
                            : "Item could not be deleted",
                    data: result,
                    itemId,
                };
            }
            return {
                success: false,
                message: "Item could not be deleted",
            };

        default:
            return {
                success: false,
                message: "Item could not be saved",
            };
    }
}
