import { useFetcher } from "@remix-run/react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

function useGetCurrentOS() {
    const [isMac, setIsMac] = React.useState(false);
    const [isWin, setIsWin] = React.useState(false);

    React.useEffect(() => {
        const isMac = navigator.userAgent.includes("Mac");
        const isWin = navigator.userAgent.includes("Win");

        setIsMac(isMac);
        setIsWin(isWin);
    }, []);

    return { isMac, isWin };
}

// command key icon
const commandKeyIcon = "⌘";
const enterKeyIcon = "↵";
const ctrlKeyIcon = "Ctrl";

export const EnhancedInputCard = ({
    formError,
    name = "content",
    formRef,
    intent,
}: {
    formError: string;
    formRef: React.RefObject<HTMLFormElement>;
    name: string;
    intent: string;
}) => {
    const fetcher = useFetcher<{
        success: boolean;
        message: string;
        content: string;
        title: string;
    }>({ key: "input-card" });
    const pasteFetcher = useFetcher<{
        success: boolean;
        message: string;
        content: string;
    }>({ key: "paste-fetcher" });
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [hasContent, setHasContent] = React.useState(false);
    const { isMac, isWin } = useGetCurrentOS();
    const isSubmitting = fetcher.state === "submitting";

    const getShortcutKey = () => {
        if (isMac) {
            return `${commandKeyIcon} + ${enterKeyIcon}`;
        }
        return `${ctrlKeyIcon} + ${enterKeyIcon}`;
    };

    React.useEffect(() => {
        if (fetcher.state === "submitting") {
            formRef.current?.reset();
            setHasContent(false);
            textAreaRef.current?.focus();
        }
    }, [fetcher.state, formRef, textAreaRef]);

    React.useEffect(() => {
        if (!pasteFetcher.data?.success && pasteFetcher.data?.content) {
            formRef.current?.reset();
            textAreaRef.current?.focus();
            if (textAreaRef.current) {
                textAreaRef.current.value = pasteFetcher.data?.content || "";
                setHasContent(true);
            }
        }
    }, [pasteFetcher.data, formRef, textAreaRef]);

    React.useEffect(() => {
        if (!fetcher.data?.success && fetcher.data?.content) {
            formRef.current?.reset();
            textAreaRef.current?.focus();
            if (textAreaRef.current) {
                textAreaRef.current.value = fetcher.data?.content || "";
                setHasContent(true);
            }
        }
    }, [fetcher.data, formRef, textAreaRef]);

    return (
        <Card className="transition-all duration-200 ease-in-out hover:shadow-md break-inside-avoid mb-4 md:mb-6">
            <CardContent className="p-0">
                <fetcher.Form
                    method="post"
                    className="relative w-full min-h-[100px]"
                    ref={formRef}
                >
                    <textarea
                        ref={textAreaRef}
                        name={name}
                        placeholder="What's on your mind?"
                        aria-label="Content input"
                        aria-invalid={Boolean(formError)}
                        aria-errormessage={
                            formError ? "content-error" : undefined
                        }
                        className={`w-full p-4 bg-transparent border-none resize-none focus:outline-none min-h-[200px] h-auto ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        disabled={isSubmitting}
                        onChange={(e) => {
                            setHasContent(e.target.value.length > 0);
                        }}
                        onPaste={(e) => {
                            // This is done because the paste event triggers a
                            // submit on the parent form and thereby does not
                            // allow the user to paste content
                            e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                            if (
                                (isMac && e.metaKey && e.key === "Enter") ||
                                (isWin && e.ctrlKey && e.key === "Enter")
                            ) {
                                e.preventDefault();
                                fetcher.submit(formRef.current);
                            }
                        }}
                    />

                    {formError ? (
                        <div
                            id="content-error"
                            className="text-red-500 text-sm p-2"
                        >
                            {formError}
                        </div>
                    ) : null}

                    <input type="hidden" name="intent" value={intent} />

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className={`bottom-0 right-0 w-full rounded-none ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        } ${hasContent ? "visible" : "invisible"}`}
                    >
                        {isSubmitting
                            ? "Saving..."
                            : `Save (${getShortcutKey()})`}
                    </Button>
                </fetcher.Form>
            </CardContent>
        </Card>
    );
};
