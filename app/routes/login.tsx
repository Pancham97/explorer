// frontend/app/routes/login.tsx

import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    redirect,
} from "@vercel/remix";
import { Form } from "@remix-run/react";
import { authenticator } from "~/auth/oauth2";
import { sessionStorage } from "~/session";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await sessionStorage.getSession(
        request.headers.get("cookie")
    );
    const user = session.get("user");
    if (user) {
        throw redirect("/");
    }
    return null;
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.clone().formData();
    const provider = formData.get("provider");
    if (!provider) {
        throw new Error("Provider is required");
    }

    switch (provider) {
        case "google":
            return await authenticator.authenticate("google", request);
        case "github":
            return await authenticator.authenticate("github", request);
        default:
            throw new Error("Invalid provider");
    }
}

export default function Login() {
    return (
        <div className="items-center flex h-screen justify-center flex-col">
            <h1 className="text-2xl font-bold">Login</h1>
            <Form method="post">
                <button type="submit" name="provider" value="google">
                    Login with Google
                </button>
            </Form>
            <Form method="post">
                <button type="submit" name="provider" value="github">
                    Login with Github
                </button>
            </Form>
        </div>
    );
}
