import { AnimatePresence } from "framer-motion";
import Masonry from "react-masonry-css";
import React from "react";

type MasonryGridProps = {
    children: React.ReactNode;
};

const columnsByBreakpoint = {
    default: 4,
    "768px": 2,
    "1024px": 3,
    "1280px": 4,
    "1600px": 5,
    "1920px": 6,
    "2560px": 8,
    "3200px": 11,
    "4096px": 12,
};

const breakpoints = [
    { width: 3200, columns: columnsByBreakpoint["3200px"] },
    { width: 2560, columns: columnsByBreakpoint["2560px"] },
    { width: 1920, columns: columnsByBreakpoint["1920px"] },
    { width: 1600, columns: columnsByBreakpoint["1600px"] },
    { width: 1280, columns: columnsByBreakpoint["1280px"] },
    { width: 1024, columns: columnsByBreakpoint["1024px"] },
    { width: 768, columns: columnsByBreakpoint["768px"] },
];

const masonryBreakpoints = {
    default: columnsByBreakpoint.default,
    4096: columnsByBreakpoint["4096px"],
    3200: columnsByBreakpoint["3200px"],
    2560: columnsByBreakpoint["2560px"],
    1920: columnsByBreakpoint["1920px"],
    1600: columnsByBreakpoint["1600px"],
    1280: columnsByBreakpoint["1280px"],
    1024: columnsByBreakpoint["1024px"],
    768: columnsByBreakpoint["768px"],
};

export const MasonryGrid: React.FC<MasonryGridProps> = ({ children }) => {
    // const [numberOfColumns, setNumberOfColumns] = React.useState(
    //     columnsByBreakpoint.default
    // );

    // Responsive column adjustment
    // const updateColumns = React.useCallback(() => {
    //     const width = window.innerWidth;
    //     const breakpoint = breakpoints.find((bp) => width >= bp.width);
    //     setNumberOfColumns(breakpoint?.columns ?? columnsByBreakpoint.sm);
    // }, []);

    // React.useEffect(() => {
    //     updateColumns();
    //     window.addEventListener("resize", updateColumns);
    //     return () => window.removeEventListener("resize", updateColumns);
    // }, [updateColumns]);

    // const grid = React.useMemo(() => {
    //     const grid: React.ReactNode[][] = Array.from(
    //         { length: numberOfColumns },
    //         () => []
    //     );
    //     React.Children.forEach(children, (child, index) => {
    //         const columnIndex = Math.floor(index % numberOfColumns);
    //         grid[columnIndex].push(child);
    //     });
    //     return grid;
    // }, [children, numberOfColumns]);

    return (
        <Masonry
            breakpointCols={masonryBreakpoints}
            className="flex w-auto -ml-2 md:-ml-3 lg:-ml-4"
            columnClassName="pl-2 md:pl-3 lg:pl-4 bg-clip-padding"
        >
            {/* <AnimatePresence mode="popLayout"> */}
            {React.Children.toArray(children).filter(Boolean)}
            {/* </AnimatePresence> */}
        </Masonry>
    );

    // return (
    //     <div className="gap-2 md:gap-3 lg:gap-4 columns-2 lg:columns-3 xl:columns-4 min-[1920px]:columns-6 min-[2560px]:columns-8 min-[3200px]:columns-10">
    //         <AnimatePresence mode="popLayout">
    //             {grid.map((child, index) => (
    //                 <div key={index}>{child}</div>
    //             ))}
    //         </AnimatePresence>
    //     </div>
    // );
};
