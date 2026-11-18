"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";

const ContractRag = dynamic(() => import("./contract-rag"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading contract Q&A..." />,
});

export default function ContractRagPage() {
  return <ContractRag />;
}
