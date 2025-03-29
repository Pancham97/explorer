import {
    vitePlugin as remix,
    cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
    interface Future {
        v3_singleFetch: true;
    }
}

installGlobals();

export default defineConfig({
    // server: {
    //     host: "0.0.0.0",
    // },
    plugins: [
        remixCloudflareDevProxy(),
        remix({
            future: {
                v3_fetcherPersist: true,
                v3_relativeSplatPath: true,
                v3_throwAbortReason: true,
                v3_singleFetch: true,
                v3_lazyRouteDiscovery: true,
            },
        }),
        tsconfigPaths(),
    ],
});
