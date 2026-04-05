"use client";

import {
  useCallback,
  useMemo,
  useState,
  type DragEvent,
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

type ReorderUpdate = {
  node: TreeNode;
  sortOrder: number;
};

type TreeViewProps = {
  nodes: TreeNode[];
  onAdd: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onReorder?: (updates: ReorderUpdate[]) => Promise<void> | void;
};

type TreeRowProps = {
  node: TreeNode;
  depth: number;
  siblingGroupKey: string;
  siblingNodes: TreeNode[];
  expandedIds: Set<string>;
  matchedNodeIds: Set<string>;
  searchText: string;
  draggingNodeId: string | null;
  draggingGroupKey: string | null;
  dropTargetNodeId: string | null;
  pendingGroupKey: string | null;
  onToggleNode: (id: string) => void;
  onRequestAdd: (node: TreeNode) => void;
  onRequestEdit: (node: TreeNode) => void;
  onRequestDelete: (node: TreeNode) => void;
  onDragStartNode: (event: DragEvent<HTMLButtonElement>, node: TreeNode, groupKey: string) => void;
  onDragOverNode: (event: DragEvent<HTMLDivElement>, node: TreeNode, groupKey: string) => void;
  onDropNode: (event: DragEvent<HTMLDivElement>, node: TreeNode, siblingNodes: TreeNode[], groupKey: string) => void;
  onDragEndNode: () => void;
  renderChildren: (children: TreeNode[], depth: number, groupKey: string) => ReactNode;
};

type SearchFilterResult = {
  filteredNodes: TreeNode[];
  matchedNodeIds: Set<string>;
  autoExpandedIds: Set<string>;
};

const ROOT_GROUP_KEY = "__root__";
const SORT_STEP = 10;
const EMPTY_NODE_SET = new Set<string>();

function getDepthTone(depth: number) {
  const hue = (208 + depth * 33) % 360;
  return `hsl(${hue} 78% 45%)`;
}

function normalizeSortOrder(value?: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
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

function createNodeIndex(nodes: TreeNode[]) {
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
  return nodeById;
}

function TreeNodeRow({
  node,
  depth,
  siblingGroupKey,
  siblingNodes,
  expandedIds,
  matchedNodeIds,
  searchText,
  draggingNodeId,
  draggingGroupKey,
  dropTargetNodeId,
  pendingGroupKey,
  onToggleNode,
  onRequestAdd,
  onRequestEdit,
  onRequestDelete,
  onDragStartNode,
  onDragOverNode,
  onDropNode,
  onDragEndNode,
  renderChildren,
}: TreeRowProps) {
  const hasChildren = Boolean(node.children?.length);
  const expanded = expandedIds.has(node.id);
  const isMatched = matchedNodeIds.has(node.id);
  const depthTone = getDepthTone(depth);
  const groupBusy = pendingGroupKey === siblingGroupKey;
  const showDropTarget =
    dropTargetNodeId === node.id && draggingNodeId !== node.id && draggingGroupKey === siblingGroupKey;

  const typePillClass: Record<TreeNode["type"], string> = {
    category: "border-sky-200 bg-sky-50 text-sky-700",
    subcategory: "border-slate-200 bg-slate-100 text-slate-700",
    secondary: "border-amber-200 bg-amber-50 text-amber-700",
  };

  const relationshipLabel =
    node.type === "category" ? "category" : node.type === "secondary" ? "secondary" : `child L${depth}`;

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      onRequestEdit(node);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      onRequestDelete(node);
    }
  };

  return (
    <div className="space-y-1" role="none">
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={false}
        tabIndex={0}
        onKeyDown={onRowKeyDown}
        onDragOver={(event) => onDragOverNode(event, node, siblingGroupKey)}
        onDrop={(event) => onDropNode(event, node, siblingNodes, siblingGroupKey)}
        style={{ marginLeft: depth * 8 }}
        className={`group relative flex items-center justify-between gap-2 rounded-lg border bg-(--surface) px-2.5 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border) hover:bg-(--surface-hover) ${
          showDropTarget ? "border-sky-500 ring-2 ring-sky-200" : "border-(--border)"
        }`}
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

          <p className="truncate text-sm font-medium text-(--text-strong)">{renderLabelWithHighlight(node.label, searchText)}</p>

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
            disabled={node.type === "secondary" || groupBusy}
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
              onRequestEdit(node);
            }}
            disabled={groupBusy}
            className="rounded-md border border-(--border) px-2 py-1 text-[11px] font-semibold text-(--text-soft) hover:bg-(--surface-hover) disabled:opacity-40"
            aria-label="Edit node"
            title="Edit"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRequestDelete(node);
            }}
            disabled={groupBusy}
            className="h-8 w-8 rounded-md border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            aria-label="Delete node"
            title="Delete"
          >
            X
          </button>

          <button
            type="button"
            draggable={!groupBusy && Boolean(onDropNode)}
            onDragStart={(event) => onDragStartNode(event, node, siblingGroupKey)}
            onDragEnd={onDragEndNode}
            disabled={groupBusy}
            className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] font-semibold text-(--text-soft) hover:bg-(--surface-hover) disabled:opacity-40"
            aria-label="Drag to reorder siblings"
            title="Drag to reorder siblings"
          >
            Drag
          </button>
        </div>

        {groupBusy ? (
          <span className="absolute -bottom-2 right-2 rounded-md border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] text-(--text-soft)">
            syncing order
          </span>
        ) : null}
      </div>

      {hasChildren && expanded ? (
        <div className="ml-4 border-l border-dashed border-(--border) pl-2" role="group">
          {renderChildren(node.children || [], depth + 1, node.id)}
        </div>
      ) : null}
    </div>
  );
}

export default function TreeView({ nodes, onAdd, onEdit, onDelete, onReorder }: TreeViewProps) {
  const [searchText, setSearchText] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingGroupKey, setDraggingGroupKey] = useState<string | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const [pendingGroupKey, setPendingGroupKey] = useState<string | null>(null);

  const nodeById = useMemo(() => createNodeIndex(nodes), [nodes]);
  const allNodeIds = useMemo(() => collectAllNodeIds(nodes), [nodes]);

  const normalizedExpandedIds = useMemo(() => {
    if (expandedIds === null) {
      return new Set(nodes.map((node) => node.id));
    }

    const next = new Set<string>();
    for (const id of expandedIds) {
      if (nodeById.has(id)) {
        next.add(id);
      }
    }
    return next;
  }, [expandedIds, nodeById, nodes]);

  const searchResult = useMemo(() => filterNodesBySearch(nodes, searchText), [nodes, searchText]);
  const isSearching = searchText.trim().length > 0;

  const displayNodes = isSearching ? searchResult.filteredNodes : nodes;
  const matchedNodeIds = useMemo(
    () => (isSearching ? searchResult.matchedNodeIds : EMPTY_NODE_SET),
    [isSearching, searchResult.matchedNodeIds]
  );

  const effectiveExpandedIds = useMemo(() => {
    if (!isSearching) return normalizedExpandedIds;
    return new Set([...normalizedExpandedIds, ...searchResult.autoExpandedIds]);
  }, [isSearching, normalizedExpandedIds, searchResult.autoExpandedIds]);

  const toggleNode = useCallback(
    (id: string) => {
      setExpandedIds((previous) => {
        const next = new Set(previous === null ? normalizedExpandedIds : previous);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [normalizedExpandedIds]
  );

  const clearDragState = useCallback(() => {
    setDraggingNodeId(null);
    setDraggingGroupKey(null);
    setDropTargetNodeId(null);
  }, []);

  const handleDragStart = useCallback((event: DragEvent<HTMLButtonElement>, node: TreeNode, groupKey: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", node.id);
    setDraggingNodeId(node.id);
    setDraggingGroupKey(groupKey);
    setDropTargetNodeId(null);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, node: TreeNode, groupKey: string) => {
      if (!draggingNodeId || !draggingGroupKey) return;
      if (draggingGroupKey !== groupKey) return;
      if (draggingNodeId === node.id) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      if (dropTargetNodeId !== node.id) {
        setDropTargetNodeId(node.id);
      }
    },
    [draggingGroupKey, draggingNodeId, dropTargetNodeId]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, targetNode: TreeNode, siblingNodes: TreeNode[], groupKey: string) => {
      event.preventDefault();
      event.stopPropagation();

      if (!onReorder) {
        clearDragState();
        return;
      }

      if (!draggingNodeId || !draggingGroupKey || draggingGroupKey !== groupKey) {
        clearDragState();
        return;
      }

      const draggedIndex = siblingNodes.findIndex((node) => node.id === draggingNodeId);
      const targetIndex = siblingNodes.findIndex((node) => node.id === targetNode.id);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
        clearDragState();
        return;
      }

      const reordered = [...siblingNodes];
      const [draggedNode] = reordered.splice(draggedIndex, 1);
      if (!draggedNode) {
        clearDragState();
        return;
      }

      const destinationIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
      reordered.splice(destinationIndex, 0, draggedNode);

      const updates: ReorderUpdate[] = reordered
        .map((node, index) => ({
          node,
          sortOrder: (index + 1) * SORT_STEP,
        }))
        .filter(({ node, sortOrder }) => normalizeSortOrder(node.sortOrder) !== sortOrder);

      clearDragState();
      if (updates.length === 0) return;

      setPendingGroupKey(groupKey);
      void Promise.resolve(onReorder(updates)).finally(() => {
        setPendingGroupKey((current) => (current === groupKey ? null : current));
      });
    },
    [clearDragState, draggingGroupKey, draggingNodeId, onReorder]
  );

  const renderChildren = (branchNodes: TreeNode[], depth: number, groupKey: string): ReactNode =>
    branchNodes.map((branchNode) => (
      <TreeNodeRow
        key={`${branchNode.id}:${normalizeSortOrder(branchNode.sortOrder)}`}
        node={branchNode}
        depth={depth}
        siblingGroupKey={groupKey}
        siblingNodes={branchNodes}
        expandedIds={effectiveExpandedIds}
        matchedNodeIds={matchedNodeIds}
        searchText={searchText}
        draggingNodeId={draggingNodeId}
        draggingGroupKey={draggingGroupKey}
        dropTargetNodeId={dropTargetNodeId}
        pendingGroupKey={pendingGroupKey}
        onToggleNode={toggleNode}
        onRequestAdd={onAdd}
        onRequestEdit={onEdit}
        onRequestDelete={onDelete}
        onDragStartNode={handleDragStart}
        onDragOverNode={handleDragOver}
        onDropNode={handleDrop}
        onDragEndNode={clearDragState}
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
          placeholder="Search categories"
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
      </div>

      <p className="mt-2 text-[11px] text-(--text-soft)">Drag works only inside the same sibling level.</p>

      {isSearching && displayNodes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No matching nodes found.
        </p>
      ) : null}

      <div role="tree" className="custom-scrollbar mt-3 max-h-[72vh] space-y-1 overflow-auto pr-1">
        {renderChildren(displayNodes, 0, ROOT_GROUP_KEY)}
      </div>
    </section>
  );
}
