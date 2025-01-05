import { Link } from "@remix-run/react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "~/components/ui/context-menu";
import { item as itemTable } from "~/db/schema/item";

const FALLBACK_THUMBNAIL = "/opengraph-fallback.jpg";

function CardVariant({
    content,
    setIsLoaded,
}: {
    content: typeof itemTable.$inferSelect;
    setIsLoaded: (isLoaded: boolean) => void;
}) {
    switch (content.type) {
        case "file":
            return (
                <Card>
                    <CardContent>
                        <img
                            src={content.thumbnailUrl || FALLBACK_THUMBNAIL}
                            alt={content.title || ""}
                            className="w-full h-auto object-cover"
                            onLoad={() => setIsLoaded(true)}
                        />
                    </CardContent>
                    <CardHeader>
                        <CardTitle>{content.title}</CardTitle>
                    </CardHeader>
                </Card>
            );
        case "text":
            return (
                <Card>
                    {content.title && (
                        <CardHeader className="pb-0">
                            <CardTitle>{content.title}</CardTitle>
                        </CardHeader>
                    )}
                    <CardContent className="pt-6">
                        <p>{content.content}</p>
                    </CardContent>
                </Card>
            );
        case "url":
            return (
                <Link to={content.url || ""} target="_blank" rel="noreferrer">
                    <Card className="group hover:border-ring transition-[border] duration-300">
                        <CardHeader className="p-4">
                            {content.faviconUrl && (
                                <img
                                    src={content.faviconUrl || ""}
                                    alt={content.title || ""}
                                    className="w-6 h-6 mb-8 grayscale group-hover:grayscale-0"
                                />
                            )}
                            <CardTitle className="font-serif font-normal text-xl">
                                {content.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <img
                                src={content.thumbnailUrl || FALLBACK_THUMBNAIL}
                                alt={content.title || ""}
                                className="w-full h-auto object-cover"
                                onLoad={() => setIsLoaded(true)}
                            />
                        </CardContent>
                    </Card>
                </Link>
            );
        default:
            return null;
    }
}

export const ContentCard = ({
    content,
    onDelete,
}: {
    content: typeof itemTable.$inferSelect;
    onDelete: (id: string) => void;
}) => {
    const [, setIsLoaded] = React.useState(!content.thumbnailUrl);

    let copyMenuItem;
    if (content.type === "url" && content.url && content.url.length > 0) {
        copyMenuItem = (
            <ContextMenuItem
                onClick={() => navigator.clipboard.writeText(content.url || "")}
            >
                Copy URL
            </ContextMenuItem>
        );
    } else if (
        content.type === "text" &&
        content.content &&
        content.content.length > 0
    ) {
        copyMenuItem = (
            <ContextMenuItem
                onClick={() =>
                    navigator.clipboard.writeText(content.content || "")
                }
            >
                Copy Text
            </ContextMenuItem>
        );
    }

    return (
        <ContextMenu key={content.id}>
            <ContextMenuTrigger>
                <div className={`break-inside-avoid mb-6`}>
                    <CardVariant content={content} setIsLoaded={setIsLoaded} />
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Edit</ContextMenuItem>
                {copyMenuItem}
                <ContextMenuSeparator />
                <ContextMenuItem
                    onClick={() => onDelete(content.id)}
                    className="text-red-500"
                >
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
