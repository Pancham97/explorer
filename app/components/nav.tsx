import { Form, Link, useLocation } from "@remix-run/react";
import { ModeToggle } from "./ui/mode-toggle";
import { User } from "~/session";

export default function Nav({ user }: { user: User | undefined }) {
    const currentRoute = useLocation();

    if (currentRoute.pathname === "/login") {
        return null;
    }

    return (
        <div className="flex justify-between items-center p-4">
            <Link to="/">Home</Link>
            Welcome, {user?.firstName}
            <div>
                {!user && <Link to="/login">Login</Link>}
                {user && (
                    <Form method="post">
                        <button type="submit">Logout</button>
                    </Form>
                )}
            </div>
            <ModeToggle />
        </div>
    );
}
