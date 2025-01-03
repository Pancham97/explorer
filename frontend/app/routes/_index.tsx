import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    type MetaFunction,
} from "@remix-run/node";
import { data, useFetcher, useLoaderData } from "@remix-run/react";
import { desc, eq } from "drizzle-orm";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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

export const meta: MetaFunction = () => {
    return [
        { title: "Explorer" },
        { name: "description", content: "Welcome to Explorer!" },
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
        console.log("deleting item", itemId);
        fetcher.submit(
            {
                intent: "delete",
                itemId,
            },
            {
                method: "post",
            }
        );
    };

    let list = (
        <EnhancedInputCard
            formRef={formRef}
            formError=""
            name="content"
            intent="custom-input"
        />
    );

    const itemsToShow = items.filter(
        (item) => fetcher.formData?.get("itemId") !== item.id
    );

    if (itemsToShow.length > 0) {
        list = (
            <MasonryGrid
                columnsByBreakpoint={{
                    default: 4,
                    lg: 3,
                    md: 2,
                    sm: 1,
                }}
            >
                <EnhancedInputCard
                    formRef={formRef}
                    formError=""
                    name="content"
                    intent="custom-input"
                />
                {items.map((item) => (
                    <ContextMenu>
                        <ContextMenuTrigger>
                            <ContentCard key={item.id} content={item} />
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
    }

    return (
        <div className="flex items-center justify-center flex-col">
            <h1 className="text-2xl font-bold">Hello, {user?.firstName}</h1>
            <h2 className="text-lg font-bold">
                You are logged in via{" "}
                {user?.loginProvider === "google"
                    ? "Google"
                    : user?.loginProvider === "github"
                    ? "GitHub"
                    : "Unknown"}
            </h2>
            <div onPaste={handlePaste}>
                <fetcher.Form ref={pasteRef}>
                    <input type="hidden" name="pastedContent" />
                    <input type="hidden" name="intent" value="paste" />
                </fetcher.Form>
                <div className="min-h-screen py-8 p-8">{list}</div>
            </div>
        </div>
    );
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");

    if (!user) {
        return { error: "User not found" };
    }
    const formData = await request.formData();
    const intent = formData.get("intent");

    console.log("intent", intent);
    switch (intent) {
        case "paste":
            switch (request.headers.get("Content-Type")) {
                case "multipart/form-data":
                    const file = formData.get("pastedContent") as File;
                    // storeItem(file, user);
                    console.log("file", file.name, file.type, file.size);
                    break;

                default:
                    const content = formData.get("pastedContent");

                    if (content) {
                        storeItem(
                            {
                                content: content.toString(),
                            },
                            user
                        );
                    }
                    break;
            }

        case "custom-input":
            console.log("calling custom input save");
            const title = formData.get("title");
            const content = formData.get("content");

            if (title || content) {
                storeItem(
                    {
                        title: title?.toString(),
                        content: content?.toString(),
                    },
                    user
                );
            }
            break;

        case "delete":
            const itemId = formData.get("itemId");
            if (itemId) {
                await deleteItem(itemId.toString(), user);
            }
            break;
    }

    return { success: true };
}
