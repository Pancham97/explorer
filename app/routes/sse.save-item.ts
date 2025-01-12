import { LoaderFunctionArgs } from "@vercel/remix";
import { eventStream } from "remix-utils/sse/server";
import { emitter } from "~/util/emitter";

export async function loader({ request }: LoaderFunctionArgs) {
    return eventStream(request.signal, function setup(send) {
        function handle(id: string) {
            send({ event: "new-item", data: id });
        }

        emitter.on("new-item", handle);

        return function cleanup() {
            emitter.off("new-item", handle);
        };
    });
}
