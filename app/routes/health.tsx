import { useLoaderData } from "@remix-run/react";

export async function loader() {
    const response = await fetch("http://localhost:8080/health", {
        method: "GET",
    });
    return { health: response.statusText };
}

export default function Health() {
    const { health } = useLoaderData<typeof loader>();
    return <div>My health is {health}!</div>;
}
