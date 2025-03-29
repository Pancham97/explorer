// frontend/app/routes/auth.google.callback.tsx

import { LoaderFunctionArgs } from "@vercel/remix";
import { redirect } from "@remix-run/react";
import { authenticator } from "~/auth/oauth2";
import { sessionStorage } from "~/session";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const provider = params.provider;
    if (!provider) {
        throw new Error("Provider is required");
    }
    let user = await authenticator.authenticate(provider, request);

    const session = await sessionStorage.getSession(
        request.headers.get("cookie")
    );
    session.set("user", user);
    const cookie = await sessionStorage.commitSession(session);

    return redirect("/", {
        headers: { "Set-Cookie": cookie },
    });
}
