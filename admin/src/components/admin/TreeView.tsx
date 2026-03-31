"use client";

import { useMemo, useState } from "react";
import DropdownMenu from "@/components/admin/DropdownMenu";

export type TreeNode = {
  id: string;
  label: string;
  type: "category" | "subcategory" | "secondary";
  parentId?: string;
  children?: TreeNode[];
};

type TreeViewProps = {
  nodes: TreeNode[];
  onAdd: (node: TreeNode) => void;
  onEdit: (node: TreeNode, nextLabel: string) => Promise<void> | void;
  onDelete: (node: TreeNode) => Promise<void> | void;
};

type NodeRowProps = {
  node: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  toggleNode: (id: string) => void;
  onAdd: (node: TreeNode) => void;
  onEdit: (node: TreeNode, nextLabel: string) => Promise<void> | void;
  onDelete: (node: TreeNode) => Promise<void> | void;
};

function NodeRow({ node, depth, expandedIds, toggleNode, onAdd, onEdit, onDelete }: NodeRowProps) {
  const [editing, setEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(node.label);

  const hasChildren = Boolean(node.children && node.children.length > 0);
  const expanded = expandedIds.has(node.id);

  const toneByType: Record<TreeNode["type"], string> = {
    category: "bg-blue-50 text-blue-700 border-blue-200",
    subcategory: "bg-emerald-50 text-emerald-700 border-emerald-200",
    secondary: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-1">
      <div
        className="group flex items-center justify-between rounded-lg border border-(--border) bg-(--surface) px-2 py-1.5"
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (hasChildren) toggleNode(node.id);
            }}
            className="w-4 text-left text-xs text-(--text-soft)"
          >
            {hasChildren ? (expanded ? "▾" : "▸") : "•"}
          </button>

          {editing ? (
            <input
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              onBlur={() => {
                setEditing(false);
                if (labelInput.trim() && labelInput.trim() !== node.label) {
                  void onEdit(node, labelInput.trim());
                }
              }}
              className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-sm text-(--text-strong) outline-none"
              autoFocus
            />
          ) : (
            <p className="truncate text-sm text-(--text-strong)">{node.label}</p>
          )}

          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneByType[node.type]}`}>
            {node.type}
          </span>
        </div>

        <DropdownMenu
          trigger={
            <span className="rounded-md px-1.5 py-0.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)">•••</span>
          }
          actions={[
            {
              id: "add",
              label: "Add",
              onClick: () => onAdd(node),
            },
            {
              id: "edit",
              label: "Inline Edit",
              onClick: () => {
                setLabelInput(node.label);
                setEditing(true);
              },
            },
            {
              id: "delete",
              label: "Delete",
              onClick: () => {
                void onDelete(node);
              },
              destructive: true,
            },
          ]}
        />
      </div>

      {hasChildren && expanded
        ? node.children!.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleNode={toggleNode}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

function collectAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const stack = [...nodes];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    ids.push(current.id);
    if (current.children?.length) {
      stack.push(...current.children);
    }
  }

  return ids;
}

export default function TreeView({ nodes, onAdd, onEdit, onDelete }: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(collectAllNodeIds(nodes)));

  const allNodeIds = useMemo(() => collectAllNodeIds(nodes), [nodes]);

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--text-strong)">Category Explorer</h3>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setExpandedIds(new Set(allNodeIds))}
            className="rounded-md border border-(--border) px-2 py-1 text-(--text-soft) hover:bg-(--surface-hover)"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            className="rounded-md border border-(--border) px-2 py-1 text-(--text-soft) hover:bg-(--surface-hover)"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            toggleNode={toggleNode}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
