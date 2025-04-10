import { data, LoaderFunctionArgs } from "@vercel/remix";
import { desc, eq } from "drizzle-orm";
import { db } from "~/db/db.server";
import { item as itemTable } from "~/db/schema/item";
import { requireUserSession } from "~/session";

// routes/resources.items.ts
export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) return [];

    const savedItems = await db
        .select()
        .from(itemTable)
        .where(eq(itemTable.userId, user.id))
        .orderBy(desc(itemTable.updatedAt));

    return savedItems;
}
