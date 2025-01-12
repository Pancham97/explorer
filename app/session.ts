// frontend/app/session.ts
import { createCookieSessionStorage, redirect } from "@vercel/remix"; // or cloudflare/deno
import { createThemeSessionResolver } from "remix-themes";

// You can default to 'development' if process.env.NODE_ENV is not set
const isProduction = process.env.NODE_ENV === "production";

export type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    avatarUrl: string | null;
    userName: Maybe<string>;
    accessToken: string;
    loginProvider: string;
};

type SessionData = {
    user: User;
};

type SessionFlashData = {
    error: string;
};

export const sessionStorage = createCookieSessionStorage<
    SessionData,
    SessionFlashData
>({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
        name: "__session",

        // all of these are optional
        // Expires can also be set (although maxAge overrides it when used in combination).
        // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
        //
        // expires: new Date(Date.now() + 60_000),
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
        secrets: ["cookie-secret-by-p@ncham"],
        secure: isProduction,
    },
});

export async function requireUserSession(request: Request) {
    // get the session
    const cookie = request.headers.get("cookie");
    const session = await sessionStorage.getSession(cookie);

    // validate the session, `userId` is just an example, use whatever value you
    // put in the session when the user authenticated
    if (!session.has("user")) {
        // if there is no user session, redirect to login
        throw redirect("/login");
    }

    return session;
}

export const themeSessionResolver = createThemeSessionResolver(
    createCookieSessionStorage({
        cookie: {
            name: "__theme",
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secrets: ["s3cr3t"],
            // Set domain and secure only if in production
            ...(isProduction ? { domain: "sunchay.com", secure: true } : {}),
        },
    })
);
