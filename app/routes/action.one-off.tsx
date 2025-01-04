import React from "react";
import { ActionFunctionArgs } from "@vercel/remix";
import { eq } from "drizzle-orm";
import { db } from "~/db/db.server";
import { item } from "~/db/schema/item";
import { isURLRelative, prepareFaviconUrl } from "~/util/util.server";
import { Button } from "~/components/ui/button";
import { useFetcher } from "@remix-run/react";

export async function action({ request }: ActionFunctionArgs) {
    const allItemsAcrossUsers = await db.select().from(item);
    for (const tableItem of allItemsAcrossUsers) {
        if (
            tableItem.faviconUrl &&
            tableItem.url &&
            isURLRelative(tableItem.faviconUrl)
        ) {
            const faviconUrl = await prepareFaviconUrl(
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
    return { success: true, status: 200 };
}

export default function OneOff() {
    const fetcher = useFetcher();
    return (
        <div>
            <Button onClick={() => fetcher.submit(null, { method: "post" })}>
                Update favicons
            </Button>
        </div>
    );
}
