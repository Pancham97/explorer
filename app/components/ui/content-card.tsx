import { Link } from "@remix-run/react";
import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { item as itemTable } from "~/db/schema/item";

const DEFAULT_THUMBNAIL = "https://placehold.it/300x300";

export const ContentCard = ({
    content,
}: {
    content: typeof itemTable.$inferSelect;
}) => {
    const [isLoaded, setIsLoaded] = React.useState(!content.thumbnailUrl);

    const contentCard = () => {
        switch (content.type) {
            case "file":
                return (
                    <Card>
                        <CardContent>
                            <img
                                src={content.thumbnailUrl || DEFAULT_THUMBNAIL}
                                alt={content.title}
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
                        <CardHeader>
                            <CardTitle>{content.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">{content.content}</p>
                        </CardContent>
                    </Card>
                );
            case "url":
                return (
                    <Link to={content.url || ""} target="_blank">
                        <Card>
                            <CardContent className="p-0">
                                <img
                                    src={
                                        content.thumbnailUrl ||
                                        DEFAULT_THUMBNAIL
                                    }
                                    alt={content.title}
                                    className="w-full h-auto object-cover"
                                    onLoad={() => setIsLoaded(true)}
                                />
                            </CardContent>
                            <CardHeader>
                                <CardTitle>{content.title}</CardTitle>
                                <CardDescription>
                                    {content.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                );
            default:
                return null;
        }
    };

    return (
        <div className="break-inside-avoid mb-4">
            <div>
                {/* {content.badge && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
                        {content.badge}
                    </div>
                )} */}
                {contentCard()}
                {/* {content.footer && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                        {content.footer}
                    </div>
                )} */}
            </div>
        </div>
    );
};
