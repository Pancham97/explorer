//frontend/app/auth/oauth2.ts
import { redirect } from "@remix-run/react";
import { jwtDecode } from "jwt-decode";
import { Authenticator } from "remix-auth";
import { CodeChallengeMethod, OAuth2Strategy } from "remix-auth-oauth2";
import { db } from "~/db/db.server";
import { sessionStorage, User } from "~/session";
import { usersTable } from "~/db/schema/user";
import { ulid } from "ulid";
import { timestamp } from "drizzle-orm/singlestore-core";
import { and, eq } from "drizzle-orm";
import { providersTable } from "~/db/schema/provider";

const BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://explorer-five-liard.vercel.app"
        : "http://localhost:5173";

async function getUser(email: string, loginProvider: string) {
    return await db
        .select({
            user: usersTable,
            provider: providersTable,
        })
        .from(usersTable)
        .innerJoin(providersTable, eq(usersTable.id, providersTable.userId))
        .where(
            and(
                eq(usersTable.email, email),
                eq(providersTable.provider, loginProvider)
            )
        );
}

async function fetchUser(
    email: string,
    accessToken: string
): Promise<User | null> {
    const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

    if (users.length === 0) {
        return null;
    }

    const providers = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.userId, users[0].id));
    const provider = providers[0];

    return {
        ...users[0],
        userName: users[0].userName ?? undefined,
        loginProvider: provider.provider,
        accessToken,
    };
}

async function storeUserInDatabaseIfNotExists(user: User) {
    const existingUsers = await getUser(user.email, user.loginProvider);

    if (existingUsers.length > 0) {
        return existingUsers[0];
    }

    await db.insert(providersTable).values({
        id: ulid(),
        userId: user.id,
        provider: user.loginProvider,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return await db.insert(usersTable).values({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

export const googleStrategy = new OAuth2Strategy(
    {
        cookie: "oauth2", // Optional, can also be an object with more options

        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

        authorizationEndpoint: "https://accounts.google.com/o/oauth2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        redirectURI: `${BASE_URL}/auth/google/callback`,
        tokenRevocationEndpoint: "https://accounts.google.com/o/oauth2/revoke", // optional

        scopes: ["openid", "email", "profile"], // optional
        codeChallengeMethod: CodeChallengeMethod.S256, // optional
    },
    async ({ tokens, request }) => {
        // here you can use the params above to get the user and return it
        // what you do inside this and how you find the user is up to you
        // return await getUser(tokens, request);
        const encodedToken = tokens.idToken();
        const decodedToken = jwtDecode<{
            email: string;
            name: string;
            picture: string;
        }>(encodedToken);

        const existingUser = await fetchUser(decodedToken.email, "google");

        if (existingUser) {
            return {
                ...existingUser,
                accessToken: tokens.accessToken(),
            };
        }

        const user = {
            id: ulid(),
            accessToken: tokens.accessToken(),
            avatarUrl: decodedToken.picture,
            email: decodedToken.email,
            firstName: decodedToken.name.split(" ")[0],
            lastName: decodedToken.name.split(" ")[1],
            loginProvider: "google",
            userName: decodedToken.name,
        };

        await storeUserInDatabaseIfNotExists(user);

        return user;
    }
);

export const githubStrategy = new OAuth2Strategy(
    {
        cookie: "oauth2", // Optional, can also be an object with more options

        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,

        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        redirectURI: `${BASE_URL}/auth/github/callback`,

        tokenRevocationEndpoint: "https://github.com/logout", // optional

        scopes: ["user:email", "read:user"], // optional
        codeChallengeMethod: CodeChallengeMethod.S256, // optional
    },
    async ({ tokens, request }) => {
        const githubAccessToken = tokens.accessToken();
        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`,
            },
        });
        const responseJson = await response.json();

        const existingUser = await fetchUser(responseJson.email, "github");

        if (existingUser) {
            return {
                ...existingUser,
                accessToken: tokens.accessToken(),
            };
        }

        const user = {
            id: ulid(),
            email: responseJson.email,
            firstName: responseJson.name.split(" ")[0],
            lastName: responseJson.name.split(" ")[1],
            avatarUrl: responseJson.avatar_url,
            accessToken: tokens.accessToken(),
            loginProvider: "github",
            userName: responseJson.login,
        };

        await storeUserInDatabaseIfNotExists(user);

        return user;
    }
);

export const authenticator = new Authenticator<User>();

authenticator.use(googleStrategy, "google");
authenticator.use(githubStrategy, "github");

export async function logout(request: Request) {
    const session = await sessionStorage.getSession(
        request.headers.get("cookie")
    );
    const user = session.get("user");
    if (user) {
        const loginProvider = user.loginProvider;
        if (loginProvider === "google") {
            await googleStrategy
                .revokeToken(user.accessToken)
                .catch((error) => {
                    console.error(error);
                });
        } else if (loginProvider === "github") {
            await githubStrategy
                .revokeToken(user.accessToken)
                .catch((error) => {
                    console.error(error);
                });
        }
        await sessionStorage.destroySession(session);
        return redirect("/login", {
            headers: {
                "Set-Cookie": await sessionStorage.destroySession(session),
            },
        });
    }
}
