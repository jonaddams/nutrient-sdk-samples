import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FindReplaceDialog } from "../FindReplaceDialog";
import styles from "../FindReplaceDialog.module.css";

describe("FindReplaceDialog", () => {
  const defaultProps = {
    isVisible: true,
    findText: "",
    replaceText: "",
    replacementResult: "",
    isProcessing: false,
    onFindTextChange: vi.fn(),
    onReplaceTextChange: vi.fn(),
    onReplaceAll: vi.fn(),
    onClose: vi.fn(),
  };

  it("should not render when isVisible is false", () => {
    const { container } = render(
      <FindReplaceDialog {...defaultProps} isVisible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isVisible is true", () => {
    render(<FindReplaceDialog {...defaultProps} />);
    expect(screen.getByText("Find & Replace")).toBeInTheDocument();
  });

  it("should display find and replace inputs", () => {
    render(<FindReplaceDialog {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Enter text to find"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter replacement text"),
    ).toBeInTheDocument();
  });

  it("should call onFindTextChange when find input changes", () => {
    const onFindTextChange = vi.fn();
    render(
      <FindReplaceDialog
        {...defaultProps}
        onFindTextChange={onFindTextChange}
      />,
    );

    const findInput = screen.getByPlaceholderText("Enter text to find");
    fireEvent.change(findInput, { target: { value: "search text" } });

    expect(onFindTextChange).toHaveBeenCalledWith("search text");
  });

  it("should call onReplaceTextChange when replace input changes", () => {
    const onReplaceTextChange = vi.fn();
    render(
      <FindReplaceDialog
        {...defaultProps}
        onReplaceTextChange={onReplaceTextChange}
      />,
    );

    const replaceInput = screen.getByPlaceholderText("Enter replacement text");
    fireEvent.change(replaceInput, { target: { value: "replace text" } });

    expect(onReplaceTextChange).toHaveBeenCalledWith("replace text");
  });

  it("should call onReplaceAll when Replace All button is clicked", () => {
    const onReplaceAll = vi.fn();
    render(
      <FindReplaceDialog
        {...defaultProps}
        findText="test"
        onReplaceAll={onReplaceAll}
      />,
    );

    const replaceButton = screen.getByText("Replace All");
    fireEvent.click(replaceButton);

    expect(onReplaceAll).toHaveBeenCalled();
  });

  it("should call onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(<FindReplaceDialog {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should disable Replace All button when findText is empty", () => {
    render(<FindReplaceDialog {...defaultProps} findText="" />);
    const replaceButton = screen.getByText("Replace All");
    expect(replaceButton).toBeDisabled();
  });

  it("should disable Replace All button when findText is only whitespace", () => {
    render(<FindReplaceDialog {...defaultProps} findText="   " />);
    const replaceButton = screen.getByText("Replace All");
    expect(replaceButton).toBeDisabled();
  });

  it("should enable Replace All button when findText is not empty", () => {
    render(<FindReplaceDialog {...defaultProps} findText="test" />);
    const replaceButton = screen.getByText("Replace All");
    expect(replaceButton).not.toBeDisabled();
  });

  it("should show Processing... when isProcessing is true", () => {
    render(
      <FindReplaceDialog
        {...defaultProps}
        isProcessing={true}
        findText="test"
      />,
    );
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should disable Replace All button when isProcessing", () => {
    render(
      <FindReplaceDialog
        {...defaultProps}
        isProcessing={true}
        findText="test"
      />,
    );
    const replaceButton = screen.getByText("Processing...");
    expect(replaceButton).toBeDisabled();
  });

  it("should display replacement result when provided", () => {
    render(
      <FindReplaceDialog
        {...defaultProps}
        replacementResult="Replaced 5 instances"
      />,
    );
    expect(screen.getByText("Replaced 5 instances")).toBeInTheDocument();
  });

  it("should not display replacement result when empty", () => {
    render(<FindReplaceDialog {...defaultProps} replacementResult="" />);
    expect(screen.queryByText(/Replaced/)).not.toBeInTheDocument();
  });

  it("should display controlled find text value", () => {
    render(<FindReplaceDialog {...defaultProps} findText="search query" />);
    const findInput = screen.getByPlaceholderText(
      "Enter text to find",
    ) as HTMLInputElement;
    expect(findInput.value).toBe("search query");
  });

  it("should display controlled replace text value", () => {
    render(<FindReplaceDialog {...defaultProps} replaceText="new text" />);
    const replaceInput = screen.getByPlaceholderText(
      "Enter replacement text",
    ) as HTMLInputElement;
    expect(replaceInput.value).toBe("new text");
  });

  // CSS Module Tests
  describe("CSS Module Classes", () => {
    it("should apply dialog class to main container", () => {
      const { container } = render(<FindReplaceDialog {...defaultProps} />);
      const dialog = container.querySelector(`.${styles.dialog}`);
      expect(dialog).toBeInTheDocument();
    });

    it("should apply input class to text inputs", () => {
      render(<FindReplaceDialog {...defaultProps} />);
      const findInput = screen.getByPlaceholderText("Enter text to find");
      const replaceInput = screen.getByPlaceholderText(
        "Enter replacement text",
      );
      expect(findInput).toHaveClass(styles.input);
      expect(replaceInput).toHaveClass(styles.input);
    });

    it("should apply button classes to buttons", () => {
      render(<FindReplaceDialog {...defaultProps} findText="test" />);
      const replaceButton = screen.getByText("Replace All");
      const closeButton = screen.getByText("Close");
      expect(replaceButton).toHaveClass(styles.button, styles.replaceButton);
      expect(closeButton).toHaveClass(styles.button, styles.closeButton);
    });

    it("should apply success class to success result message", () => {
      render(
        <FindReplaceDialog
          {...defaultProps}
          replacementResult="Success!"
          isError={false}
        />,
      );
      const resultMessage = screen.getByText("Success!");
      expect(resultMessage).toHaveClass(styles.resultMessage, styles.success);
      expect(resultMessage).not.toHaveClass(styles.error);
    });

    it("should apply error class to error result message", () => {
      render(
        <FindReplaceDialog
          {...defaultProps}
          replacementResult="Error occurred"
          isError={true}
        />,
      );
      const resultMessage = screen.getByText("Error occurred");
      expect(resultMessage).toHaveClass(styles.resultMessage, styles.error);
      expect(resultMessage).not.toHaveClass(styles.success);
    });

    it("should apply title class to dialog title", () => {
      render(<FindReplaceDialog {...defaultProps} />);
      const title = screen.getByText("Find & Replace");
      expect(title).toHaveClass(styles.title);
    });

    it("should apply label class to input labels", () => {
      const { container } = render(<FindReplaceDialog {...defaultProps} />);
      const labels = container.querySelectorAll(`.${styles.label}`);
      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveTextContent("Find:");
      expect(labels[1]).toHaveTextContent("Replace with:");
    });
  });

  // Error Scenario Tests
  describe("Error Scenarios", () => {
    it("should handle error result with isError prop", () => {
      render(
        <FindReplaceDialog
          {...defaultProps}
          replacementResult="Operation failed: invalid input"
          isError={true}
        />,
      );
      const errorMessage = screen.getByText(/operation failed/i);
      expect(errorMessage).toHaveClass(styles.error);
      expect(errorMessage).toHaveAttribute("role", "alert");
    });

    it("should handle success result", () => {
      render(
        <FindReplaceDialog
          {...defaultProps}
          replacementResult="Successfully replaced 5 instances"
          isError={false}
        />,
      );
      const successMessage = screen.getByText(/successfully replaced/i);
      expect(successMessage).toHaveClass(styles.success);
      expect(successMessage).toHaveAttribute("role", "status");
    });

    it("should disable replace button during processing", () => {
      render(
        <FindReplaceDialog
          {...defaultProps}
          isProcessing={true}
          findText="test"
        />,
      );
      const button = screen.getByText("Processing...");
      expect(button).toBeDisabled();
    });

    it("should disable replace button when find text is empty", () => {
      render(<FindReplaceDialog {...defaultProps} findText="" />);
      const button = screen.getByText("Replace All");
      expect(button).toBeDisabled();
    });

    it("should handle rapid open/close cycles", () => {
      const { rerender } = render(
        <FindReplaceDialog {...defaultProps} isVisible={true} />,
      );
      expect(screen.getByText("Find & Replace")).toBeInTheDocument();

      rerender(<FindReplaceDialog {...defaultProps} isVisible={false} />);
      expect(screen.queryByText("Find & Replace")).not.toBeInTheDocument();

      rerender(<FindReplaceDialog {...defaultProps} isVisible={true} />);
      expect(screen.getByText("Find & Replace")).toBeInTheDocument();
    });

    it("should handle empty replacement result gracefully", () => {
      const { container } = render(
        <FindReplaceDialog {...defaultProps} replacementResult="" />,
      );
      const resultMessages = container.querySelectorAll(
        `.${styles.resultMessage}`,
      );
      expect(resultMessages).toHaveLength(0);
    });
  });
});
