import type {
    ActionFunctionArgs,
    LinksFunction,
    LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
    Links,
    Meta,
    Outlet,
    redirect,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "@remix-run/react";

import { authenticator, googleStrategy, logout } from "~/auth/oauth2";
import Nav from "~/components/nav";
import "./tailwind.css";
import { sessionStorage } from "~/session";

export const links: LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await sessionStorage.getSession(
        request.headers.get("cookie")
    );
    const user = session.get("user");
    return { user };
}

export async function action({ request }: ActionFunctionArgs) {
    return await logout(request);
}

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    const { user } = useLoaderData<typeof loader>();
    return (
        <>
            <Nav user={user} />
            <Outlet />
        </>
    );
}
