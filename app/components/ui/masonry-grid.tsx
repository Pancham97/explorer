import { AnimatePresence } from "framer-motion";
import React from "react";

type MasonryGridProps = {
    children: React.ReactNode[];
};

const columnsByBreakpoint = {
    default: 4,
    sm: 2,
    md: 2,
    lg: 3,
    "2xl": 5,
    "1600px": 4,
    "1920px": 6,
    "2560px": 8,
    "3200px": 11,
};

const breakpoints = [
    { width: 3200, columns: columnsByBreakpoint["3200px"] },
    { width: 2560, columns: columnsByBreakpoint["2560px"] },
    { width: 1920, columns: columnsByBreakpoint["1920px"] },
    { width: 1600, columns: columnsByBreakpoint["1600px"] },
    { width: 1280, columns: columnsByBreakpoint.default },
    { width: 1024, columns: columnsByBreakpoint.lg },
    { width: 768, columns: columnsByBreakpoint.md },
];

export const MasonryGrid: React.FC<MasonryGridProps> = ({ children }) => {
    const [numberOfColumns, setNumberOfColumns] = React.useState(
        columnsByBreakpoint.default
    );

    // Responsive column adjustment
    const updateColumns = React.useCallback(() => {
        const width = window.innerWidth;
        const breakpoint = breakpoints.find((bp) => width >= bp.width);
        setNumberOfColumns(breakpoint?.columns ?? columnsByBreakpoint.sm);
    }, []);

    React.useEffect(() => {
        updateColumns();
        window.addEventListener("resize", updateColumns);
        return () => window.removeEventListener("resize", updateColumns);
    }, [updateColumns]);

    const grid = React.useMemo(() => {
        const grid: React.ReactNode[][] = Array.from(
            { length: numberOfColumns },
            () => []
        );
        React.Children.forEach(children, (child, index) => {
            const columnIndex = Math.floor(index % numberOfColumns);
            grid[columnIndex].push(child);
        });
        return grid;
    }, [children, numberOfColumns]);

    return (
        <div className="gap-6 columns-2 lg:columns-3 xl:columns-4 min-[1920px]:columns-6 min-[2560px]:columns-8 min-[3200px]:columns-10">
            <AnimatePresence mode="popLayout">
                {grid.map((child, index) => (
                    <div className="break-inside-avoid" key={index}>
                        {child}
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};
