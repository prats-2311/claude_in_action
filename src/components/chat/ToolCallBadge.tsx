"use client";

import { Loader2, FilePlus, FilePen, FileSearch, Trash2, FolderInput } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, any>;
  state: string;
}

function getLabel(toolName: string, args: Record<string, any>): { icon: React.ReactNode; text: string } {
  const path = args?.path ?? "";

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return { icon: <FilePlus className="w-3.5 h-3.5" />, text: `Creating ${path}` };
      case "str_replace":
      case "insert":
        return { icon: <FilePen className="w-3.5 h-3.5" />, text: `Editing ${path}` };
      case "view":
        return { icon: <FileSearch className="w-3.5 h-3.5" />, text: `Reading ${path}` };
      default:
        return { icon: <FilePen className="w-3.5 h-3.5" />, text: `Editing ${path}` };
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "delete":
        return { icon: <Trash2 className="w-3.5 h-3.5" />, text: `Deleting ${path}` };
      case "rename":
        return { icon: <FolderInput className="w-3.5 h-3.5" />, text: `Renaming ${path} → ${args?.new_path ?? ""}` };
    }
  }

  return { icon: <FilePen className="w-3.5 h-3.5" />, text: toolName };
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const { icon, text } = getLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-600">{icon}</span>
      <span className="text-neutral-700 font-mono">{text}</span>
    </div>
  );
}
