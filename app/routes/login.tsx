// frontend/app/routes/login.tsx

import { Form } from "@remix-run/react";
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    redirect,
} from "@vercel/remix";
import React from "react";
import { authenticator } from "~/auth/oauth2";
import { Button } from "~/components/ui/button";
import GithubLogoIcon from "~/lib/logos/github";
import GoogleLogoIcon from "~/lib/logos/google";
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

const sunchayInDifferentLanguages = [
    "Sunchay",
    "蓄積",
    "संचय",
    "સંચય",
    "积累",
    "Acumulação",
];

export default function Login() {
    const [sunchay, setSunchay] = React.useState(
        sunchayInDifferentLanguages[0]
    );

    React.useEffect(() => {
        let index = 0;

        setSunchay(sunchayInDifferentLanguages[index]);
        index++;

        const interval = setInterval(() => {
            if (index < sunchayInDifferentLanguages.length) {
                setSunchay(sunchayInDifferentLanguages[index]);
                index++;
            } else {
                setSunchay(sunchayInDifferentLanguages[0]);
                index = 0;
                clearInterval(interval);
            }
        }, 400);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex h-screen justify-center items-center w-full flex-col md:flex-row">
            <div className="hidden md:block flex-1 md:flex-[2] items-center h-screen content-center w-full p-5">
                <div className="bg-green-50 dark:bg-green-900 content-center rounded-[3rem] h-full">
                    <div className="mx-20">
                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-6 font-serif">
                            {sunchay}
                        </h1>
                        <h2 className="hidden md:block text-xl mb-6 font-serif">
                            Capture anything effortlessly. Watch your scattered
                            ideas blossom into clear, connected brilliance.
                        </h2>
                        <h2 className="hidden md:block text-xl mb-6 font-serif">
                            Because true creativity sparks when ideas collide,
                            not when they're hidden away.
                        </h2>
                    </div>
                </div>
            </div>
            <div className="md:flex-1 justify-center h-full">
                <div className="px-6 sm:px-10 md:px-14 lg:pr-36 flex-col flex gap-4 max-w-full overflow-hidden h-full justify-center">
                    <h1 className="block md:hidden text-6xl mb-6 font-bold font-serif">
                        {sunchay}
                    </h1>
                    <div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-1 md:md-3 font-bold font-serif">
                            Are you ready to tame your mind?
                        </h3>
                        <h4 className="text-md mb-6 font-sans">
                            You can register or login for Sunchay with a simple
                            click.
                        </h4>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Form method="post">
                            <Button
                                type="submit"
                                name="provider"
                                value="google"
                                className="w-full "
                            >
                                <GoogleLogoIcon />
                                Continue with Google
                            </Button>
                        </Form>
                        <Form method="post">
                            <Button
                                type="submit"
                                name="provider"
                                value="github"
                                className="w-full "
                            >
                                <GithubLogoIcon />
                                Continue with Github
                            </Button>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    );
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
