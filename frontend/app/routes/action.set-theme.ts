import { createThemeAction } from "remix-themes";
import { themeSessionResolver } from "~/session";

export const action = createThemeAction(themeSessionResolver);
