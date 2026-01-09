"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import "./styles.css";

interface Tool {
  id: string;
  icon: string;
  label: string;
  mode: string;
  preset?: string;
}

interface ToolbarButtonProps {
  tool?: Tool;
  isActive: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

interface ComparisonButtonProps {
  onClick: () => void;
  isActive: boolean;
}

interface ComparisonConfigButtonProps {
  onClick: () => void;
}

interface ZoomButtonProps {
  onClick: () => void;
}

interface VerticalToolbarProps {
  tools: Tool[];
  activeTool: string | null;
  onToolClick: (toolId: string) => void;
  onCompareClick: () => void;
  onComparisonConfigClick: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isInComparisonMode: boolean;
}

interface ComparisonConfigModalProps {
  show: boolean;
  colors: {
    documentA: string;
    documentB: string;
  };
  blendMode: string;
  onColorChange: (document: string, color: string) => void;
  onBlendModeChange: (mode: string) => void;
  onClose: () => void;
  onApply: () => void;
  isInComparisonMode: boolean;
}

interface NutrientViewerGlobal {
  InteractionMode: Record<string, unknown>;
  Theme: {
    DARK: string;
    LIGHT: string;
  };
  DocumentComparisonSourceType: {
    USE_OPEN_DOCUMENT: string;
  };
  Color: new (rgb: { r: number; g: number; b: number }) => unknown;
  load: (config: {
    container: HTMLElement;
    document: string;
    licenseKey: string | undefined;
    theme: string;
  }) => Promise<Instance>;
  unload: (container: HTMLElement) => void;
}

// Tool configuration
const TOOLS: Tool[] = [
  {
    id: "select",
    icon: "/icons/select.svg",
    label: "Select",
    mode: "MULTI_ANNOTATIONS_SELECTION",
  },
  { id: "text", icon: "/icons/text.svg", label: "Text", mode: "TEXT" },
  { id: "note", icon: "/icons/note.svg", label: "Note", mode: "NOTE" },
  { id: "ink", icon: "/icons/ink.svg", label: "Ink", mode: "INK" },
  { id: "line", icon: "/icons/line.svg", label: "Line", mode: "SHAPE_LINE" },
  {
    id: "polygon",
    icon: "/icons/polygon.svg",
    label: "Polygon",
    mode: "SHAPE_POLYGON",
  },
  {
    id: "cloudy_polygon",
    icon: "/icons/cloudy_polygon.svg",
    label: "Cloudy Polygon",
    mode: "SHAPE_POLYGON",
    preset: "cloudy-polygon",
  },
  {
    id: "rectangle",
    icon: "/icons/rectangle.svg",
    label: "Rectangle",
    mode: "SHAPE_RECTANGLE",
  },
  {
    id: "ellipse",
    icon: "/icons/ellipse.svg",
    label: "Ellipse",
    mode: "SHAPE_ELLIPSE",
  },
  {
    id: "measurement",
    icon: "/icons/measurement.svg",
    label: "Measurement",
    mode: "MEASUREMENT",
  },
  {
    id: "measurement_settings",
    icon: "/icons/measurement_settings.svg",
    label: "Measurement Settings",
    mode: "MEASUREMENT_SETTINGS",
  },
];

// Create mapping from interaction mode to tool ID
const createModeToToolMap = (NutrientViewer: NutrientViewerGlobal) => {
  const map: Record<string, string> = {};
  for (const tool of TOOLS) {
    const mode = NutrientViewer.InteractionMode[tool.mode];
    if (mode && !tool.preset) {
      map[String(mode)] = tool.id;
    }
  }
  return map;
};

// Toggle tool activation
const toggleTool = (
  instance: Instance | null,
  NutrientViewer: NutrientViewerGlobal,
  toolId: string,
  setActiveTool: (id: string | null) => void,
  activeTool: string | null,
) => {
  if (!instance) return;

  const tool = TOOLS.find((t) => t.id === toolId);
  if (!tool) return;

  const targetMode = NutrientViewer.InteractionMode[tool.mode] as unknown;

  if (activeTool === toolId) {
    // Deactivate current tool
    instance.setViewState((viewState) =>
      viewState.set("interactionMode", null),
    );
    setActiveTool(null);
  } else {
    // If tool has a preset, set it first
    if (tool.preset) {
      instance.setCurrentAnnotationPreset(tool.preset);
    }
    // Activate new tool
    instance.setViewState((viewState) =>
      viewState.set("interactionMode", targetMode as never),
    );
    // Manually set the active tool for tools with presets
    setActiveTool(toolId);
  }
};

// Toolbar Button Component
const ToolbarButton = ({
  tool,
  isActive,
  onClick,
  children,
}: ToolbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      title={tool?.label}
      className={`toolbar-button ${isActive ? "active" : ""}`}
      type="button"
    >
      {children || (
        // biome-ignore lint/performance/noImgElement: SVG icons don't need Next.js Image optimization
        <img
          src={tool?.icon}
          alt={tool?.label}
          className="toolbar-button-icon"
        />
      )}
    </button>
  );
};

// Document Comparison Button Component
const ComparisonButton = ({ onClick, isActive }: ComparisonButtonProps) => {
  return (
    <button
      onClick={onClick}
      title={isActive ? "Exit Comparison Mode" : "Compare Documents"}
      className={`toolbar-button ${isActive ? "active" : ""}`}
      type="button"
    >
      {/* biome-ignore lint/performance/noImgElement: SVG icons don't need Next.js Image optimization */}
      <img
        src="/icons/compare.svg"
        alt="Compare Documents"
        className="toolbar-button-icon"
      />
    </button>
  );
};

// Comparison Configuration Button Component
const ComparisonConfigButton = ({ onClick }: ComparisonConfigButtonProps) => {
  return (
    <button
      onClick={onClick}
      title="Comparison Configuration"
      className="toolbar-button"
      type="button"
    >
      {/* biome-ignore lint/performance/noImgElement: SVG icons don't need Next.js Image optimization */}
      <img
        src="/icons/config.svg"
        alt="Comparison Configuration"
        className="toolbar-button-icon"
      />
    </button>
  );
};

// Zoom In Button Component
const ZoomInButton = ({ onClick }: ZoomButtonProps) => {
  return (
    <button
      onClick={onClick}
      title="Zoom In"
      className="toolbar-button"
      type="button"
    >
      {/* biome-ignore lint/performance/noImgElement: SVG icons don't need Next.js Image optimization */}
      <img
        src="/icons/zoom-in.svg"
        alt="Zoom In"
        className="toolbar-button-icon"
      />
    </button>
  );
};

// Zoom Out Button Component
const ZoomOutButton = ({ onClick }: ZoomButtonProps) => {
  return (
    <button
      onClick={onClick}
      title="Zoom Out"
      className="toolbar-button"
      type="button"
    >
      {/* biome-ignore lint/performance/noImgElement: SVG icons don't need Next.js Image optimization */}
      <img
        src="/icons/zoom-out.svg"
        alt="Zoom Out"
        className="toolbar-button-icon"
      />
    </button>
  );
};

// Vertical Toolbar Component
const VerticalToolbar = ({
  tools,
  activeTool,
  onToolClick,
  onCompareClick,
  onComparisonConfigClick,
  onZoomIn,
  onZoomOut,
  isInComparisonMode,
}: VerticalToolbarProps) => {
  return (
    <div className="toolbar-container">
      <div className="toolbar-scroll-content">
        <ZoomInButton onClick={onZoomIn} />
        <ZoomOutButton onClick={onZoomOut} />
        <div className="toolbar-separator" />
        {tools.map((tool) => (
          <ToolbarButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => onToolClick(tool.id)}
          />
        ))}
        <div className="toolbar-separator" />
        <ComparisonButton
          onClick={onCompareClick}
          isActive={isInComparisonMode}
        />
        <ComparisonConfigButton onClick={onComparisonConfigClick} />
      </div>
    </div>
  );
};

// Comparison Configuration Modal Component
const ComparisonConfigModal = ({
  show,
  colors,
  blendMode,
  onColorChange,
  onBlendModeChange,
  onClose,
  onApply,
  isInComparisonMode,
}: ComparisonConfigModalProps) => {
  if (!show) return null;

  const blendModes = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "colorDodge",
    "colorBurn",
    "hardLight",
    "softLight",
    "difference",
    "exclusion",
  ];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal overlay requires click handler for dismissal
    <div
      className="comparison-config-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="comparison-config-modal" role="dialog" aria-modal="true">
        <div className="comparison-config-modal-header">
          <h3>Comparison Configuration</h3>
          <button
            className="comparison-config-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="comparison-config-modal-body">
          <p className="comparison-config-description">
            Configure settings for document comparison mode
          </p>

          {/* Color configuration */}
          <div className="comparison-config-inputs">
            <div className="comparison-input-group">
              <label htmlFor="modalColorA">Document A:</label>
              <div className="comparison-input-wrapper">
                <input
                  type="color"
                  id="modalColorA"
                  value={colors.documentA}
                  onChange={(e) => onColorChange("documentA", e.target.value)}
                  className="comparison-color-input"
                />
                <span className="comparison-color-value">
                  {colors.documentA}
                </span>
              </div>
            </div>

            <div className="comparison-input-group">
              <label htmlFor="modalColorB">Document B:</label>
              <div className="comparison-input-wrapper">
                <input
                  type="color"
                  id="modalColorB"
                  value={colors.documentB}
                  onChange={(e) => onColorChange("documentB", e.target.value)}
                  className="comparison-color-input"
                />
                <span className="comparison-color-value">
                  {colors.documentB}
                </span>
              </div>
            </div>
          </div>

          {/* Blend Mode Selection */}
          <div className="comparison-config-section">
            <label
              className="comparison-config-label"
              htmlFor="blendModeSelect"
            >
              Blend Mode
            </label>
            <select
              id="blendModeSelect"
              value={blendMode}
              onChange={(e) => onBlendModeChange(e.target.value)}
              className="comparison-config-select"
            >
              {blendModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.charAt(0).toUpperCase() +
                    mode.slice(1).replace(/([A-Z])/g, " $1")}
                </option>
              ))}
            </select>
            <p className="comparison-config-hint">
              Choose how the documents blend when overlapped
            </p>
          </div>

          {/* Apply Button - only show when in comparison mode */}
          {isInComparisonMode && (
            <div className="comparison-config-actions">
              <button
                onClick={onApply}
                className="comparison-config-apply-button"
                type="button"
              >
                Apply
              </button>
              <button
                onClick={onClose}
                className="comparison-config-cancel-button"
                type="button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to convert hex to RGB
const hexToRgb = (hex: string) => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
};

const Viewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparisonConfig, setShowComparisonConfig] = useState(false);
  const [comparisonColors, setComparisonColors] = useState({
    documentA: "#FF0000",
    documentB: "#0000FF",
  });
  const [isInComparisonMode, setIsInComparisonMode] = useState(false);
  const [comparisonDocumentB, setComparisonDocumentB] = useState<File | null>(
    null,
  );
  const [blendMode, setBlendMode] = useState("normal");

  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerGlobal }).NutrientViewer;

    if (!container || !NutrientViewer) return;

    setIsLoading(true);
    setError(null);

    // Detect system theme preference
    const isDarkMode = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;

    NutrientViewer.load({
      container,
      document: "/documents/Drawing1.pdf",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      theme: isDarkMode
        ? NutrientViewer.Theme.DARK
        : NutrientViewer.Theme.LIGHT,
    })
      .then((instance) => {
        instanceRef.current = instance;
        setIsLoading(false);

        // Hide default toolbar
        instance.setViewState((viewState) =>
          viewState.set("showToolbar", false),
        );

        // Sync toolbar state with viewer state changes
        const modeToToolMap = createModeToToolMap(NutrientViewer);
        instance.addEventListener("viewState.change", (viewState) => {
          const currentMode = viewState.get("interactionMode");
          const toolId = modeToToolMap[String(currentMode)] || null;
          setActiveTool(toolId);
        });

        // Track comparison mode state
        instance.addEventListener("documentComparisonUI.start", () => {
          setIsInComparisonMode(true);
        });

        instance.addEventListener("documentComparisonUI.end", () => {
          setIsInComparisonMode(false);
        });
      })
      .catch((err: Error) => {
        console.error("Failed to load PDF:", err);
        setError("Failed to load PDF. Please try again.");
        setIsLoading(false);
      });

    return () => {
      if (container && NutrientViewer) {
        NutrientViewer.unload(container);
      }
    };
  }, []);

  const handleToolClick = (toolId: string) => {
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerGlobal }).NutrientViewer;
    if (NutrientViewer) {
      toggleTool(
        instanceRef.current,
        NutrientViewer,
        toolId,
        setActiveTool,
        activeTool,
      );
    }
  };

  const handleCompareDocuments = () => {
    const instance = instanceRef.current;
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerGlobal }).NutrientViewer;

    if (!instance || !NutrientViewer) return;

    if (isInComparisonMode) {
      // Exit comparison mode
      instance
        .setDocumentComparisonMode(null)
        .then(() => {
          console.log("Exited comparison mode");
        })
        .catch((err: Error) => {
          console.error("Failed to exit comparison mode:", err);
        });
    } else {
      // Enter comparison mode - trigger file input dialog
      fileInputRef.current?.click();
    }
  };

  const handleComparisonConfigClick = () => {
    setShowComparisonConfig(true);
  };

  const handleZoomIn = () => {
    const instance = instanceRef.current;
    if (instance) {
      instance.setViewState((viewState) => viewState.zoomIn());
    }
  };

  const handleZoomOut = () => {
    const instance = instanceRef.current;
    if (instance) {
      instance.setViewState((viewState) => viewState.zoomOut());
    }
  };

  const applyComparisonColors = async () => {
    const instance = instanceRef.current;
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerGlobal }).NutrientViewer;

    if (
      !instance ||
      !NutrientViewer ||
      !isInComparisonMode ||
      !comparisonDocumentB
    ) {
      console.log(
        "Cannot apply colors - not in comparison mode or missing document",
      );
      return;
    }

    // Create a fresh ArrayBuffer from the stored File object
    const arrayBuffer = await comparisonDocumentB.arrayBuffer();

    // Build comparison config with new colors
    const comparisonConfig: {
      documentA: { source: string };
      documentB: { source: ArrayBuffer };
      autoCompare: boolean;
      strokeColors?: Record<string, unknown>;
      blendMode?: string;
    } = {
      documentA: {
        source: NutrientViewer.DocumentComparisonSourceType.USE_OPEN_DOCUMENT,
      },
      documentB: {
        source: arrayBuffer,
      },
      autoCompare: true,
    };

    // Add stroke colors
    comparisonConfig.strokeColors = {};

    const colorA = hexToRgb(comparisonColors.documentA);
    if (colorA) {
      comparisonConfig.strokeColors.documentA = new NutrientViewer.Color(
        colorA,
      );
    }

    const colorB = hexToRgb(comparisonColors.documentB);
    if (colorB) {
      comparisonConfig.strokeColors.documentB = new NutrientViewer.Color(
        colorB,
      );
    }

    // Add blend mode
    comparisonConfig.blendMode = blendMode;

    await instance.setDocumentComparisonMode(null);
    // Re-apply comparison mode with new configuration
    await instance.setDocumentComparisonMode(comparisonConfig);
    console.log("Successfully applied comparison configuration");
    setShowComparisonConfig(false);
  };

  const handleColorChange = (document: string, color: string) => {
    setComparisonColors((prev) => ({
      ...prev,
      [document]: color,
    }));
  };

  const handleBlendModeChange = (mode: string) => {
    setBlendMode(mode);
  };

  const handleComparisonFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const instance = instanceRef.current;
    const NutrientViewer = (window as { NutrientViewer?: NutrientViewerGlobal }).NutrientViewer;

    if (!instance || !NutrientViewer) return;

    // Store the File object itself (not ArrayBuffer) for reuse
    setComparisonDocumentB(file);

    // Convert file to ArrayBuffer for immediate use
    const arrayBuffer = await file.arrayBuffer();

    // Build comparison config with the selected file
    const comparisonConfig: {
      documentA: { source: string };
      documentB: { source: ArrayBuffer };
      autoCompare: boolean;
      strokeColors?: Record<string, unknown>;
      blendMode?: string;
    } = {
      documentA: {
        source: NutrientViewer.DocumentComparisonSourceType.USE_OPEN_DOCUMENT,
      },
      documentB: {
        source: arrayBuffer,
      },
      autoCompare: true,
    };

    // Add stroke colors
    comparisonConfig.strokeColors = {};

    const colorA = hexToRgb(comparisonColors.documentA);
    if (colorA) {
      comparisonConfig.strokeColors.documentA = new NutrientViewer.Color(
        colorA,
      );
    }

    const colorB = hexToRgb(comparisonColors.documentB);
    if (colorB) {
      comparisonConfig.strokeColors.documentB = new NutrientViewer.Color(
        colorB,
      );
    }

    // Add blend mode
    comparisonConfig.blendMode = blendMode;

    // Set document comparison mode
    instance.setDocumentComparisonMode(comparisonConfig).catch((err: Error) => {
      console.error("Failed to enter comparison mode:", err);
      setComparisonDocumentB(null);
    });

    // Reset the file input for future selections
    event.target.value = "";
  };

  if (error) {
    return (
      <div className="pdf-viewer-error-container">
        <p className="pdf-viewer-error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="viewer-wrapper">
      {!isLoading && (
        <VerticalToolbar
          tools={TOOLS}
          activeTool={activeTool}
          onToolClick={handleToolClick}
          onCompareClick={handleCompareDocuments}
          onComparisonConfigClick={handleComparisonConfigClick}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          isInComparisonMode={isInComparisonMode}
        />
      )}
      <div className="pdf-viewer-container">
        <div ref={containerRef} className="pdf-viewer-content" />
        {isLoading && <div className="pdf-viewer-loading">Loading PDF...</div>}
      </div>
      {/* Hidden file input for document comparison */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleComparisonFileSelect}
        style={{ display: "none" }}
      />
      {/* Comparison Configuration Modal */}
      <ComparisonConfigModal
        show={showComparisonConfig}
        colors={comparisonColors}
        blendMode={blendMode}
        onColorChange={handleColorChange}
        onBlendModeChange={handleBlendModeChange}
        onClose={() => setShowComparisonConfig(false)}
        onApply={applyComparisonColors}
        isInComparisonMode={isInComparisonMode}
      />
    </div>
  );
};

export default Viewer;
