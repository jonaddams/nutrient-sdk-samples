"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function ConstructionMeasurementPage() {
  return <Viewer />;
}
