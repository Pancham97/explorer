import React from "react";

type MasonryGridProps = {
    children: React.ReactNode[];
    columnsByBreakpoint?: {
        default: number;
        lg: number;
        md: number;
        sm: number;
    };
};

export const MasonryGrid: React.FC<MasonryGridProps> = ({
    children,
    columnsByBreakpoint = {
        default: 4,
        lg: 3,
        md: 2,
        sm: 1,
    },
}) => {
    const [columnCount, setColumnCount] = React.useState(
        columnsByBreakpoint.default
    );

    // Responsive column adjustment
    React.useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumnCount(columnsByBreakpoint.sm);
            else if (width < 768) setColumnCount(columnsByBreakpoint.md);
            else if (width < 1024) setColumnCount(columnsByBreakpoint.lg);
            else setColumnCount(columnsByBreakpoint.default);
        };

        updateColumns();
        window.addEventListener("resize", updateColumns);
        return () => window.removeEventListener("resize", updateColumns);
    }, [columnsByBreakpoint]);

    // Map column count to Tailwind classes
    const getColumnsClass = (count: number) => {
        const columnMap: Record<number, string> = {
            1: "columns-1",
            2: "columns-2",
            3: "columns-3",
            4: "columns-4",
            5: "columns-5",
            6: "columns-6",
        };
        return columnMap[count] || "columns-4"; // fallback to 4 columns
    };

    return (
        <div className={`gap-4 ${getColumnsClass(columnCount)}`}>
            {React.Children.map(children, (child, index) => (
                <div key={index} className="mb-4 break-inside-avoid">
                    {child}
                </div>
            ))}
        </div>
    );
};
