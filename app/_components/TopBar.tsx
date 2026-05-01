import Link from "next/link";
import { Tweaks } from "./Tweaks";

export function TopBar() {
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
          <Link href="/design-system" className="nav-link-collapse">
            System
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
