import { data, LoaderFunctionArgs } from "@vercel/remix";
import { desc, eq } from "drizzle-orm";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { metadata as metadataTable } from "~/db/schema/metadata";
import { Metadata } from "~/lib/types";
import { requireUserSession } from "~/session";

// routes/resources.items.ts
export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) return [];

    const itemsWithMetadata = await db
        .select({
            item: itemTable,
            metadata: metadataTable,
        })
        .from(itemTable)
        .leftJoin(metadataTable, eq(itemTable.metadataId, metadataTable.id))
        .where(eq(itemTable.userId, user.id))
        .orderBy(desc(itemTable.updatedAt));

    // Flatten + merge metadata into item
    const flattenedItems = itemsWithMetadata.map(({ item, metadata }) => ({
        ...item,
        description:
            (metadata?.metadata as Metadata)?.description || item.description,
        content: item.content,
        id: item.id,
        metadata: metadata?.metadata ?? {},
        fileMetadata: item.metadata ?? {},
        title: (metadata?.metadata as Metadata)?.title || item.content,
        type: item.type,
        url: item.url,
    }));

    return flattenedItems;
}
