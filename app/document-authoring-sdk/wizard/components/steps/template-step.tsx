"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useWizard } from "../../context/wizard-context";
import StepNavigation from "../step-navigation";

const templates = [
  {
    id: "invoice",
    name: "Invoice Template",
    description: "Professional invoice template for businesses",
    preview: "/document-authoring-sdk/assets/invoice.png",
    category: "Business",
  },
  {
    id: "checklist",
    name: "Checklist Template",
    description: "Organized checklist for tasks and projects",
    preview: "/document-authoring-sdk/assets/checklist.png",
    category: "Productivity",
  },
  {
    id: "menu",
    name: "Menu Template",
    description: "Restaurant menu template with elegant design",
    preview: "/document-authoring-sdk/assets/menu.png",
    category: "Food & Beverage",
  },
];

export default function TemplateStep() {
  const { state, dispatch, nextStep, completeCurrentStep } = useWizard();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    state.template || "",
  );
  // Custom upload functionality - commented out
  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [isDragOver, setIsDragOver] = useState(false);
  // const [uploadError, setUploadError] = useState<string | null>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  console.log("🔄 TemplateStep render:", {
    stateTemplate: state.template,
    selectedTemplate,
    currentStep: state.currentStep,
  });

  // Add useEffect to sync local state with global state when navigating back
  React.useEffect(() => {
    console.log(
      "🔄 TemplateStep useEffect - syncing selectedTemplate with state.template:",
      state.template,
    );
    setSelectedTemplate(state.template || "");
  }, [state.template]);

  const handleTemplateSelect = (templateId: string) => {
    console.log("🎯 TemplateStep: User selected template:", templateId);
    console.log(
      "🎯 TemplateStep: Previous state.template was:",
      state.template,
    );
    setSelectedTemplate(templateId);
    dispatch({ type: "SET_TEMPLATE", payload: templateId });
    console.log("🎯 TemplateStep: Dispatched SET_TEMPLATE with:", templateId);
  };

  /* Custom upload handlers - COMMENTED OUT (upload functionality disabled)
  // File validation helper
  const validateFile = useCallback((file: File): string | null => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    // Check file type
    if (
      file.type !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'Please select a valid DOCX file';
    }

    return null;
  }, []);

  // Convert file to ArrayBuffer
  const readFileAsArrayBuffer = useCallback((file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        setSelectedFile(file);
        setSelectedTemplate('custom');
        dispatch({ type: 'SET_TEMPLATE', payload: 'custom' });
        dispatch({ type: 'SET_CUSTOM_TEMPLATE_BINARY', payload: arrayBuffer });
        console.log('🎯 TemplateStep: Custom template uploaded successfully');
      } catch (error) {
        console.error('Error reading file:', error);
        setUploadError('Failed to read the selected file');
      }
    },
    [dispatch, readFileAsArrayBuffer, validateFile]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle click to upload
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  END Custom upload handlers */

  const handleNext = () => {
    if (selectedTemplate) {
      completeCurrentStep();
      nextStep();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Choose Your Template
        </h2>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Select a template to get started with your document
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="relative group cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden w-full text-left bg-white dark:bg-[#2a2020]"
            style={{
              borderColor:
                selectedTemplate === template.id
                  ? "var(--digital-pollen)"
                  : "var(--warm-gray-400)",
              boxShadow:
                selectedTemplate === template.id
                  ? "var(--shadow-lg)"
                  : "var(--shadow-sm)",
            }}
            onClick={() => handleTemplateSelect(template.id)}
            aria-pressed={selectedTemplate === template.id}
            aria-label={`Select ${template.name} template. ${template.description}`}
          >
            {/* Preview Image */}
            <div
              className="aspect-[3/4] overflow-hidden"
              style={{ background: "var(--warm-gray-200)" }}
            >
              <Image
                src={template.preview}
                alt={template.name}
                width={300}
                height={400}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            {/* Template Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold flex-1 text-black dark:text-white">
                  {template.name}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-800)] text-black dark:text-white">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-black dark:text-[var(--warm-gray-400)]">
                {template.description}
              </p>
            </div>

            {/* Selection Indicator */}
            {selectedTemplate === template.id && (
              <div
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--digital-pollen)" }}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ color: "var(--white)" }}
                >
                  <title>Selected</title>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <StepNavigation canProceed={!!selectedTemplate} onNext={handleNext} />
    </div>
  );
}
