import { useFetcher } from "@remix-run/react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

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
    const fetcher = useFetcher();
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [hasContent, setHasContent] = React.useState(false);

    const isSubmitting = fetcher.state === "submitting";

    return (
        <Card className="transition-all duration-200 ease-in-out hover:shadow-md">
            <CardContent className="p-0">
                <fetcher.Form
                    method="post"
                    className="relative w-full min-h-[100px]"
                    ref={formRef}
                >
                    <textarea
                        ref={textAreaRef}
                        name={name}
                        placeholder="Capture your thought here..."
                        aria-label="Content input"
                        aria-invalid={Boolean(formError)}
                        aria-errormessage={
                            formError ? "content-error" : undefined
                        }
                        className={`w-full p-4 bg-transparent border-none resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{ minHeight: "100px" }}
                        disabled={isSubmitting}
                        onChange={(e) => {
                            setHasContent(e.target.value.length > 0);
                        }}
                        onPaste={(e) => {
                            e.stopPropagation();
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
                        className={`absolute bottom-0 right-0 w-full ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        } ${hasContent ? "visible" : "hidden"}`}
                    >
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                </fetcher.Form>
            </CardContent>
        </Card>
    );
};
