"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppTheme } from "@/app/web-sdk/_components/useAppTheme";
import {
  STUDENTS,
  USERS,
  buildInstantJSON,
  getUserById,
  mergeExportedAnnotations,
} from "./annotations";

// Initialize the annotation store from pre-seeded data eagerly (before first render)
const INITIAL_STORE = mergeExportedAnnotations(
  buildInstantJSON(STUDENTS.map((s) => s.id)),
  { alex: [], jordan: [], sam: [] },
);

const DOCUMENT = "/documents/solar-system-quiz.pdf";

// Toolbar limited to quiz-relevant annotation tools + navigation
const ALLOWED_TOOLBAR_ITEMS = [
  "pager",
  "zoom-out",
  "zoom-in",
  "zoom-mode",
  "spacer",
  "ink",
  "highlighter",
  "text",
  "note",
  "eraser",
];

export default function AnnotationPermissionsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const annotationStoreRef = useRef<Record<string, any[]>>({ ...INITIAL_STORE });
  const currentRoleRef = useRef("teacher");

  const [currentRole, setCurrentRole] = useState("teacher");
  const [visibleStudents, setVisibleStudents] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const appTheme = useAppTheme();

  // Keep ref in sync with state for use in callbacks
  currentRoleRef.current = currentRole;

  // Determine which annotations to show based on current role and visibility
  const getVisibleStudentIds = useCallback((): string[] => {
    if (currentRole === "teacher") {
      return Array.from(visibleStudents);
    }
    return [currentRole];
  }, [currentRole, visibleStudents]);

  // Save current annotations before switching
  const saveCurrentAnnotations = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance) return;

    try {
      const exported = await instance.exportInstantJSON();
      annotationStoreRef.current = mergeExportedAnnotations(
        exported as { annotations?: any[] },
        annotationStoreRef.current,
      );
    } catch (err) {
      console.error("Failed to export annotations:", err);
    }
  }, []);

  // Load viewer with current role's annotations and permissions
  const loadViewer = useCallback(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Unload existing instance and clear container
    try {
      NutrientViewer.unload(container);
    } catch {
      // Ignore if no instance
    }
    instanceRef.current = null;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const studentIds = getVisibleStudentIds();
    // Read from the live store (which includes session-created annotations)
    const annotations = studentIds.flatMap(
      (id) => annotationStoreRef.current[id] ?? [],
    );
    const instantJSON = {
      format: "https://pspdfkit.com/instant-json/v1" as const,
      annotations,
    };
    const roleRef = currentRole;

    setIsLoading(true);

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      theme:
        appTheme === "dark"
          ? NutrientViewer.Theme.DARK
          : NutrientViewer.Theme.LIGHT,
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) => ALLOWED_TOOLBAR_ITEMS.includes(item.type),
      ),
      instantJSON,
      isEditableAnnotation: (annotation: any) => {
        if (roleRef === "teacher") return true;
        return annotation.customData?.creatorName === roleRef;
      },
    })
      .then((instance: Instance) => {
        instanceRef.current = instance;
        setIsLoading(false);

        // Stamp new annotations with current user's identity
        const user = getUserById(roleRef);
        if (user) {
          instance.addEventListener(
            "annotations.create" as any,
            async (annotations: any) => {
              const list = annotations?.toArray ? annotations.toArray() : [];
              for (const ann of list) {
                if (!ann.customData?.creatorName) {
                  const updated = ann.set("customData", {
                    creatorName: user.id,
                    color: user.color,
                  });
                  try {
                    await instance.update(updated);
                  } catch {
                    // Ignore update errors
                  }
                }
              }
            },
          );
        }
      })
      .catch((error: Error) => {
        console.error("Failed to load viewer:", error);
        setIsLoading(false);
      });
  }, [currentRole, getVisibleStudentIds, appTheme]);

  // Load viewer on role/visibility/theme change
  useEffect(() => {
    loadViewer();

    return () => {
      const container = containerRef.current;
      if (container && window.NutrientViewer) {
        try {
          window.NutrientViewer.unload(container);
        } catch {
          // Ignore cleanup errors
        }
      }
      instanceRef.current = null;
    };
  }, [currentRole, visibleStudents, appTheme, loadViewer]);

  // Role switch handler — save current annotations first
  const handleRoleChange = async (newRole: string) => {
    await saveCurrentAnnotations();
    setCurrentRole(newRole);
  };

  // Toggle student visibility (teacher only)
  const toggleStudentVisibility = async (studentId: string) => {
    await saveCurrentAnnotations();
    setVisibleStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Build status bar text
  const getStatusText = (): string => {
    if (currentRole !== "teacher") {
      return "Can view & edit your own annotations";
    }

    const shown = STUDENTS.filter((s) => visibleStudents.has(s.id)).map((s) => s.name);
    const hidden = STUDENTS.filter((s) => !visibleStudents.has(s.id)).map((s) => s.name);

    let status = "Can view & edit all annotations";
    if (shown.length > 0) status += ` | Showing: ${shown.join(", ")}`;
    if (hidden.length > 0) status += ` | Hidden: ${hidden.join(", ")}`;
    if (shown.length === 0) status += " | All students hidden";
    return status;
  };

  const currentUser = getUserById(currentRole);

  return (
    <div className="flex flex-col h-full">
      {/* Control Bar */}
      <div
        className="flex items-center gap-4 px-4 py-2.5"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {/* Role Dropdown */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--ink-3)" }}
          >
            Viewing as:
          </span>
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium cursor-pointer focus:outline-none"
            style={{
              background: "var(--bg-elev)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
              borderLeftColor: currentUser?.color,
              borderLeftWidth: "3px",
            }}
          >
            {USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Student Visibility Toggles (teacher only) */}
        {currentRole === "teacher" && (
          <div className="flex items-center gap-2 ml-auto">
            {STUDENTS.map((student) => {
              const isVisible = visibleStudents.has(student.id);
              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => toggleStudentVisibility(student.id)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: isVisible
                      ? student.color
                      : `color-mix(in srgb, ${student.color} 14%, var(--bg-elev))`,
                    color: isVisible ? "#fff" : student.color,
                    border: `1.5px solid ${
                      isVisible
                        ? student.color
                        : `color-mix(in srgb, ${student.color} 45%, var(--bg-elev))`
                    }`,
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  <span>{isVisible ? "\u2713" : "\u2717"}</span>
                  <span>{student.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        className="px-4 py-1.5 text-xs"
        style={{
          color: "var(--ink-3)",
          background: "var(--bg-elev)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {getStatusText()}
      </div>

      {/* Viewer */}
      <div className="flex-1 relative">
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{
              background: "color-mix(in srgb, var(--bg) 60%, transparent)",
            }}
          >
            <div className="text-sm" style={{ color: "var(--ink-3)" }}>
              Switching role...
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
