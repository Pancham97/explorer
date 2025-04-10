import { Form, Link, useLocation } from "@remix-run/react";
import { Laptop, Moon, Sun, User as UserIcon } from "lucide-react";
import { Theme, useTheme } from "remix-themes";
import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { User } from "~/session";
import logo from "/logo.svg";

function getGreetingBasedOnTime() {
    const hour = new Date().getHours();
    if (hour < 4) return "🌃 Happy late night";
    if (hour < 12) return "🌞 Good morning";
    if (hour < 18) return "🌤️ Good afternoon";
    return "🌜 Good evening";
}

export function UserActions({ user }: { user: Maybe<User> }) {
    const [, setTheme] = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    {user?.avatarUrl ? (
                        <img
                            src={user?.avatarUrl}
                            alt={user?.firstName}
                            className="w-6 h-6 rounded-full"
                        />
                    ) : (
                        <UserIcon className="w-6 h-6" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme(Theme.LIGHT)}>
                            <Sun className="w-4 h-4" /> Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(Theme.DARK)}>
                            <Moon className="w-4 h-4" /> Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(null)}>
                            <Laptop className="w-4 h-4" /> System
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <Form method="post">
                    <DropdownMenuItem className="text-red-500">
                        <button type="submit">Logout</button>
                    </DropdownMenuItem>
                </Form>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Nav({ user }: { user: Maybe<User> }) {
    const currentRoute = useLocation();

    if (currentRoute.pathname === "/login") {
        return null;
    }

    return (
        <div className="flex justify-between items-center p-4">
            <Link to="/" className="flex items-center gap-2">
                <h1 className="text-2xl font-light font-serif">Sunchay</h1>
            </Link>
            {/* <Time /> */}

            <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif invisible md:visible">
                    {getGreetingBasedOnTime()}, {user?.firstName}
                </h1>
                <UserActions user={user} />
            </div>
            {/* <ModeToggle /> */}
        </div>
    );
}
