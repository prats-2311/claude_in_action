import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

describe("ToolCallBadge", () => {
  describe("str_replace_editor", () => {
    it("shows 'Creating' for create command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/App.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    });

    it("shows 'Editing' for str_replace command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "str_replace", path: "/Card.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
    });

    it("shows 'Editing' for insert command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "insert", path: "/Card.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
    });

    it("shows 'Reading' for view command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "view", path: "/App.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Reading /App.jsx")).toBeDefined();
    });
  });

  describe("file_manager", () => {
    it("shows 'Deleting' for delete command", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          args={{ command: "delete", path: "/OldFile.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Deleting /OldFile.jsx")).toBeDefined();
    });

    it("shows 'Renaming' with both paths for rename command", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          args={{ command: "rename", path: "/Old.jsx", new_path: "/New.jsx" }}
          state="call"
        />
      );
      expect(screen.getByText("Renaming /Old.jsx → /New.jsx")).toBeDefined();
    });
  });

  describe("state indicator", () => {
    it("shows spinner when state is 'call'", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/App.jsx" }}
          state="call"
        />
      );
      expect(container.querySelector(".animate-spin")).toBeDefined();
    });

    it("shows green dot when state is 'result'", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/App.jsx" }}
          state="result"
        />
      );
      expect(container.querySelector(".bg-emerald-500")).toBeDefined();
      expect(container.querySelector(".animate-spin")).toBeNull();
    });
  });
});
