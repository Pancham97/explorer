import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const hostnameToWebsiteName: Record<string, string> = {
    "amazon.com": "Amazon",
    "facebook.com": "Facebook",
    "github.com": "GitHub",
    "google.com": "Google",
    "instagram.com": "Instagram",
    "linkedin.com": "LinkedIn",
    "microsoft.com": "Microsoft",
    "netflix.com": "Netflix",
    "notion.com": "Notion",
    "notion.so": "Notion",
    "quora.com": "Quora",
    "reddit.com": "Reddit",
    "spotify.com": "Spotify",
    "stackoverflow.com": "Stack Overflow",
    "tiktok.com": "TikTok",
    "twitter.com": "Twitter",
    "www3.netflix.com": "Netflix",
    "youtube.com": "YouTube",
};

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
}

export function getDomainFromUrl(url: string) {
    if (!url) return "";
    const hostname = new URL(url).hostname.replace("www.", "");
    return hostnameToWebsiteName[hostname] || hostname;
}
