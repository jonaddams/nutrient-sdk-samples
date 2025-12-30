import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatsPopup } from "../StatsPopup";
import styles from "../StatsPopup.module.css";

describe("StatsPopup", () => {
  const defaultProps = {
    isVisible: true,
    message: "Test message",
    onClose: vi.fn(),
  };

  it("should not render when isVisible is false", () => {
    const { container } = render(
      <StatsPopup {...defaultProps} isVisible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isVisible is true", () => {
    render(<StatsPopup {...defaultProps} />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("should display the provided message", () => {
    const message = "Operation completed successfully";
    render(<StatsPopup {...defaultProps} message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("should display success icon", () => {
    render(<StatsPopup {...defaultProps} />);
    expect(screen.getByTitle("Success")).toBeInTheDocument();
  });

  it("should call onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(<StatsPopup {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should render Close button", () => {
    render(<StatsPopup {...defaultProps} />);
    const closeButton = screen.getByText("Close");
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe("BUTTON");
  });

  it("should handle empty message", () => {
    render(<StatsPopup {...defaultProps} message="" />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("should handle multiline messages", () => {
    const message = "Line 1\nLine 2\nLine 3";
    render(<StatsPopup {...defaultProps} message={message} />);
    // Use a function matcher to handle multiline text
    expect(
      screen.getByText((_content, element) => {
        return element?.textContent === message;
      }),
    ).toBeInTheDocument();
  });

  it("should have correct structure when visible", () => {
    const { container } = render(<StatsPopup {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("should not call onClose on render", () => {
    const onClose = vi.fn();
    render(<StatsPopup {...defaultProps} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should only call onClose when button is explicitly clicked", () => {
    const onClose = vi.fn();
    render(<StatsPopup {...defaultProps} onClose={onClose} />);

    // Click something else first to ensure onClose isn't triggered
    const successText = screen.getByText("Success!");
    fireEvent.click(successText);
    expect(onClose).not.toHaveBeenCalled();

    // Now click the close button
    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should handle special characters in message", () => {
    const message = "Replaced 5 instances: 'hello' → 'world'";
    render(<StatsPopup {...defaultProps} message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("should have close button of type button", () => {
    render(<StatsPopup {...defaultProps} />);
    const closeButton = screen.getByText("Close");
    expect(closeButton.getAttribute("type")).toBe("button");
  });

  // CSS Module Tests
  describe("CSS Module Classes", () => {
    it("should apply popup class to main container", () => {
      const { container } = render(<StatsPopup {...defaultProps} />);
      const popup = container.querySelector(`.${styles.popup}`);
      expect(popup).toBeInTheDocument();
    });

    it("should apply closeButton class to close button", () => {
      render(<StatsPopup {...defaultProps} />);
      const closeButton = screen.getByText("Close");
      expect(closeButton).toHaveClass(styles.closeButton);
    });

    it("should apply header class to header element", () => {
      const { container } = render(<StatsPopup {...defaultProps} />);
      const header = container.querySelector(`.${styles.header}`);
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent("Success!");
    });

    it("should apply icon class to success icon", () => {
      const { container } = render(<StatsPopup {...defaultProps} />);
      const icon = container.querySelector(`.${styles.icon}`);
      expect(icon).toBeInTheDocument();
    });

    it("should apply message class to message element", () => {
      const { container } = render(<StatsPopup {...defaultProps} />);
      const message = container.querySelector(`.${styles.message}`);
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent("Test message");
    });
  });
});
