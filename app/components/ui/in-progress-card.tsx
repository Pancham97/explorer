import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function InProgressCard() {
    return (
        <div className="bg-gradient-to-tr from-pink-300 to-blue-300 p-1 shadow-lg rounded-sm mb-6">
            <Card className="bg-zinc-50 dark:bg-zinc-800 p-1 animate-pulse duration-5000">
                <CardHeader>
                    <Sun className="h-8 w-8 " />
                </CardHeader>
                <CardContent>
                    <p>Saving your idea...</p>
                </CardContent>
            </Card>
        </div>
    );
}
