// frontend/app/routes/dashboard.tsx
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserSession } from "~/session";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    return { user };
}

export default function Dashboard() {
    const { user } = useLoaderData<typeof loader>();

    return <div>Dashboard {user?.email}</div>;
}
