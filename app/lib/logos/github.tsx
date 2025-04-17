import React from "react";
import { useTheme } from "remix-themes";

function GithubLogoIcon() {
    const [theme] = useTheme();

    if (theme === "dark") {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <path
                    fill="#24292f"
                    fillRule="evenodd"
                    d="M49 0a49 49 0 0 0-15 96c2 0 3-1 3-2V84c-14 3-17-5-17-5-2-6-5-8-5-8-5-3 0-3 0-3 5 1 8 5 8 5 4 8 11 6 14 4 0-3 2-5 3-6-11-1-22-5-22-24 0-6 2-10 5-14-1-1-2-6 0-13 0 0 4-1 14 5a47 47 0 0 1 12-1l12 1c9-6 13-5 13-5 3 7 1 12 1 13 3 4 5 8 5 14 0 19-11 23-22 24 1 1 3 4 3 9v14c0 1 1 2 3 2A49 49 0 0 0 49 0z"
                    clipRule="evenodd"
                />
            </svg>
        );
    }

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path
                fill="#fff"
                fillRule="evenodd"
                d="M49 0a49 49 0 0 0-15 96c2 0 3-1 3-2V84c-14 3-17-5-17-5-2-6-5-8-5-8-5-3 0-3 0-3 5 1 8 5 8 5 4 8 11 6 14 4 0-3 2-5 3-6-11-1-22-5-22-24 0-6 2-10 5-14-1-1-2-6 0-13 0 0 4-1 14 5a47 47 0 0 1 12-1l12 1c9-6 13-5 13-5 3 7 1 12 1 13 3 4 5 8 5 14 0 19-11 23-22 24 1 1 3 4 3 9v14c0 1 1 2 3 2 20-7 34-25 34-47C98 22 76 0 49 0z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export default GithubLogoIcon;
