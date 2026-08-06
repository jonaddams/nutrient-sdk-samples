import { SamplesIndex } from "@/app/_components/SamplesIndex";
import { samples } from "./samples";

const categories = [
  "All",
  "User Interface",
  "Annotations",
  "Forms",
  "Signatures",
  "Document Editor",
  "Content Editor",
  "Redaction",
  "Document Comparison",
  "Document Conversion",
  "Content",
];

const intro = (
  <div className="callout">
    <span className="callout-label">AI assistants</span>
    <p>
      Wire up{" "}
      <a
        href="https://www.npmjs.com/package/@nutrient-sdk/viewer-mcp"
        target="_blank"
        rel="noopener noreferrer"
      >
        @nutrient-sdk/viewer-mcp
      </a>{" "}
      — an MCP server that gives AI assistants live access to Web SDK docs, API,
      examples, and changelog. Add it to your MCP client config:
    </p>
    <div className="code-block" style={{ margin: 0 }}>
      <figure>
        <figcaption>MCP client config</figcaption>
        <pre>
          <code>{`{
  "mcpServers": {
    "Nutrient": { "command": "npx", "args": ["@nutrient-sdk/viewer-mcp"] }
  }
}`}</code>
        </pre>
      </figure>
    </div>
    <p>
      Prefer agent skills? Follow the{" "}
      <a
        href="https://www.nutrient.io/guides/web/agent-skill/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Web SDK agent skill guide
      </a>{" "}
      to install Nutrient skills directly into your coding agent.
    </p>
  </div>
);

export default function WebSDKPage() {
  return (
    <SamplesIndex
      title="Web SDK"
      description="In-browser PDF viewing, annotations, forms, signatures, and redaction. 37 samples spanning every major UI surface."
      samples={samples}
      categories={categories}
      productHomeUrl="https://www.nutrient.io/sdk/web/"
      guidesUrl="https://www.nutrient.io/guides/web/"
      intro={intro}
    />
  );
}
