import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Field } from "../Field";

test("renders label, control and helper text", () => {
  render(
    <Field
      label="Instructions"
      help="Applied on top of the schema."
      htmlFor="i1"
    >
      <textarea id="i1" />
    </Field>,
  );
  expect(screen.getByLabelText("Instructions")).toBeInTheDocument();
  expect(screen.getByText("Applied on top of the schema.")).toBeInTheDocument();
});

test("omits the helper element when no help is given", () => {
  const { container } = render(
    <Field label="Provider" htmlFor="p1">
      <select id="p1" />
    </Field>,
  );
  expect(container.querySelector(".hint")).toBeNull();
});
