import { useFetcher, useLoaderData } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@vercel/remix";
import { eq } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { db } from "~/db/db.server";
import { item } from "~/db/schema/item";
import { requireUserSession } from "~/session";
import { isURLRelative, prepareUrl } from "~/util/util.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) {
        return { items: [], user: null };
    }

    return { user };
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const action = formData.get("_action");
    if (action === "update-favicons") {
        const allItemsAcrossUsers = await db.select().from(item);
        for (const tableItem of allItemsAcrossUsers) {
            if (
                tableItem.faviconUrl &&
                tableItem.url &&
                isURLRelative(tableItem.faviconUrl)
            ) {
                const faviconUrl = await prepareUrl(
                    tableItem.faviconUrl,
                    tableItem.url
                );
                console.log("faviconUrl", faviconUrl);
                await db
                    .update(item)
                    .set({ faviconUrl })
                    .where(eq(item.id, tableItem.id));
            }
        }
    } else if (action === "update-thumbnail-urls") {
        const allItemsAcrossUsers = await db.select().from(item);
        for (const tableItem of allItemsAcrossUsers) {
            if (
                tableItem.thumbnailUrl &&
                tableItem.url &&
                isURLRelative(tableItem.thumbnailUrl)
            ) {
                const thumbnailUrl = await prepareUrl(
                    tableItem.thumbnailUrl,
                    tableItem.url
                );
                await db
                    .update(item)
                    .set({ thumbnailUrl })
                    .where(eq(item.id, tableItem.id));
            }
        }
    }

    return { success: true, status: 200 };
}

export default function OneOff() {
    const { user } = useLoaderData<typeof loader>();

    const faviconFetcher = useFetcher({ key: "update-favicons" });
    const thumbnailFetcher = useFetcher({ key: "update-thumbnail-urls" });

    if (!user) {
        return <div>You must be logged in to do this.</div>;
    }

    return (
        <div className="flex flex-col h-screen justify-center items-center gap-6">
            <div>
                <faviconFetcher.Form method="post">
                    <Button
                        type="submit"
                        name="_action"
                        value="update-favicons"
                    >
                        Update favicons
                    </Button>
                </faviconFetcher.Form>
            </div>
            <div>
                <thumbnailFetcher.Form method="post">
                    <Button
                        type="submit"
                        name="_action"
                        value="update-thumbnail-urls"
                    >
                        Update thumbnail URLs
                    </Button>
                </thumbnailFetcher.Form>
            </div>
        </div>
    );
}
