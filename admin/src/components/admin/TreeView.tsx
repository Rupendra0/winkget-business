"use client";

import { useMemo, useState, type ReactNode } from "react";
import Modal from "@/components/admin/Modal";

export type TreeNode = {
  id: string;
  label: string;
  type: "category" | "subcategory" | "secondary";
  mediaUrl?: string;
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

type CountSummary = {
  directChildren: number;
  totalDescendants: number;
  secondaryCount: number;
};

function createNodeIndex(nodes: TreeNode[]) {
  const nodeById = new Map<string, TreeNode>();

  const walk = (items: TreeNode[]) => {
    items.forEach((item) => {
      nodeById.set(item.id, item);
      if (item.children?.length) walk(item.children);
    });
  };

  walk(nodes);
  return nodeById;
}

function countSummary(node: TreeNode): CountSummary {
  const children = node.children || [];

  return children.reduce<CountSummary>(
    (summary, child) => {
      const nested = countSummary(child);
      return {
        directChildren: summary.directChildren + 1,
        totalDescendants: summary.totalDescendants + 1 + nested.totalDescendants,
        secondaryCount:
          summary.secondaryCount + (child.type === "secondary" ? 1 : 0) + nested.secondaryCount,
      };
    },
    {
      directChildren: 0,
      totalDescendants: 0,
      secondaryCount: 0,
    }
  );
}

function nodeMatchesSearch(node: TreeNode, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  if (node.label.toLowerCase().includes(normalized)) return true;

  return (node.children || []).some((child) => nodeMatchesSearch(child, normalized));
}

function flattenChildren(nodes: TreeNode[]): TreeNode[] {
  const ordered = [...nodes].sort((a, b) => {
    const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
    const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
    if (sortA !== sortB) return sortA - sortB;
    return a.label.localeCompare(b.label);
  });

  return ordered;
}

function getTypePill(nodeType: TreeNode["type"]) {
  if (nodeType === "category") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (nodeType === "secondary") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function buildNodePath(node: TreeNode, nodeById: Map<string, TreeNode>): TreeNode[] {
  const path: TreeNode[] = [];
  let current: TreeNode | undefined = node;
  let guard = 0;

  while (current && guard < 40) {
    path.unshift(current);
    current = current.parentId ? nodeById.get(current.parentId) : undefined;
    guard += 1;
  }

  return path;
}

function NodeGlyph({ type }: { type: TreeNode["type"] }) {
  if (type === "category") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (type === "secondary") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

function NodeAvatar({ node }: { node: TreeNode }) {
  const [failed, setFailed] = useState(false);
  const mediaUrl = String(node.mediaUrl || "").trim();
  const canUseMedia = Boolean(mediaUrl) && !failed;

  if (canUseMedia) {
    return (
      <img
        src={mediaUrl}
        alt={`${node.label} icon`}
        className="h-full w-full rounded-[inherit] object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return <NodeGlyph type={node.type} />;
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20l4.5-1 9-9a1.8 1.8 0 0 0-2.5-2.5l-9 9L4 20z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 16V6" />
      <path d="M8.5 9.5L12 6l3.5 3.5" />
      <path d="M5 18.5A3.5 3.5 0 0 0 8.5 22h7A3.5 3.5 0 0 0 19 18.5" />
    </svg>
  );
}

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "normal" | "danger";
  disabled?: boolean;
};

function ActionButton({ icon, label, onClick, tone = "normal", disabled = false }: ActionButtonProps) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-(--border) bg-(--surface-muted) text-(--text-soft) hover:bg-(--surface-hover)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
      title={label}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function TreeView({
  nodes,
  onAdd,
  onEdit,
  onDelete,
  onReorder: _onReorder,
}: TreeViewProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeById = useMemo(() => createNodeIndex(nodes), [nodes]);
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) || null : null;

  const displayCategories = useMemo(() => {
    const base = [...nodes].sort((a, b) => {
      const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
      const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
      if (sortA !== sortB) return sortA - sortB;
      return a.label.localeCompare(b.label);
    });

    if (!searchText.trim()) return base;
    return base.filter((node) => nodeMatchesSearch(node, searchText));
  }, [nodes, searchText]);

  const popupChildren = useMemo(() => flattenChildren(selectedNode?.children || []), [selectedNode]);
  const selectedPath = useMemo(
    () => (selectedNode ? buildNodePath(selectedNode, nodeById) : []),
    [selectedNode, nodeById]
  );
  const parentNode = selectedPath.length > 1 ? selectedPath[selectedPath.length - 2] : null;

  const closePopup = () => {
    setSelectedNodeId(null);
  };

  const runActionAndClose = (handler: (node: TreeNode) => void, node: TreeNode) => {
    closePopup();
    handler(node);
  };

  return (
    <>
      <section className="rounded-xl border border-(--border) bg-(--surface) p-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-(--text-strong)">Category Tiles</h3>
          <p className="text-xs text-(--text-soft)">Click any tile to open action popup</p>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search categories"
            className="min-w-[220px] flex-1 rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm outline-none focus:border-(--accent)"
          />
          {searchText.trim() ? (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="rounded-md border border-(--border) px-2 py-1 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Clear
            </button>
          ) : null}
        </div>

        {displayCategories.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No categories found.
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayCategories.map((node) => {
            const summary = countSummary(node);
            const active = selectedNodeId === node.id;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-(--accent) bg-(--accent-soft)"
                    : "border-(--border) bg-(--surface-muted)/50 hover:border-(--accent) hover:bg-(--surface-hover)"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--border) bg-(--surface)">
                    <NodeAvatar node={node} />
                  </span>
                  <span className="truncate text-base font-semibold text-(--text-strong)">{node.label}</span>
                </span>

                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-sky-700">
                  {summary.directChildren} Direct
                </span>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full border border-(--border) bg-(--surface) px-2 py-0.5 text-(--text-soft)">
                    {summary.totalDescendants} Total linked
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                    {summary.secondaryCount} Secondary
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-semibold uppercase tracking-[0.07em] ${getTypePill(
                      node.type
                    )}`}
                  >
                    {node.type}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Modal
        open={Boolean(selectedNode)}
        title={selectedNode ? `${selectedNode.label} Actions` : "Node Actions"}
        onClose={closePopup}
        panelClassName="max-w-2xl"
      >
        {selectedNode ? (
          <>
            <div className="rounded-xl border border-(--border) bg-(--surface) p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (parentNode) {
                      setSelectedNodeId(parentNode.id);
                      return;
                    }
                    closePopup();
                  }}
                  className="rounded-lg border border-(--border) bg-(--surface-muted) px-2.5 py-1.5 text-xs font-semibold text-(--text-soft) hover:bg-(--surface-hover)"
                >
                  Back
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-soft)">
                    Hierarchy Path
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-sm font-bold">
                    {selectedPath.map((crumb, index) => {
                      const isCurrent = index === selectedPath.length - 1;
                      return (
                        <span key={crumb.id} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(crumb.id)}
                            className={`rounded-md px-2 py-0.5 transition ${
                              isCurrent
                                ? "bg-(--accent-soft) text-(--accent-strong)"
                                : "text-(--text-strong) hover:bg-(--surface-hover)"
                            }`}
                            title={`Open ${crumb.label}`}
                          >
                            {crumb.label}
                          </button>
                          {!isCurrent ? <span className="text-(--text-soft)">{">"}</span> : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface-muted)/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-(--text-strong)">{selectedNode.label}</p>
                  <p className="text-xs text-(--text-soft)">Manage this node using icon actions</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] ${getTypePill(
                    selectedNode.type
                  )}`}
                >
                  {selectedNode.type}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ActionButton
                  icon={<PlusGlyph />}
                  label="Add"
                  onClick={() => runActionAndClose(onAdd, selectedNode)}
                  disabled={selectedNode.type === "secondary"}
                />
                <ActionButton icon={<PencilGlyph />} label="Edit" onClick={() => runActionAndClose(onEdit, selectedNode)} />
                <ActionButton
                  icon={<TrashGlyph />}
                  label="Delete"
                  tone="danger"
                  onClick={() => runActionAndClose(onDelete, selectedNode)}
                />
                <ActionButton
                  icon={<UploadGlyph />}
                  label="Upload"
                  onClick={() => runActionAndClose(onEdit, selectedNode)}
                  disabled={selectedNode.type !== "category"}
                />
              </div>
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface) p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-(--text-soft)">Linked children</p>
              {popupChildren.length === 0 ? (
                <p className="mt-2 text-sm text-(--text-soft)">No linked children for this node.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {popupChildren.map((child) => (
                    <div key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--surface-muted)/40 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(child.id)}
                        className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-(--surface-hover)"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-(--border) bg-(--surface)">
                          <NodeAvatar node={child} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-(--text-strong)">{child.label}</span>
                          <span
                            className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] ${getTypePill(
                              child.type
                            )}`}
                          >
                            {child.type}
                          </span>
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <ActionButton
                          icon={<PlusGlyph />}
                          label="Add"
                          onClick={() => runActionAndClose(onAdd, child)}
                          disabled={child.type === "secondary"}
                        />
                        <ActionButton icon={<PencilGlyph />} label="Edit" onClick={() => runActionAndClose(onEdit, child)} />
                        <ActionButton
                          icon={<TrashGlyph />}
                          label="Delete"
                          tone="danger"
                          onClick={() => runActionAndClose(onDelete, child)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}