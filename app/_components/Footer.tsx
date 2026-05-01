import Link from "next/link";

export function Footer() {
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
          <Link href="/design-system">Design system</Link>
        </div>
      </div>
    </footer>
  );
}
