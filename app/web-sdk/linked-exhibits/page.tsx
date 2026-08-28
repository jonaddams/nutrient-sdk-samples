"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function LinkedExhibitsPage() {
  return (
    <SampleFrame
      title="Linked Exhibits"
      description="Navigate a set of related documents through link annotations. Pick a document from the list, then click any highlighted cross-reference inside it to open that document in the same viewer."
      wide
      intro={
        <div className="callout">
          <span className="callout-label">How this works</span>
          <p>
            A contract cites its exhibits, and each exhibit cites the contract.
            This sample turns those citations into working navigation. On load
            it runs <code>instance.search()</code> for each other document's
            reference phrase and creates a <code>LinkAnnotation</code> carrying
            a <code>URIAction</code> over every match — using the search rects,
            so nothing is pinned to hardcoded coordinates.
          </p>
          <p>
            Clicking one fires <code>annotations.press</code>. The handler calls{" "}
            <code>preventDefault()</code>, matches the URI's filename against an
            allow-list of the four documents, and swaps the document in place.
            That allow-list matters: the URI selects a manifest entry and is
            never fetched directly.
          </p>
          <p>
            <strong>Links can target a specific page.</strong> Each link URI
            carries a <code>#page=</code> fragment — the{" "}
            <a
              href="https://www.nutrient.io/guides/web/features/open-parameters/"
              target="_blank"
              rel="noreferrer"
            >
              open parameter
            </a>{" "}
            the SDK defines for the URL of a page hosting the viewer. Rather
            than re-implement that format, the sample hands the fragment to the
            SDK's own <code>viewStateFromOpenParameters()</code> and passes the
            result as <code>initialViewState</code>. So the citation to “Exhibit
            B” opens the fee schedule at page 1, while “Section B.1” opens the
            same document at the rate card on page 2. Note the numbering
            difference: <code>#page=</code> is 1-based, while{" "}
            <code>currentPageIndex</code> is 0-based, and an out-of-range page
            falls back to page 1 rather than failing.
          </p>
          <p>
            Two details worth knowing. The SDK renders a link annotation as a
            real <code>&lt;a target="_blank"&gt;</code> anchor, so without
            interception a click would open the raw PDF in a new tab and leave
            the viewer behind; <code>preventDefault()</code> is what suppresses
            that, and the configuration sets{" "}
            <code>onOpenURI: () =&gt; false</code> as a backstop. And the PDF
            action built for exactly this purpose, <code>GoToRemoteAction</code>
            , is documented by the SDK as “not implemented yet” — so a URI
            action plus interception is the working approach today.
          </p>
        </div>
      }
    >
      <Viewer />
    </SampleFrame>
  );
}
