"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isChromelessRoute } from "./chromelessRoutes";

export function Footer() {
  const pathname = usePathname();
  if (isChromelessRoute(pathname)) return null;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} SDK Samples</span>
          <Link href="/">Index</Link>
          <a
            href="https://github.com/jonaddams/nutrient-sdk-samples"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repo
          </a>
        </div>
      </div>
    </footer>
  );
}
