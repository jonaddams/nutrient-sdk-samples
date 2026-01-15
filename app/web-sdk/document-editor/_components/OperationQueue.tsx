"use client";

interface QueuedOperation {
  id: string;
  type: "delete" | "rotate" | "duplicate" | "move";
  timestamp: number;
  description: string;
  sourceDoc: "source" | "target";
  targetDoc?: "source" | "target";
  pageIndexes: number[];
  rotation?: 90 | 180 | 270;
  targetPosition?: number;
}

interface OperationQueueProps {
  operations: QueuedOperation[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onApply: () => void;
}

export default function OperationQueue({
  operations,
  onRemove,
  onClear,
  onApply,
}: OperationQueueProps) {
  const getOperationIcon = (type: string) => {
    switch (type) {
      case "delete":
        return "🗑️";
      case "rotate":
        return "↻";
      case "duplicate":
        return "📋";
      case "move":
        return "↕️";
      default:
        return "•";
    }
  };

  return (
    <div
      className="border-t"
      style={{
        backgroundColor: "var(--white)",
        borderColor: "var(--warm-gray-400)",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Operation Queue
            </h3>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor:
                  operations.length > 0
                    ? "var(--disc-pink)"
                    : "var(--warm-gray-200)",
                color:
                  operations.length > 0 ? "var(--white)" : "var(--neutral)",
              }}
            >
              {operations.length}
            </span>
          </div>
          <div className="flex gap-2">
            {operations.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onClear}
                  className="btn btn-secondary text-sm"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={onApply}
                  className="btn btn-primary text-sm"
                >
                  Apply Operations
                </button>
              </>
            )}
          </div>
        </div>

        {operations.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--neutral)" }}>
            No operations queued. Right-click or use the menu on any page
            thumbnail to add operations.
          </p>
        ) : (
          <div className="space-y-1">
            {operations.map((op, index) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  backgroundColor: "var(--warm-gray-100)",
                  border: "1px solid var(--warm-gray-400)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{getOperationIcon(op.type)}</span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {index + 1}. {op.description}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(op.id)}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  style={{ color: "var(--code-coral)" }}
                  title="Remove operation"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
