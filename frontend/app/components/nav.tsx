import { Form, Link, useLocation } from "@remix-run/react";
import { User } from "~/session";

export default function Nav({ user }: { user: User | undefined }) {
    const currentRoute = useLocation();

    if (currentRoute.pathname === "/login") {
        return null;
    }

    return (
        <div>
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
        </div>
    );
}
