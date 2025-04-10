import { Sun } from "lucide-react";

export function InProgressCard({
    setShowCard,
}: {
    setShowCard: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    return (
        <div className="bg-gradient-to-tr from-pink-300 to-blue-300 p-1 shadow-lg rounded-md mb-2 md:mb-3 lg:mb-4 motion-safe:animate-soft-pulse">
            <div className="bg-white dark:bg-zinc-800 rounded-sm p-6 flex flex-col gap-4">
                <>
                    <Sun className="h-8 w-8" aria-hidden="true" />
                    <p className="font-serif">Saving your idea...</p>
                </>
            </div>
        </div>
    );
}
