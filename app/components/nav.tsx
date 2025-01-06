import { Form, Link, useLocation } from "@remix-run/react";
import { Moon, Sun, User } from "lucide-react";
import { Theme, useTheme } from "remix-themes";
import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import logo from "/logo.svg";
import { User as UserType } from "~/session";

function getGreetingBasedOnTime() {
    const hour = new Date().getHours();
    if (hour < 4) return "🌃 Happy late night";
    if (hour < 12) return "🌞 Good morning";
    if (hour < 18) return "🌤️ Good afternoon";
    return "🌜 Good evening";
}

export function UserActions({ user }: { user: UserType | undefined }) {
    const [_, setTheme] = useTheme();

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
                        <User className="w-6 h-6" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme(Theme.LIGHT)}>
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(Theme.DARK)}>
                    Dark
                </DropdownMenuItem>
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

export default function Nav({ user }: { user: UserType | undefined }) {
    const currentRoute = useLocation();

    if (currentRoute.pathname === "/login") {
        return null;
    }

    return (
        <div className="flex justify-between items-center p-4">
            <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="Sunchay app logo" className="w-10 h-10" />{" "}
                <h1 className="text-2xl font-light font-serif">Sunchay</h1>
            </Link>
            {/* <div>
                {!user && <Link to="/login">Login</Link>}
                {user && (
                    
                )}
            </div> */}

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
