"use client";

import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type TreeNode = {
  id: string;
  label: string;
  type: "category" | "subcategory" | "secondary";
  parentId?: string;
  categoryId?: string;
  parentSubcategoryId?: string;
  sortOrder?: number;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: TreeNode[];
};

type TreeViewProps = {
  nodes: TreeNode[];
  onAdd: (node: TreeNode) => void;
  onEdit: (node: TreeNode, nextLabel: string) => Promise<void> | void;
  onDelete: (node: TreeNode) => Promise<void> | void;
  onInlineCreate?: (parent: TreeNode | null, label: string) => Promise<void> | void;
  onMove?: (source: TreeNode, target: TreeNode) => Promise<void> | void;
};

type TreeRowProps = {
  node: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  matchedNodeIds: Set<string>;
  searchText: string;
  editingNodeId: string | null;
  editDraft: string;
  composerTargetId: string | null;
  composerDraft: string;
  draggingNodeId: string | null;
  pendingNodeId: string | null;
  dragEnabled: boolean;
  onToggleNode: (id: string) => void;
  onStartEdit: (node: TreeNode) => void;
  onEditDraftChange: (value: string) => void;
  onCommitEdit: (node: TreeNode) => void;
  onCancelEdit: () => void;
  onRequestAdd: (node: TreeNode) => void;
  onComposerDraftChange: (value: string) => void;
  onCommitComposer: (parent: TreeNode) => void;
  onCancelComposer: () => void;
  onDeleteNode: (node: TreeNode) => void;
  renderChildren: (children: TreeNode[], depth: number) => ReactNode;
};

type InlineComposerProps = {
  value: string;
  busy: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

type SearchFilterResult = {
  filteredNodes: TreeNode[];
  matchedNodeIds: Set<string>;
  autoExpandedIds: Set<string>;
};

const ROOT_COMPOSER_ID = "__root__";
const EMPTY_NODE_SET = new Set<string>();

function parseDndNodeId(value: unknown, prefix: "drag" | "drop") {
  if (typeof value !== "string") return null;
  const token = `${prefix}::`;
  if (!value.startsWith(token)) return null;
  return value.slice(token.length);
}

function getDepthTone(depth: number) {
  const hue = (208 + depth * 33) % 360;
  return `hsl(${hue} 78% 45%)`;
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

function filterNodesBySearch(nodes: TreeNode[], searchText: string): SearchFilterResult {
  const trimmed = searchText.trim().toLowerCase();
  if (!trimmed) {
    return {
      filteredNodes: nodes,
      matchedNodeIds: new Set<string>(),
      autoExpandedIds: new Set<string>(),
    };
  }

  const matchedNodeIds = new Set<string>();
  const autoExpandedIds = new Set<string>();

  const visit = (node: TreeNode, ancestors: string[]): TreeNode | null => {
    const labelMatch = node.label.toLowerCase().includes(trimmed);

    if (labelMatch) {
      matchedNodeIds.add(node.id);
      for (const ancestorId of ancestors) {
        autoExpandedIds.add(ancestorId);
      }
      autoExpandedIds.add(node.id);
      return node;
    }

    const nextChildren: TreeNode[] = [];
    for (const child of node.children ?? []) {
      const filteredChild = visit(child, [...ancestors, node.id]);
      if (filteredChild) {
        nextChildren.push(filteredChild);
      }
    }

    if (nextChildren.length === 0) {
      return null;
    }

    autoExpandedIds.add(node.id);
    return {
      ...node,
      children: nextChildren,
    };
  };

  const filteredNodes: TreeNode[] = [];
  for (const node of nodes) {
    const filtered = visit(node, []);
    if (filtered) filteredNodes.push(filtered);
  }

  return {
    filteredNodes,
    matchedNodeIds,
    autoExpandedIds,
  };
}

function renderLabelWithHighlight(label: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return label;

  const source = label.toLowerCase();
  const search = trimmed.toLowerCase();
  const start = source.indexOf(search);
  if (start < 0) return label;

  const end = start + trimmed.length;

  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded bg-amber-100 px-1 text-amber-900">{label.slice(start, end)}</mark>
      {label.slice(end)}
    </>
  );
}

function createNodeIndexes(nodes: TreeNode[]) {
  const nodeById = new Map<string, TreeNode>();

  const walk = (items: TreeNode[]) => {
    for (const item of items) {
      nodeById.set(item.id, item);
      if (item.children?.length) {
        walk(item.children);
      }
    }
  };

  walk(nodes);
  return { nodeById };
}

function InlineComposer({ value, busy, placeholder, onChange, onCommit, onCancel }: InlineComposerProps) {
  return (
    <div className="mt-2 rounded-lg border border-(--border) bg-(--surface-muted) p-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="w-full rounded-md border border-(--border) bg-(--surface) px-2 py-1.5 text-sm text-(--text-strong) outline-none focus:border-(--accent)"
        placeholder={placeholder}
        autoFocus
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onCommit}
          disabled={busy}
          className="rounded-md bg-(--accent) px-2 py-1 text-xs font-medium text-white disabled:opacity-65"
        >
          {busy ? "Saving" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-(--border) px-2 py-1 text-xs text-(--text-soft)"
        >
          Cancel
        </button>
        <span className="text-[11px] text-(--text-soft)">Press Enter to save, Escape to cancel</span>
      </div>
    </div>
  );
}

const TreeNodeRow = memo(function TreeNodeRow({
  node,
  depth,
  expandedIds,
  matchedNodeIds,
  searchText,
  editingNodeId,
  editDraft,
  composerTargetId,
  composerDraft,
  draggingNodeId,
  pendingNodeId,
  dragEnabled,
  onToggleNode,
  onStartEdit,
  onEditDraftChange,
  onCommitEdit,
  onCancelEdit,
  onRequestAdd,
  onComposerDraftChange,
  onCommitComposer,
  onCancelComposer,
  onDeleteNode,
  renderChildren,
}: TreeRowProps) {
  const hasChildren = Boolean(node.children?.length);
  const expanded = expandedIds.has(node.id);
  const isEditing = editingNodeId === node.id;
  const showComposer = composerTargetId === node.id;
  const isMatched = matchedNodeIds.has(node.id);
  const isBusy = pendingNodeId === node.id;
  const depthTone = getDepthTone(depth);

  const draggableId = `drag::${node.id}`;
  const droppableId = `drop::${node.id}`;
  const canDrag = dragEnabled && node.type !== "secondary";

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled: !canDrag,
    data: {
      nodeId: node.id,
    },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: droppableId,
    data: {
      nodeId: node.id,
    },
  });

  const setCombinedRef = useCallback(
    (element: HTMLDivElement | null) => {
      setDragRef(element);
      setDropRef(element);
    },
    [setDragRef, setDropRef]
  );

  const dragStyle: CSSProperties = {};
  if (transform) {
    dragStyle.transform = `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
  }

  if (isDragging) {
    dragStyle.opacity = 0.55;
    dragStyle.zIndex = 20;
  }

  const typePillClass: Record<TreeNode["type"], string> = {
    category: "border-sky-200 bg-sky-50 text-sky-700",
    subcategory: "border-slate-200 bg-slate-100 text-slate-700",
    secondary: "border-amber-200 bg-amber-50 text-amber-700",
  };

  const relationshipLabel =
    node.type === "category" ? "category" : node.type === "secondary" ? "secondary" : `child L${depth}`;

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return;

    if (event.key === "ArrowRight" && hasChildren && !expanded) {
      event.preventDefault();
      onToggleNode(node.id);
      return;
    }

    if (event.key === "ArrowLeft" && hasChildren && expanded) {
      event.preventDefault();
      onToggleNode(node.id);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (hasChildren) {
        onToggleNode(node.id);
      }
      return;
    }

    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      onStartEdit(node);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      onDeleteNode(node);
    }
  };

  return (
    <div className="space-y-1" role="none">
      <div
        ref={setCombinedRef}
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        onKeyDown={onRowKeyDown}
        onClick={() => {
          if (isEditing) return;
          if (hasChildren) {
            onToggleNode(node.id);
          }
        }}
        style={{
          marginLeft: depth * 8,
          ...dragStyle,
        }}
        className={`group relative flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--surface) px-2.5 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border)
          hover:scale-[1.006] hover:bg-(--surface-hover) hover:shadow-[0_3px_10px_rgba(15,23,42,0.08)]
          ${isOver && draggingNodeId && draggingNodeId !== node.id ? "ring-2 ring-slate-300" : ""}`}
      >
        <span
          className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-sm"
          style={{ backgroundColor: depthTone }}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) onToggleNode(node.id);
            }}
            className="h-7 w-7 rounded-md border border-(--border) text-sm font-semibold text-(--text-soft) hover:bg-(--surface-hover)"
            aria-label={hasChildren ? (expanded ? "Collapse branch" : "Expand branch") : "Leaf node"}
          >
            {hasChildren ? (expanded ? "-" : "+") : "."}
          </button>

          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: depthTone }} aria-hidden="true" />

          {isEditing ? (
            <input
              value={editDraft}
              onChange={(event) => onEditDraftChange(event.target.value)}
              onBlur={() => onCommitEdit(node)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCommitEdit(node);
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEdit();
                }
              }}
              className="w-full max-w-md rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-sm text-(--text-strong) outline-none focus:border-(--accent)"
              autoFocus
            />
          ) : (
            <p className="truncate text-sm font-medium text-(--text-strong)">
              {renderLabelWithHighlight(node.label, searchText)}
            </p>
          )}

          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] ${typePillClass[node.type]}`}
          >
            {relationshipLabel}
          </span>

          {isMatched ? (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              match
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRequestAdd(node);
            }}
            disabled={node.type === "secondary" || isBusy}
            className="h-8 w-8 rounded-md border border-(--border) text-sm font-bold text-(--text-soft) hover:bg-(--surface-hover) disabled:opacity-40"
            aria-label="Add child"
            title="Add child"
          >
            +
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit(node);
            }}
            disabled={isBusy}
            className="h-8 w-8 rounded-md border border-(--border) text-sm font-bold text-(--text-soft) hover:bg-(--surface-hover) disabled:opacity-40"
            aria-label="Rename node"
            title="Rename"
          >
            <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-4 w-4" aria-hidden="true">
              <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteNode(node);
            }}
            disabled={isBusy}
            className="h-8 w-8 rounded-md border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            aria-label="Delete node"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-4 w-4" aria-hidden="true">
              <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            disabled={!canDrag || isBusy}
            className="h-8 w-8 cursor-grab rounded-md border border-(--border) text-sm font-bold text-(--text-soft) active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Drag and move node"
            title="Drag"
            {...attributes}
            {...listeners}
          >
            ::
          </button>
        </div>

        {isBusy ? (
          <span className="absolute -bottom-2 right-2 rounded-md border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] text-(--text-soft)">
            syncing
          </span>
        ) : null}
      </div>

      {showComposer ? (
        <div style={{ marginLeft: depth * 8 + 26 }}>
          <InlineComposer
            value={composerDraft}
            onChange={onComposerDraftChange}
            onCommit={() => onCommitComposer(node)}
            onCancel={onCancelComposer}
            placeholder={node.type === "category" ? "Add subcategory" : "Add child subcategory"}
            busy={pendingNodeId === node.id}
          />
        </div>
      ) : null}

      {hasChildren && expanded ? (
        <div className="ml-4 border-l border-dashed border-(--border) pl-2" role="group">
          {renderChildren(node.children || [], depth + 1)}
        </div>
      ) : null}
    </div>
  );
});

export default function TreeView({ nodes, onAdd, onEdit, onDelete, onInlineCreate, onMove }: TreeViewProps) {
  const [searchText, setSearchText] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(nodes.map((node) => node.id)));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [composerTargetId, setComposerTargetId] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const { nodeById } = useMemo(() => createNodeIndexes(nodes), [nodes]);
  const allNodeIds = useMemo(() => collectAllNodeIds(nodes), [nodes]);

  const searchResult = useMemo(() => filterNodesBySearch(nodes, searchText), [nodes, searchText]);
  const isSearching = searchText.trim().length > 0;

  const displayNodes = isSearching ? searchResult.filteredNodes : nodes;
  const matchedNodeIds = useMemo(
    () => (isSearching ? searchResult.matchedNodeIds : EMPTY_NODE_SET),
    [isSearching, searchResult.matchedNodeIds]
  );
  const autoExpandedIds = useMemo(
    () => (isSearching ? searchResult.autoExpandedIds : EMPTY_NODE_SET),
    [isSearching, searchResult.autoExpandedIds]
  );

  const sanitizedExpandedIds = useMemo(() => {
    const validIds = new Set<string>();
    for (const id of expandedIds) {
      if (nodeById.has(id)) {
        validIds.add(id);
      }
    }

    if (validIds.size === 0 && nodes.length > 0) {
      for (const topNode of nodes) {
        validIds.add(topNode.id);
      }
    }

    return validIds;
  }, [expandedIds, nodeById, nodes]);

  const effectiveExpandedIds = useMemo(() => {
    if (!isSearching) return sanitizedExpandedIds;
    return new Set([...sanitizedExpandedIds, ...autoExpandedIds]);
  }, [autoExpandedIds, isSearching, sanitizedExpandedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const toggleNode = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((node: TreeNode) => {
    setEditingNodeId(node.id);
    setEditDraft(node.label);
    setComposerTargetId(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
    setEditDraft("");
  }, []);

  const handleCommitEdit = useCallback(
    (node: TreeNode) => {
      if (editingNodeId !== node.id) return;

      const nextLabel = editDraft.trim();
      setEditingNodeId(null);
      setEditDraft("");

      if (!nextLabel || nextLabel === node.label) {
        return;
      }

      setPendingNodeId(node.id);
      void Promise.resolve(onEdit(node, nextLabel)).finally(() => {
        setPendingNodeId((current) => (current === node.id ? null : current));
      });
    },
    [editDraft, editingNodeId, onEdit]
  );

  const handleOpenComposer = useCallback((parentNodeId: string) => {
    setComposerTargetId(parentNodeId);
    setComposerDraft("");
    setEditingNodeId(null);
  }, []);

  const handleCancelComposer = useCallback(() => {
    setComposerTargetId(null);
    setComposerDraft("");
  }, []);

  const handleRequestAdd = useCallback(
    (node: TreeNode) => {
      if (onInlineCreate) {
        handleOpenComposer(node.id);
        return;
      }

      onAdd(node);
    },
    [handleOpenComposer, onAdd, onInlineCreate]
  );

  const handleCommitComposer = useCallback(
    (parent: TreeNode | null) => {
      const trimmedLabel = composerDraft.trim();
      if (!trimmedLabel) return;

      if (!onInlineCreate) {
        if (parent) onAdd(parent);
        setComposerTargetId(null);
        setComposerDraft("");
        return;
      }

      const pendingId = parent?.id || ROOT_COMPOSER_ID;
      setPendingNodeId(pendingId);

      void Promise.resolve(onInlineCreate(parent, trimmedLabel)).finally(() => {
        setPendingNodeId((current) => (current === pendingId ? null : current));
      });

      setComposerTargetId(null);
      setComposerDraft("");
    },
    [composerDraft, onAdd, onInlineCreate]
  );

  const handleDeleteNode = useCallback(
    (node: TreeNode) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`Delete \"${node.label}\" and all nested children?`);
        if (!confirmed) return;
      }

      setPendingNodeId(node.id);
      void Promise.resolve(onDelete(node)).finally(() => {
        setPendingNodeId((current) => (current === node.id ? null : current));
      });
    },
    [onDelete]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setComposerTargetId(null);
    setEditingNodeId(null);
    setEditDraft("");
    setDraggingNodeId(parseDndNodeId(event.active.id, "drag"));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingNodeId(null);
      if (!onMove) return;

      const sourceId = parseDndNodeId(event.active.id, "drag");
      const targetId = parseDndNodeId(event.over?.id, "drop");

      if (!sourceId || !targetId || sourceId === targetId) return;

      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);
      if (!sourceNode || !targetNode) return;

      setPendingNodeId(sourceNode.id);
      void Promise.resolve(onMove(sourceNode, targetNode)).finally(() => {
        setPendingNodeId((current) => (current === sourceNode.id ? null : current));
      });
    },
    [nodeById, onMove]
  );

  const renderChildren = (branchNodes: TreeNode[], depth: number): ReactNode =>
    branchNodes.map((branchNode) => (
      <TreeNodeRow
        key={branchNode.id}
        node={branchNode}
        depth={depth}
        expandedIds={effectiveExpandedIds}
        matchedNodeIds={matchedNodeIds}
        searchText={searchText}
        editingNodeId={editingNodeId}
        editDraft={editDraft}
        composerTargetId={composerTargetId}
        composerDraft={composerDraft}
        draggingNodeId={draggingNodeId}
        pendingNodeId={pendingNodeId}
        dragEnabled={Boolean(onMove)}
        onToggleNode={toggleNode}
        onStartEdit={handleStartEdit}
        onEditDraftChange={setEditDraft}
        onCommitEdit={handleCommitEdit}
        onCancelEdit={handleCancelEdit}
        onRequestAdd={handleRequestAdd}
        onComposerDraftChange={setComposerDraft}
        onCommitComposer={handleCommitComposer}
        onCancelComposer={handleCancelComposer}
        onDeleteNode={handleDeleteNode}
        renderChildren={renderChildren}
      />
    ));

  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-(--text-strong)">Category Explorer Tree</h3>
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
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search and highlight categories"
          className="min-w-[220px] flex-1 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
        />

        {isSearching ? (
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="rounded-md border border-(--border) px-2 py-1 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
          >
            Clear
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setComposerTargetId(ROOT_COMPOSER_ID);
            setComposerDraft("");
            setEditingNodeId(null);
          }}
          className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
        >
          Inline root add
        </button>
      </div>

      {composerTargetId === ROOT_COMPOSER_ID ? (
        <InlineComposer
          value={composerDraft}
          onChange={setComposerDraft}
          onCommit={() => handleCommitComposer(null)}
          onCancel={handleCancelComposer}
          placeholder="Add category"
          busy={pendingNodeId === ROOT_COMPOSER_ID}
        />
      ) : null}

      {isSearching && displayNodes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No matching nodes found.
        </p>
      ) : null}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div role="tree" className="custom-scrollbar mt-3 max-h-[72vh] space-y-1 overflow-auto pr-1">
          {renderChildren(displayNodes, 0)}
        </div>
      </DndContext>
    </section>
  );
}
