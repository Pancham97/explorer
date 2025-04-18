import { Link } from "@remix-run/react";
import { ArrowUpRight, ChevronDown, Play } from "lucide-react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
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
import { Label } from "~/components/ui/label";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Tooltip, TooltipContent } from "~/components/ui/tooltip";
import { TooltipTrigger } from "~/components/ui/tooltip";
import { ItemWithMetadata, Metadata } from "~/lib/types";
import { copyToClipboard, getDomainFromUrl } from "~/lib/utils";

const FALLBACK_THUMBNAIL = "/opengraph-fallback.jpg";

type ContentCardProps = {
    data: ItemWithMetadata;
    onDelete: (id: string) => void;
};

const shouldShowHeader = (metadata: Metadata) => {
    if (!metadata || typeof metadata !== "object") {
        return true;
    }

    if (!metadata.type) {
        return true;
    }

    if (
        (metadata.type as string).includes("profile") ||
        (metadata.type as string).includes("video") ||
        (metadata.type as string).includes("audio") ||
        (metadata.type as string).includes("document") ||
        (metadata.type as string).includes("pinterestapp") ||
        (metadata.type as string).includes("product")
    ) {
        return false;
    }
    return true;
};

type Tag = {
    colors?: string[];
    colorCodes?: string[];
    keywords?: string[];
    text?: string[];
    primaryColorHexCode?: string;
    imageDescription?: string;
};

const FileCard = ({ data, onDelete }: ContentCardProps) => {
    const { metadata, id, title, tags, url, fileMetadata } = data;
    const [, setIsLoaded] = React.useState(!metadata?.image);
    const [copiedColor, setCopiedColor] = React.useState<string | null>(null);

    const { colors, colorCodes, keywords, text, imageDescription } =
        tags as Tag;

    const cardContent = (
        <CardContent className="p-0 relative">
            <img
                src={fileMetadata?.image ?? FALLBACK_THUMBNAIL}
                alt={title || ""}
                className="w-full h-auto object-cover"
                onLoad={() => setIsLoaded(true)}
                loading="lazy"
            />
            <Link
                to={fileMetadata?.sunchayAssetUrl ?? ""}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-1 right-1 p-2 flex gap-2 items-center shadow-top-left bg-white dark:bg-black invisible group-hover:visible rounded-sm"
            >
                {getDomainFromUrl(fileMetadata?.sunchayAssetUrl ?? "")}
                <ArrowUpRight />
            </Link>
        </CardContent>
    );

    const cardLabel = title;

    let colorSwatchesContent;
    if (colorCodes) {
        colorSwatchesContent = colorCodes?.map((color) => (
            <TooltipProvider key={color}>
                <Tooltip
                    delayDuration={100}
                    // defaultOpen={copiedColor === color}
                    disableHoverableContent
                >
                    <TooltipTrigger
                        className="w-6 h-6 mx-[-0.25rem] z-50 transition-all duration-200 ease-in-out group-hover:mx-1 rounded-full hover:scale-150 cursor-pointer border-[0.5px]"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                            // Prevent Dialog trigger if needed, though usually TooltipTrigger stops propagation
                            e.stopPropagation();
                            copyToClipboard(color);
                            // Set the *specific* copied color
                            setCopiedColor(color);
                            // Reset after a delay
                            setTimeout(() => {
                                setCopiedColor(null);
                            }, 1000); // 1 second delay
                        }}
                    />

                    <TooltipContent>
                        {copiedColor === color ? "Copied!" : color}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ));
    }

    let imageDescriptionContent;
    if (imageDescription) {
        imageDescriptionContent = (
            <div className="flex flex-col gap-2 my-6">
                <p className="text-lg font-bold text-left">Image Description</p>
                <div className="flex flex-wrap gap-2">
                    <p key={imageDescription}>{imageDescription}</p>
                </div>
            </div>
        );
    }

    let textInference;
    if (text && text?.length) {
        textInference = (
            <div className="flex flex-col gap-2 my-6">
                <p className="text-lg font-bold text-left">Text</p>
                <div className="flex flex-wrap gap-2">
                    {text?.map((text) => (
                        <Badge variant="secondary" key={text}>
                            {text}
                        </Badge>
                    ))}
                </div>
            </div>
        );
    }

    let keywordsContent;
    if (keywords && keywords?.length) {
        keywordsContent = (
            <div className="flex flex-col gap-2">
                <p className="text-lg font-bold text-left">Keywords</p>
                <div className="flex flex-wrap gap-2">
                    {keywords?.map((keyword) => (
                        <Badge variant="secondary" key={keyword}>
                            {keyword}
                        </Badge>
                    ))}
                </div>
            </div>
        );
    }

    const dialogDescription = (
        <div className="flex flex-col gap-2 flex-grow">
            <div className="flex flex-col md:flex-row gap-2 h-full w-full">
                <div
                    className={"w-full h-full flex-[3]"}
                    style={{
                        backgroundColor: colorCodes?.[0],
                    }}
                >
                    <img
                        src={
                            fileMetadata?.sunchayAssetUrl ??
                            fileMetadata?.image ??
                            FALLBACK_THUMBNAIL
                        }
                        alt={title || ""}
                        className="object-contain h-[70vh] w-auto mx-auto"
                        onLoad={() => setIsLoaded(true)}
                        loading="lazy"
                    />
                    <div className="flex group transition-all m-4">
                        {colorSwatchesContent}
                    </div>
                </div>
                <div className="w-[0.5px] h-full bg-gray-300" />
                <div className="flex-[1] px-4">
                    {imageDescriptionContent}
                    {keywordsContent}
                    {textInference}
                </div>
            </div>
        </div>
    );

    return (
        <ContextMenu key={id}>
            <ContextMenuTrigger>
                <div className="break-inside-avoid mb-2 md:mb-3 lg:mb-4 flex flex-col gap-2 items-center justify-center">
                    <div className="relative card-container group overflow-hidden max-w-full w-full">
                        <Dialog>
                            <DialogTrigger asChild className="cursor-pointer">
                                <Card className="hover:border-ring transition-[border] duration-300 relative w-full">
                                    {cardContent}
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    {/* <DialogTitle>{title}</DialogTitle> */}
                                    <DialogDescription asChild>
                                        {dialogDescription}
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
                    {cardLabel && (
                        <Label className="text-ellipsis whitespace-nowrap overflow-hidden text-center w-[90%] justify-self-center mb-2">
                            {cardLabel}
                        </Label>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Edit</ContextMenuItem>
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

const URLCard = ({ data, onDelete }: ContentCardProps) => {
    const { metadata, id, title, url, fileMetadata } = data;

    if (!url) {
        return null;
    }

    let thumbnailImage;
    let playIcon;

    if (metadata?.image) {
        if ((metadata?.type as string)?.includes("video")) {
            playIcon = (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 rounded-full p-2 md:p-2 lg:p-4 text-white bg-gray-600/50 backdrop-blur-sm" />
                </div>
            );
        }

        thumbnailImage = (
            <>
                <img
                    src={metadata?.image}
                    alt={title || ""}
                    className="w-full h-auto object-contain rounded-sm"
                    loading="lazy"
                />
                {playIcon}
            </>
        );
    }

    const cardContent = (
        <CardContent
            className={`p-0 relative ${
                shouldShowHeader(metadata) ? "max-h-60" : "max-h-full"
            }`}
        >
            {thumbnailImage}
            <Link
                to={url || ""}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-1 right-1 p-2 flex gap-2 items-center shadow-top-left bg-white dark:bg-black invisible group-hover:visible rounded-sm max-w-[70%] justify-end"
            >
                <Label className="text-ellipsis whitespace-nowrap overflow-hidden cursor-pointer">
                    {getDomainFromUrl(url)}
                </Label>
                <ArrowUpRight />
            </Link>
        </CardContent>
    );

    let cardHeader;
    let cardLabel;
    if (shouldShowHeader(metadata)) {
        cardHeader = (
            <CardHeader className="p-4">
                {metadata?.logo && (
                    <div className="flex items-center justify-start ">
                        <img
                            loading="lazy"
                            src={metadata?.logo || ""}
                            alt={title || ""}
                            className="w-auto h-fit max-h-[24px] min-w-[24px] object-contain mb-8 grayscale group-hover:grayscale-0"
                        />
                    </div>
                )}
                {title && (
                    <CardTitle className="font-serif font-normal text-base md:text-lg lg:text-xl line-clamp-2">
                        {title}
                    </CardTitle>
                )}
            </CardHeader>
        );
    } else {
        cardLabel = title;
    }

    const copyContentMenuItem = (
        <DropdownMenuItem onClick={() => copyToClipboard(url.trim() || "")}>
            Copy URL
        </DropdownMenuItem>
    );

    const dialogTitle = title;
    const dialogContent = (
        <div className="flex flex-col gap-4">
            <div className="w-full h-full">
                <img
                    src={metadata?.image}
                    alt={title || ""}
                    className="object-contain rounded-sm"
                    loading="lazy"
                />
                {playIcon}
            </div>
        </div>
    );

    const copyMenuItem = (
        <ContextMenuItem onClick={() => copyToClipboard(url.trim() || "")}>
            Copy URL
        </ContextMenuItem>
    );

    return (
        <ContextMenu key={id}>
            <ContextMenuTrigger>
                <div className="break-inside-avoid mb-2 md:mb-3 lg:mb-4 flex flex-col gap-2 items-center justify-center">
                    <div className="relative card-container group overflow-hidden max-w-full w-full">
                        <Dialog>
                            <DialogTrigger asChild className="cursor-pointer">
                                <Card className="hover:border-ring transition-[border] duration-300 relative w-full">
                                    {cardHeader}
                                    {cardContent}
                                </Card>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{dialogTitle}</DialogTitle>
                                    {dialogContent}
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
                    {cardLabel && (
                        <Label className="text-ellipsis whitespace-nowrap overflow-hidden text-center w-[90%] justify-self-center mb-2">
                            {cardLabel}
                        </Label>
                    )}
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

const TextCard = ({ data, onDelete }: ContentCardProps) => {
    const { content, id, title } = data;

    const copyMenuItem = (
        <ContextMenuItem onClick={() => copyToClipboard(content || "")}>
            Copy Text
        </ContextMenuItem>
    );

    const cardContent = (
        <CardContent className="pt-6 overflow-hidden overflow-ellipsis text-wrap line-clamp-5 relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:bg-gradient-to-t after:from-card after:via-card/80 after:to-transparent">
            {content}
        </CardContent>
    );

    const copyContentMenuItem = (
        <DropdownMenuItem onClick={() => copyToClipboard(content || "")}>
            Copy Text
        </DropdownMenuItem>
    );

    const dialogContent = content;

    return (
        <ContextMenu key={id}>
            <ContextMenuTrigger>
                <div className="break-inside-avoid mb-2 md:mb-3 lg:mb-4 flex flex-col gap-2 items-center justify-center">
                    <div className="relative card-container group overflow-hidden max-w-full w-full">
                        <Dialog>
                            <DialogTrigger asChild className="cursor-pointer">
                                <Card className="hover:border-ring transition-[border] duration-300 relative w-full">
                                    {cardContent}
                                </Card>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>{dialogContent}</DialogHeader>
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

export const ContentCard = ({ data, onDelete }: ContentCardProps) => {
    if (
        data.type === "file" ||
        data.type === "image" ||
        data.type === "video" ||
        data.type === "document"
    ) {
        return <FileCard data={data} onDelete={onDelete} />;
    } else if (data.type === "url" && data.url && data.url.length > 0) {
        return <URLCard data={data} onDelete={onDelete} />;
    } else if (data.type === "text") {
        return <TextCard data={data} onDelete={onDelete} />;
    }
};
