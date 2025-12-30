import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SampleHeaderProps {
  title: string;
  description?: string;
}

export function SampleHeader({ title, description }: SampleHeaderProps) {
  return (
    <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-sm mb-2">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/web-sdk" className="hover:underline">
            Web SDK
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[var(--warm-gray-600)]">{title}</span>
        </nav>
        <h1 className="!mb-0">{title}</h1>
        {description && <p className="text-[var(--warm-gray-600)] mt-2">{description}</p>}
      </div>
    </header>
  );
}
