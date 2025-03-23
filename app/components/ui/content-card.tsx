import { Link } from "@remix-run/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import * as React from "react";
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

type ContentCardProps = {
    data: typeof itemTable.$inferSelect;
    onDelete: (id: string) => void;
};

export const ContentCard = ({
    data: { title, content, type, url, thumbnailUrl, faviconUrl, id },
    onDelete,
}: ContentCardProps) => {
    const [, setIsLoaded] = React.useState(!thumbnailUrl);

    let copyMenuItem;
    if (type === "url" && url && url.length > 0) {
        copyMenuItem = (
            <ContextMenuItem onClick={() => copyToClipboard(url.trim() || "")}>
                Copy URL
            </ContextMenuItem>
        );
    } else if (type === "text" && content && content.length > 0) {
        copyMenuItem = (
            <ContextMenuItem onClick={() => copyToClipboard(content || "")}>
                Copy Text
            </ContextMenuItem>
        );
    }

    let cardVariant;
    if (type === "file") {
        cardVariant = (
            <Card>
                <CardContent>
                    <img
                        src={thumbnailUrl || FALLBACK_THUMBNAIL}
                        alt={title || ""}
                        className="w-full h-auto object-cover"
                        onLoad={() => setIsLoaded(true)}
                    />
                </CardContent>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            </Card>
        );
    } else {
        let cardContent;
        if (type === "text") {
            cardContent = (
                <CardContent className="pt-6 overflow-hidden overflow-ellipsis text-wrap line-clamp-5 relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:bg-gradient-to-t after:from-card after:via-card/80 after:to-transparent">
                    {content}
                </CardContent>
            );
        } else if (type === "url" && url && url.length > 0) {
            let thumbnailImage;
            if (thumbnailUrl) {
                thumbnailImage = (
                    <img
                        src={thumbnailUrl}
                        alt={title || ""}
                        className="w-full h-auto object-cover rounded-sm"
                    />
                );
            }

            cardContent = (
                <CardContent className="p-0">
                    {thumbnailImage}
                    <Link
                        to={url || ""}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-1 right-1 p-2 flex gap-2 items-center shadow-top-left bg-white dark:bg-black invisible group-hover:visible rounded-sm"
                    >
                        {getDomainFromUrl(url)}
                        <ArrowUpRight />
                    </Link>
                </CardContent>
            );
        }

        let copyContentMenuItem;
        if (type === "url" && url && url.length > 0) {
            copyContentMenuItem = (
                <DropdownMenuItem
                    onClick={() => copyToClipboard(url.trim() || "")}
                >
                    Copy URL
                </DropdownMenuItem>
            );
        } else if (type === "text" && content && content.length > 0) {
            copyContentMenuItem = (
                <DropdownMenuItem
                    onClick={() => copyToClipboard(content || "")}
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
                            {faviconUrl || title ? (
                                <CardHeader className="p-4">
                                    {faviconUrl && (
                                        <img
                                            src={faviconUrl || ""}
                                            alt={title || ""}
                                            className="w-6 h-6 mb-8 grayscale group-hover:grayscale-0"
                                        />
                                    )}
                                    {title && (
                                        <CardTitle className="font-serif font-normal text-xl">
                                            {title}
                                        </CardTitle>
                                    )}
                                </CardHeader>
                            ) : null}
                            {cardContent}
                        </Card>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>{content}</DialogDescription>
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
                            onClick={() => onDelete(id)}
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
        <ContextMenu key={id}>
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
                    onClick={() => onDelete(id)}
                    className="text-red-500"
                >
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
