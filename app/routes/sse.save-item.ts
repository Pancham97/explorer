import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { eventStream } from "remix-utils/sse/server";
import { emitter } from "~/util/emitter";

export async function loader({ request }: LoaderFunctionArgs) {
    return eventStream(request.signal, function setup(send) {
        // Handle new item event
        function handleNewItem(id: string) {
            send({ event: "new-item", data: id });
        }

        // Handle processing status events
        function handleProcessingStart(data: { id: string; itemType: string }) {
            send({ event: "processing-start", data: JSON.stringify(data) });
        }

        function handleProcessingUpdate(data: {
            id: string;
            message: string;
            progress?: number;
        }) {
            send({ event: "processing-update", data: JSON.stringify(data) });
        }

        function handleProcessingComplete(data: {
            id: string;
            success: boolean;
            message: string;
        }) {
            send({ event: "processing-complete", data: JSON.stringify(data) });
        }

        // Register event listeners
        emitter.on("new-item", handleNewItem);
        emitter.on("processing-start", handleProcessingStart);
        emitter.on("processing-update", handleProcessingUpdate);
        emitter.on("processing-complete", handleProcessingComplete);

        return function cleanup() {
            // Clean up event listeners
            emitter.off("new-item", handleNewItem);
            emitter.off("processing-start", handleProcessingStart);
            emitter.off("processing-update", handleProcessingUpdate);
            emitter.off("processing-complete", handleProcessingComplete);
        };
    });
}
