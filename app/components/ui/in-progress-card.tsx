import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function InProgressCard() {
    return (
        <div className="bg-gradient-to-tr from-pink-300 to-blue-300 p-1 shadow-lg rounded-sm mb-6">
            <Card className="bg-gray-50 p-1">
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
