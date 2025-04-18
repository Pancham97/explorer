import { useFetcher } from "@remix-run/react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
    COMMAND_KEY_ICON,
    CTRL_KEY_ICON,
    ENTER_KEY_ICON,
    INPUT_CARD_FETCHER_KEY,
} from "~/lib/constants";
import { User } from "~/session";

function useGetCurrentOS() {
    const [isMac, setIsMac] = React.useState(false);
    const [isWin, setIsWin] = React.useState(false);
    const [isLinux, setIsLinux] = React.useState(false);

    React.useEffect(() => {
        const isMac = navigator.userAgent.includes("Mac");
        const isWin = navigator.userAgent.includes("Win");
        const isLinux = navigator.userAgent.includes("Linux");

        setIsMac(isMac);
        setIsWin(isWin);
        setIsLinux(isLinux);
    }, []);

    return { isMac, isWin, isLinux };
}

const messages = (addressee: string) => [
    `Nice find, ${addressee}!`,
    `Great thought, ${addressee}!`,
    `We've saved it, ${addressee}!`,
    `Breathe, ${addressee}! It's in.`,
];

const getShortcutKey = (isMac: boolean) => {
    if (isMac) {
        return `${COMMAND_KEY_ICON} + ${ENTER_KEY_ICON}`;
    }
    return `${CTRL_KEY_ICON} + ${ENTER_KEY_ICON}`;
};

type InputCardProps = {
    formError: string;
    formRef: React.RefObject<HTMLFormElement>;
    name: string;
    intent: string;
    user: Nullable<User>;
};

type InputFormProps = InputCardProps & {
    submitted: boolean;
    setSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
};

export const InputCard = ({
    formError,
    name = "content",
    formRef,
    intent,
    user,
}: InputCardProps) => {
    const [submitted, setSubmitted] = React.useState(false);
    const inputCardFetcher = useFetcher({ key: INPUT_CARD_FETCHER_KEY });
    const [message, setMessage] = React.useState("");

    React.useEffect(() => {
        setMessage(
            messages(user?.firstName || "there")[
                Math.floor(
                    Math.random() * messages(user?.firstName || "there").length
                )
            ]
        );
    }, [submitted]);

    return (
        <Card className="transition-all duration-200 ease-in-out hover:shadow-md break-inside-avoid mb-2 md:mb-3 lg:mb-4 relative">
            <CardContent className="p-0">
                <InputCardForm
                    formRef={formRef}
                    name={name}
                    intent={intent}
                    user={user}
                    formError={formError}
                    submitted={submitted}
                    setSubmitted={setSubmitted}
                />
                <div
                    className={`absolute bottom-0 left-0 w-full  pointer-events-none p-4 bg-black dark:bg-white ${
                        inputCardFetcher.state === "submitting" || submitted
                            ? "opacity-100 animate-fill-up"
                            : "opacity-0"
                    }`}
                >
                    <Label className="text-white dark:text-black">
                        {message}
                    </Label>
                </div>
            </CardContent>
        </Card>
    );
};

const InputCardForm = ({
    formRef,
    name,
    intent,
    user,
    formError,
    submitted,
    setSubmitted,
}: InputFormProps) => {
    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = React.useState("");

    const inputCardFetcher = useFetcher({ key: INPUT_CARD_FETCHER_KEY });

    const { isMac, isWin, isLinux } = useGetCurrentOS();

    const isSubmitting = inputCardFetcher.state === "submitting";

    React.useEffect(() => {
        if (isSubmitting) {
            formRef.current?.reset();
            inputRef.current?.focus();
        }
    }, [inputCardFetcher.state, formRef, inputRef]);

    React.useEffect(() => {
        if (inputCardFetcher.state === "idle" && submitted) {
            setValue("");
            setSubmitted(false);
        }
    }, [inputCardFetcher.state, submitted]);

    const handleInputCardKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (
            (isMac && e.metaKey && e.key === "Enter") ||
            ((isWin || isLinux) && e.ctrlKey && e.key === "Enter")
        ) {
            e.preventDefault();
            inputCardFetcher.submit(formRef.current);
            setSubmitted(true);
        }
    };

    const handleSubmit = () => {
        if (formRef.current) {
            inputCardFetcher.submit(formRef.current);
            setSubmitted(true);
        }
    };

    let addressee = "there";
    if (user?.firstName) {
        addressee = user.firstName;
    }
    let placeholder = `What's on your mind, ${addressee}?`;

    return (
        <inputCardFetcher.Form
            method="post"
            className="relative w-full min-h-[100px]"
            ref={formRef}
        >
            <textarea
                ref={inputRef}
                name={name}
                placeholder={placeholder}
                aria-label="Content input"
                aria-invalid={Boolean(formError)}
                aria-errormessage={formError ? "content-error" : undefined}
                className={`w-full p-4 bg-transparent border-none resize-none focus:outline-none min-h-[200px] h-auto placeholder:font-serif placeholder:text-base md:placeholder:text-lg lg:placeholder:text-xl transition-opacity ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={handleInputCardKeyDown}
            />

            {formError ? (
                <div id="content-error" className="text-red-500 text-sm p-2">
                    {formError}
                </div>
            ) : null}

            <input type="hidden" name="intent" value={intent} />

            <div
                className={`absolute bottom-0 left-0 right-0 overflow-hidden transition-opacity duration-300 ease-out ${
                    value.trim()
                        ? "opacity-100"
                        : "opacity-0 h-0 pointer-events-none"
                } ${submitted ? "animate-out" : ""}`}
            >
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`bottom-0 right-0 w-full rounded-none transition-all duration-300 ${
                        isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    {isSubmitting
                        ? "Saving..."
                        : `Save (${getShortcutKey(isMac)})`}
                </Button>
            </div>
        </inputCardFetcher.Form>
    );
};
