import type {
    ActionFunctionArgs,
    LinksFunction,
    LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useRouteLoaderData,
} from "@remix-run/react";
import clsx from "clsx";
import {
    PreventFlashOnWrongTheme,
    Theme,
    ThemeProvider,
    useTheme,
} from "remix-themes";
import { logout } from "~/auth/oauth2";
import Nav from "~/components/nav";
import { sessionStorage, themeSessionResolver, User } from "~/session";
import styles from "./tailwind.css?url";
import { Toaster } from "~/components/ui/toaster";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: styles },
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

    const { getTheme } = await themeSessionResolver(request);

    const user = session.get("user");
    return { user, theme: getTheme() };
}

export async function action({ request }: ActionFunctionArgs) {
    return await logout(request);
}

export function InnerLayout({
    children,
    ssrTheme,
    user,
}: {
    children: React.ReactNode;
    ssrTheme: boolean;
    user: Maybe<User>;
}) {
    const [theme] = useTheme();

    return (
        <html lang="en" className={clsx(theme)} data-theme={theme}>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />

                <PreventFlashOnWrongTheme ssrTheme={ssrTheme} />
                <Links />
            </head>
            <body>
                <Nav user={user} />
                {children}
                <Toaster />
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export function Layout({ children }: { children: React.ReactNode }) {
    const data = useRouteLoaderData<typeof loader>("root");

    return (
        <ThemeProvider
            specifiedTheme={data?.theme as Theme}
            themeAction="/action/set-theme"
        >
            <InnerLayout ssrTheme={Boolean(data?.theme)} user={data?.user}>
                {children}
            </InnerLayout>
        </ThemeProvider>
    );
}

export default function App() {
    return <Outlet />;
}
