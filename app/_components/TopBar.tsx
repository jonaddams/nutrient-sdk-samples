"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isChromelessRoute } from "./chromelessRoutes";
import { Tweaks } from "./Tweaks";

export function TopBar() {
  const pathname = usePathname();
  if (isChromelessRoute(pathname)) return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="wordmark">
          <span className="dot" aria-hidden="true" />
          SDK Samples
        </Link>
        <nav className="topnav">
          <Link href="/web-sdk" className="nav-link-collapse">
            Samples
          </Link>
          <a
            href="https://github.com/jonaddams/nutrient-sdk-samples"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-collapse"
          >
            GitHub
          </a>
          <Tweaks />
        </nav>
      </div>
    </header>
  );
}
