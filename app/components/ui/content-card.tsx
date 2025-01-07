import { Link } from "@remix-run/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { item as itemTable } from "~/db/schema/item";
import { copyToClipboard, getDomainFromUrl } from "~/lib/utils";

const FALLBACK_THUMBNAIL = "/opengraph-fallback.jpg";

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
            <ContextMenuItem onClick={() => copyToClipboard(content.url || "")}>
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
                onClick={() => copyToClipboard(content.content || "")}
            >
                Copy Text
            </ContextMenuItem>
        );
    }

    let cardVariant;
    if (content.type === "file") {
        cardVariant = (
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
    } else {
        let cardContent;
        if (content.type === "text") {
            cardContent = (
                <CardContent className="pt-6">
                    <p>{content.content}</p>
                </CardContent>
            );
        } else if (content.type === "url") {
            cardContent = (
                <CardContent className="p-0">
                    <img
                        src={content.thumbnailUrl || FALLBACK_THUMBNAIL}
                        alt={content.title || ""}
                        className="w-full h-auto object-cover"
                        onLoad={() => setIsLoaded(true)}
                    />
                    <Link
                        to={content.url || ""}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-0 right-0 p-2 flex gap-2 items-center shadow-top-left bg-white dark:bg-black invisible group-hover:visible rounded-sm"
                    >
                        {getDomainFromUrl(content.url || "")}
                        <ArrowUpRight />
                    </Link>
                </CardContent>
            );
        }

        let copyContentMenuItem;
        if (content.type === "url" && content.url && content.url.length > 0) {
            copyContentMenuItem = (
                <DropdownMenuItem
                    onClick={() => copyToClipboard(content.url || "")}
                >
                    Copy URL
                </DropdownMenuItem>
            );
        } else if (
            content.type === "text" &&
            content.content &&
            content.content.length > 0
        ) {
            copyContentMenuItem = (
                <DropdownMenuItem
                    onClick={() => copyToClipboard(content.content || "")}
                >
                    Copy Text
                </DropdownMenuItem>
            );
        }

        cardVariant = (
            <div className="relative card-container group">
                <Dialog>
                    <DialogTrigger asChild className="cursor-pointer">
                        <Card className="hover:border-ring transition-[border] duration-300 relative w-full">
                            {content.faviconUrl || content.title ? (
                                <CardHeader className="p-4">
                                    {content.faviconUrl && (
                                        <img
                                            src={content.faviconUrl || ""}
                                            alt={content.title || ""}
                                            className="w-6 h-6 mb-8 grayscale group-hover:grayscale-0"
                                        />
                                    )}
                                    {content.title && (
                                        <CardTitle className="font-serif font-normal text-xl">
                                            {content.title}
                                        </CardTitle>
                                    )}
                                </CardHeader>
                            ) : null}

                            {cardContent}
                        </Card>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{content.title}</DialogTitle>
                            <DialogDescription>
                                {content.content}
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        className="absolute top-0 right-0 p-2 hover:shadow-sm invisible group-hover:visible data-[state=open]:visible"
                        aria-label="Card options"
                    >
                        <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        {copyContentMenuItem}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(content.id)}
                            className="text-red-500"
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }

    return (
        <ContextMenu key={content.id}>
            <ContextMenuTrigger>
                <div className={`break-inside-avoid mb-4 md:mb-6`}>
                    {cardVariant}
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
