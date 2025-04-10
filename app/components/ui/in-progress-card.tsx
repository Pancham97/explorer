import { useEventSource } from "remix-utils/sse/react";
import { Sun, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ProcessingStatus } from "~/util/emitter";

export function InProgressCard({
    processingItems,
    setProcessingItems,
    setShowCard,
}: {
    processingItems: Record<string, ProcessingStatus>;
    setProcessingItems: React.Dispatch<
        React.SetStateAction<Record<string, ProcessingStatus>>
    >;
    setShowCard: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    // Listen for different event types
    // const newItemEvent = useEventSource("/sse/save-item", {
    //     event: "new-item",
    // });
    // const processingStartEvent = useEventSource("/sse/save-item", {
    //     event: "processing-start",
    // });
    // const processingUpdateEvent = useEventSource("/sse/save-item", {
    //     event: "processing-update",
    // });
    // const processingCompleteEvent = useEventSource("/sse/save-item", {
    //     event: "processing-complete",
    // });

    // // Handle new item
    // useEffect(() => {
    //     if (newItemEvent) {
    //         console.log("New item created:", newItemEvent);
    //         setProcessingItems((prev) => ({
    //             ...prev,
    //             [newItemEvent]: {
    //                 id: newItemEvent,
    //                 message: "Item created, waiting for processing...",
    //             },
    //         }));
    //         setShowCard(true);
    //     }
    // }, [newItemEvent]);

    // // Handle processing start
    // useEffect(() => {
    //     if (processingStartEvent) {
    //         try {
    //             const data = JSON.parse(processingStartEvent) as {
    //                 id: string;
    //                 itemType: string;
    //             };
    //             console.log("Processing started:", data);
    //             setProcessingItems((prev) => ({
    //                 ...prev,
    //                 [data.id]: {
    //                     ...prev[data.id],
    //                     id: data.id,
    //                     itemType: data.itemType,
    //                     message: `Starting to process ${data.itemType} item...`,
    //                 },
    //             }));
    //             setShowCard(true);
    //         } catch (e) {
    //             console.error("Failed to parse processing-start event:", e);
    //         }
    //     }
    // }, [processingStartEvent]);

    // // Handle processing update
    // useEffect(() => {
    //     if (processingUpdateEvent) {
    //         try {
    //             const data = JSON.parse(processingUpdateEvent) as {
    //                 id: string;
    //                 message: string;
    //             };
    //             console.log("Processing update:", data);
    //             setProcessingItems((prev) => ({
    //                 ...prev,
    //                 [data.id]: {
    //                     ...prev[data.id],
    //                     id: data.id,
    //                     message: data.message,
    //                 },
    //             }));
    //         } catch (e) {
    //             console.error("Failed to parse processing-update event:", e);
    //         }
    //     }
    // }, [processingUpdateEvent]);

    // // Handle processing complete
    // useEffect(() => {
    //     if (processingCompleteEvent) {
    //         try {
    //             const data = JSON.parse(processingCompleteEvent) as {
    //                 id: string;
    //                 success: boolean;
    //                 message: string;
    //             };
    //             console.log("Processing complete:", data);
    //             setProcessingItems((prev) => ({
    //                 ...prev,
    //                 [data.id]: {
    //                     ...prev[data.id],
    //                     id: data.id,
    //                     message: data.message,
    //                     success: data.success,
    //                 },
    //             }));

    //             // Hide completed items after a slightly longer time for successful items
    //             // to allow users to see the confirmation
    //             setTimeout(
    //                 () => {
    //                     setProcessingItems((prev) => {
    //                         const updated = { ...prev };
    //                         delete updated[data.id];
    //                         if (Object.keys(updated).length === 0) {
    //                             setShowCard(false);
    //                         }
    //                         return updated;
    //                     });
    //                 },
    //                 data.success ? 1000 : 5000
    //             ); // Show success messages for 3s, errors for 5s
    //         } catch (e) {
    //             console.error("Failed to parse processing-complete event:", e);
    //         }
    //     }
    // }, [processingCompleteEvent]);

    return (
        <div className="bg-gradient-to-tr from-pink-300 to-blue-300 p-1 shadow-lg rounded-md mb-2 md:mb-3 lg:mb-4 motion-safe:animate-soft-pulse">
            <div className="bg-white dark:bg-zinc-800 rounded-sm p-6 flex flex-col gap-4">
                {Object.values(processingItems).length === 0 ? (
                    <>
                        <Sun className="h-8 w-8" aria-hidden="true" />
                        <p className="font-serif">Saving your idea...</p>
                    </>
                ) : (
                    Object.values(processingItems).map((item) => (
                        <div key={item.id} className="flex flex-col gap-2">
                            {/* <div className="flex items-center gap-2"> */}

                            <Sun className="h-8 w-8" aria-hidden="true" />
                            <p className="font-serif">{item.message}</p>
                            {/* </div> */}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
