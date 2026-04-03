"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import TreeView, { type TreeNode } from "@/components/admin/TreeView";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createCategoryNode,
  createSubcategoryNode,
  deleteCategoryNode,
  deleteSubcategoryNode,
  fetchCategoryExplorer,
  updateCategoryNode,
  updateSubcategoryNode,
  type AdminCategory,
  type AdminSubcategory,
} from "@/lib/adminApi";

type ModalMode = "category" | "subcategory" | "secondary";
type NodeRefType = TreeNode["type"];

const ROOT_PARENT_KEY = "root";

const byOrderThenName = <T extends { sortOrder: number; name: string }>(a: T, b: T) => {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
};

function reorderAfter(items: string[], sourceId: string, targetId: string) {
  const withoutSource = items.filter((id) => id !== sourceId);
  const targetIndex = withoutSource.indexOf(targetId);
  if (targetIndex < 0) {
    return [...withoutSource, sourceId];
  }

  const reordered = [...withoutSource];
  reordered.splice(targetIndex + 1, 0, sourceId);
  return reordered;
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-(--canvas)" />}>
      <CategoriesPageContent />
    </Suspense>
  );
}

function CategoriesPageContent() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view") || "category-explorer";
  const activeItem = findSidebarItem(viewId);

  const [message, setMessage] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("category");
  const [modalCategoryId, setModalCategoryId] = useState<string | null>(null);
  const [modalParentSubcategoryId, setModalParentSubcategoryId] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("0");
  const [activeInput, setActiveInput] = useState(true);

  const { data, error, isLoading, mutate } = useSWR("category-explorer", fetchCategoryExplorer, {
    keepPreviousData: true,
  });

  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const subcategories = useMemo(() => data?.subcategories ?? [], [data?.subcategories]);

  const orderedCategories = useMemo(() => [...categories].sort(byOrderThenName), [categories]);
  const orderedSubcategories = useMemo(() => [...subcategories].sort(byOrderThenName), [subcategories]);

  const subcategoryById = useMemo(() => {
    const lookup = new Map<string, AdminSubcategory>();
    for (const subcategory of subcategories) {
      lookup.set(subcategory.id, subcategory);
    }
    return lookup;
  }, [subcategories]);

  const openModal = useCallback(
    (
      mode: ModalMode,
      context?: {
        categoryId?: string | null;
        parentSubcategoryId?: string | null;
      }
    ) => {
      let nextCategoryId = context?.categoryId ?? orderedCategories[0]?.id ?? null;
      let nextParentSubcategoryId = context?.parentSubcategoryId ?? null;

      if (nextParentSubcategoryId) {
        const parent = subcategoryById.get(nextParentSubcategoryId);
        if (parent?.category?.id) {
          nextCategoryId = parent.category.id;
        }
      }

      if (mode === "secondary" && !nextParentSubcategoryId) {
        const fallbackParent = orderedSubcategories[0]?.id || null;
        nextParentSubcategoryId = fallbackParent;
        if (fallbackParent) {
          const parent = subcategoryById.get(fallbackParent);
          if (parent?.category?.id) {
            nextCategoryId = parent.category.id;
          }
        }
      }

      setModalMode(mode);
      setModalCategoryId(nextCategoryId);
      setModalParentSubcategoryId(nextParentSubcategoryId);
      setNameInput("");
      setSortOrderInput("0");
      setActiveInput(true);
      setModalOpen(true);
    },
    [orderedCategories, orderedSubcategories, subcategoryById]
  );

  useEffect(() => {
    if (viewId === "create-category") {
      openModal("category");
    } else if (viewId === "create-subcategory") {
      openModal("subcategory", { categoryId: orderedCategories[0]?.id || null });
    } else if (viewId === "create-secondary-subcategory") {
      openModal("secondary", { parentSubcategoryId: orderedSubcategories[0]?.id || null });
    }
  }, [openModal, orderedCategories, orderedSubcategories, viewId]);

  useEffect(() => {
    if (!modalOpen || modalMode === "category") return;

    if (!modalCategoryId && orderedCategories[0]?.id) {
      setModalCategoryId(orderedCategories[0].id);
      return;
    }

    if (!modalParentSubcategoryId) {
      if (modalMode === "secondary") {
        const fallbackParent = orderedSubcategories.find((item) => item.category?.id === modalCategoryId)?.id || null;
        if (fallbackParent) {
          setModalParentSubcategoryId(fallbackParent);
        }
      }
      return;
    }

    const parent = subcategoryById.get(modalParentSubcategoryId);
    if (!parent || parent.category?.id !== modalCategoryId) {
      setModalParentSubcategoryId(null);
    }
  }, [
    modalCategoryId,
    modalMode,
    modalOpen,
    modalParentSubcategoryId,
    orderedCategories,
    orderedSubcategories,
    subcategoryById,
  ]);

  const treeNodes = useMemo<TreeNode[]>(() => {
    const groupedSubcategories = new Map<string, AdminSubcategory[]>();
    for (const subcategory of orderedSubcategories) {
      const categoryId = subcategory.category?.id;
      if (!categoryId) continue;

      const parentId = subcategory.parentSubcategory?.id || ROOT_PARENT_KEY;
      const key = `${categoryId}:${parentId}`;
      const existing = groupedSubcategories.get(key);
      if (existing) {
        existing.push(subcategory);
      } else {
        groupedSubcategories.set(key, [subcategory]);
      }
    }

    for (const siblingSet of groupedSubcategories.values()) {
      siblingSet.sort(byOrderThenName);
    }

    const buildSubcategoryChildren = (
      categoryId: string,
      parentSubcategoryId: string | null,
      lineage: Set<string>
    ): TreeNode[] => {
      const key = `${categoryId}:${parentSubcategoryId || ROOT_PARENT_KEY}`;
      const siblings = groupedSubcategories.get(key) || [];

      return siblings.map<TreeNode>((subcategory): TreeNode => {
        const childLineage = new Set(lineage);
        const hasCycle = childLineage.has(subcategory.id);
        childLineage.add(subcategory.id);

        return {
          id: `subcategory:${subcategory.id}`,
          label: subcategory.name,
          type: "subcategory",
          parentId: parentSubcategoryId ? `subcategory:${parentSubcategoryId}` : `category:${categoryId}`,
          categoryId,
          parentSubcategoryId: parentSubcategoryId || undefined,
          sortOrder: subcategory.sortOrder,
          isActive: subcategory.isActive,
          description: subcategory.description,
          createdAt: subcategory.createdAt,
          updatedAt: subcategory.updatedAt,
          children: hasCycle ? [] : buildSubcategoryChildren(categoryId, subcategory.id, childLineage),
        };
      });
    };

    return orderedCategories.map<TreeNode>((category) => ({
      id: `category:${category.id}`,
      label: category.name,
      type: "category",
      categoryId: category.id,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      children: buildSubcategoryChildren(category.id, null, new Set<string>()),
    }));
  }, [orderedCategories, orderedSubcategories]);

  const parseNodeRef = useCallback((node: TreeNode) => {
    const [typeToken, ...entityParts] = node.id.split(":");
    return {
      type: typeToken as NodeRefType,
      entityId: entityParts.join(":"),
    };
  }, []);

  const submitCreate = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setErrorText(null);

    try {
      const cleanName = nameInput.trim();
      if (!cleanName) {
        throw new Error("Name is required");
      }

      const parsedSortOrder = Number(sortOrderInput || "0");
      if (!Number.isFinite(parsedSortOrder)) {
        throw new Error("Sort order must be a number");
      }

      if (modalMode === "category") {
        await createCategoryNode({
          name: cleanName,
          sortOrder: parsedSortOrder,
          isActive: activeInput,
        });
        setMessage("Category created");
      }

      if (modalMode === "subcategory" || modalMode === "secondary") {
        const categoryId = modalCategoryId || orderedCategories[0]?.id;
        if (!categoryId) {
          throw new Error("No category available");
        }

        const parentSubcategoryId = modalParentSubcategoryId || undefined;
        if (modalMode === "secondary" && !parentSubcategoryId) {
          throw new Error("Parent subcategory is required for secondary nodes");
        }

        await createSubcategoryNode({
          categoryId,
          parentSubcategoryId,
          name: cleanName,
          sortOrder: parsedSortOrder,
          isActive: activeInput,
        });
        setMessage(modalMode === "secondary" ? "Secondary subcategory created" : "Subcategory created");
      }

      setModalOpen(false);
      await mutate();
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : "Create operation failed";
      setErrorText(messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = (node: TreeNode) => {
    const { type, entityId } = parseNodeRef(node);

    if (type === "category") {
      openModal("subcategory", { categoryId: entityId });
      return;
    }

    if (type === "subcategory") {
      openModal("secondary", {
        categoryId: node.categoryId || subcategoryById.get(entityId)?.category?.id || null,
        parentSubcategoryId: entityId,
      });
      return;
    }

    openModal("secondary", {
      categoryId: node.categoryId || null,
      parentSubcategoryId: node.parentSubcategoryId || null,
    });
  };

  const handleInlineCreate = async (parent: TreeNode | null, label: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    setMessage(null);
    setErrorText(null);

    try {
      if (!parent) {
        await createCategoryNode({
          name: cleanLabel,
          sortOrder: 0,
          isActive: true,
        });
        await mutate();
        setMessage("Category created");
        return;
      }

      const parentRef = parseNodeRef(parent);
      if (parentRef.type === "category") {
        await createSubcategoryNode({
          categoryId: parentRef.entityId,
          name: cleanLabel,
          sortOrder: 0,
          isActive: true,
        });
        await mutate();
        setMessage("Subcategory created");
        return;
      }

      if (parentRef.type === "subcategory") {
        const categoryId = parent.categoryId || subcategoryById.get(parentRef.entityId)?.category?.id;
        if (!categoryId) {
          throw new Error("Unable to resolve category for nested create");
        }

        await createSubcategoryNode({
          categoryId,
          parentSubcategoryId: parentRef.entityId,
          name: cleanLabel,
          sortOrder: 0,
          isActive: true,
        });
        await mutate();
        setMessage("Child subcategory created");
        return;
      }

      throw new Error("Inline create is unsupported for this node type");
    } catch (createError) {
      const messageText = createError instanceof Error ? createError.message : "Unable to create node";
      setErrorText(messageText);
    }
  };

  const handleInlineEdit = async (node: TreeNode, nextLabel: string) => {
    setMessage(null);
    setErrorText(null);

    const { type, entityId } = parseNodeRef(node);

    try {
      if (type === "category") {
        await updateCategoryNode(entityId, { name: nextLabel });
        await mutate();
        setMessage("Category updated");
        return;
      }

      if (type === "subcategory") {
        await updateSubcategoryNode(entityId, { name: nextLabel });
        await mutate();
        setMessage("Subcategory updated");
        return;
      }

      setErrorText("Secondary nodes are not persisted by the current API");
    } catch (updateError) {
      const messageText = updateError instanceof Error ? updateError.message : "Unable to update node";
      setErrorText(messageText);
    }
  };

  const handleDelete = async (node: TreeNode) => {
    const { type, entityId } = parseNodeRef(node);
    setMessage(null);
    setErrorText(null);

    try {
      if (type === "category") {
        await deleteCategoryNode(entityId);
        await mutate();
        setMessage("Category deleted");
        return;
      }

      if (type === "subcategory") {
        await deleteSubcategoryNode(entityId);
        await mutate();
        setMessage("Subcategory deleted");
        return;
      }

      setErrorText("Secondary nodes are not persisted by the current API");
    } catch (deleteError) {
      const messageText = deleteError instanceof Error ? deleteError.message : "Delete operation failed";
      setErrorText(messageText);
    }
  };

  const getSiblingIds = useCallback(
    (categoryId: string, parentSubcategoryId: string | null) => {
      return orderedSubcategories
        .filter(
          (subcategory) =>
            subcategory.category?.id === categoryId &&
            (subcategory.parentSubcategory?.id || null) === (parentSubcategoryId || null)
        )
        .map((subcategory) => subcategory.id);
    },
    [orderedSubcategories]
  );

  const handleMove = async (sourceNode: TreeNode, targetNode: TreeNode) => {
    const source = parseNodeRef(sourceNode);
    const target = parseNodeRef(targetNode);

    if (source.type === target.type && source.entityId === target.entityId) {
      return;
    }

    setMessage(null);
    setErrorText(null);

    try {
      if (source.type === "category") {
        if (target.type !== "category") {
          throw new Error("Categories can only be reordered against other categories");
        }

        const currentOrder = orderedCategories.map((category) => category.id);
        const nextOrder = reorderAfter(currentOrder, source.entityId, target.entityId);
        const isSameOrder = nextOrder.every((id, index) => id === currentOrder[index]);
        if (isSameOrder) return;

        await Promise.all(
          nextOrder.map((id, index) =>
            updateCategoryNode(id, {
              sortOrder: (index + 1) * 10,
            })
          )
        );
        await mutate();
        setMessage("Category order updated");
        return;
      }

      if (source.type !== "subcategory") {
        throw new Error("This node type cannot be moved");
      }

      const sourceSubcategory = subcategoryById.get(source.entityId);
      if (!sourceSubcategory?.category?.id) {
        throw new Error("Source subcategory no longer exists");
      }

      const sourceCategoryId = sourceSubcategory.category.id;
      const sourceParentSubcategoryId = sourceSubcategory.parentSubcategory?.id || null;

      let destinationCategoryId = sourceCategoryId;
      let destinationParentSubcategoryId: string | null = sourceParentSubcategoryId;
      let siblingReorderTargetId: string | null = null;

      if (target.type === "category") {
        destinationCategoryId = target.entityId;
        destinationParentSubcategoryId = null;
      } else if (target.type === "subcategory") {
        const targetSubcategory = subcategoryById.get(target.entityId);
        if (!targetSubcategory?.category?.id) {
          throw new Error("Target subcategory no longer exists");
        }

        const targetCategoryId = targetSubcategory.category.id;
        const targetParentSubcategoryId = targetSubcategory.parentSubcategory?.id || null;

        if (targetCategoryId === sourceCategoryId && targetParentSubcategoryId === sourceParentSubcategoryId) {
          destinationCategoryId = sourceCategoryId;
          destinationParentSubcategoryId = sourceParentSubcategoryId;
          siblingReorderTargetId = target.entityId;
        } else {
          destinationCategoryId = targetCategoryId;
          destinationParentSubcategoryId = target.entityId;
        }
      } else {
        throw new Error("Unsupported drop target");
      }

      const movedAcrossBranch =
        destinationCategoryId !== sourceCategoryId || destinationParentSubcategoryId !== sourceParentSubcategoryId;

      const destinationBase = getSiblingIds(destinationCategoryId, destinationParentSubcategoryId).filter(
        (id) => id !== source.entityId
      );

      const destinationOrder = siblingReorderTargetId
        ? reorderAfter(destinationBase, source.entityId, siblingReorderTargetId)
        : [...destinationBase, source.entityId];

      const sourceRemainingOrder = movedAcrossBranch
        ? getSiblingIds(sourceCategoryId, sourceParentSubcategoryId).filter((id) => id !== source.entityId)
        : [];

      const destinationUpdates = destinationOrder.map((id, index) => {
        if (id !== source.entityId) {
          return updateSubcategoryNode(id, {
            sortOrder: (index + 1) * 10,
          });
        }

        const payload: {
          sortOrder: number;
          categoryId?: string;
          parentSubcategoryId?: string;
        } = {
          sortOrder: (index + 1) * 10,
        };

        if (destinationCategoryId !== sourceCategoryId) {
          payload.categoryId = destinationCategoryId;
        }

        if (destinationParentSubcategoryId !== sourceParentSubcategoryId) {
          payload.parentSubcategoryId = destinationParentSubcategoryId || "";
        }

        return updateSubcategoryNode(id, payload);
      });

      const sourceUpdates = sourceRemainingOrder.map((id, index) =>
        updateSubcategoryNode(id, {
          sortOrder: (index + 1) * 10,
        })
      );

      await Promise.all([...destinationUpdates, ...sourceUpdates]);
      await mutate();
      setMessage(movedAcrossBranch ? "Subcategory moved" : "Subcategory reordered");
    } catch (moveError) {
      const messageText = moveError instanceof Error ? moveError.message : "Unable to move node";
      setErrorText(messageText);
    }
  };

  return (
    <AdminShell title="Category Explorer" subtitle="Nested tree editing for category structures.">
      <PageLayout
        title={activeItem?.label || "Category Explorer"}
        subtitle="Explore hierarchy, drag to reorder, and manage nested category relationships with full context."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openModal("category")}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Category
            </button>
            <button
              type="button"
              onClick={() =>
                openModal("subcategory", {
                  categoryId: orderedCategories[0]?.id || null,
                })
              }
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Subcategory
            </button>
            <button
              type="button"
              onClick={() =>
                openModal("secondary", {
                  parentSubcategoryId: orderedSubcategories[0]?.id || null,
                })
              }
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Secondary
            </button>
          </div>
        }
      >
        {errorText ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorText}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load categories"}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-(--border) bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
            Loading category explorer...
          </section>
        ) : (
          <TreeView
            nodes={treeNodes}
            onAdd={handleAdd}
            onEdit={handleInlineEdit}
            onDelete={handleDelete}
            onInlineCreate={handleInlineCreate}
            onMove={handleMove}
          />
        )}
      </PageLayout>

      <CreateNodeModal
        open={modalOpen}
        mode={modalMode}
        categories={categories}
        subcategories={subcategories}
        nameInput={nameInput}
        sortOrderInput={sortOrderInput}
        activeInput={activeInput}
        modalCategoryId={modalCategoryId}
        modalParentSubcategoryId={modalParentSubcategoryId}
        submitting={isSubmitting}
        onNameChange={setNameInput}
        onSortOrderChange={setSortOrderInput}
        onActiveChange={setActiveInput}
        onCategoryChange={setModalCategoryId}
        onParentSubcategoryChange={setModalParentSubcategoryId}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void submitCreate()}
      />
    </AdminShell>
  );
}

type CreateNodeModalProps = {
  open: boolean;
  mode: ModalMode;
  categories: AdminCategory[];
  subcategories: AdminSubcategory[];
  nameInput: string;
  sortOrderInput: string;
  activeInput: boolean;
  modalCategoryId: string | null;
  modalParentSubcategoryId: string | null;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onCategoryChange: (value: string | null) => void;
  onParentSubcategoryChange: (value: string | null) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function CreateNodeModal({
  open,
  mode,
  categories,
  subcategories,
  nameInput,
  sortOrderInput,
  activeInput,
  modalCategoryId,
  modalParentSubcategoryId,
  submitting,
  onNameChange,
  onSortOrderChange,
  onActiveChange,
  onCategoryChange,
  onParentSubcategoryChange,
  onClose,
  onSubmit,
}: CreateNodeModalProps) {
  const parentOptions = useMemo(
    () => buildSubcategoryOptions(subcategories, modalCategoryId),
    [modalCategoryId, subcategories]
  );

  const parentRequired = mode === "secondary";

  const disableSave =
    submitting ||
    !nameInput.trim() ||
    (mode !== "category" && !modalCategoryId) ||
    (parentRequired && !modalParentSubcategoryId);

  return (
    <Modal
      open={open}
      title={
        mode === "category"
          ? "Add Category"
          : mode === "subcategory"
            ? "Add Subcategory"
            : "Add Secondary Subcategory"
      }
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disableSave}
            className="rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      {mode !== "category" ? (
        <label className="block space-y-1 text-sm text-(--text-soft)">
          Category
          <select
            value={modalCategoryId || ""}
            onChange={(event) => onCategoryChange(event.target.value || null)}
            className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode !== "category" ? (
        <label className="block space-y-1 text-sm text-(--text-soft)">
          Parent subcategory
          <select
            value={modalParentSubcategoryId || ""}
            onChange={(event) => onParentSubcategoryChange(event.target.value || null)}
            className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2"
          >
            {!parentRequired ? <option value="">Top level (no parent)</option> : null}
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {`${"  ".repeat(option.depth)}${option.name}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode === "secondary" && parentOptions.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No parent subcategory available in the selected category.
        </p>
      ) : null}

      <label className="block space-y-1 text-sm text-(--text-soft)">
        Name
        <input
          value={nameInput}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
          placeholder="Enter name"
        />
      </label>

      <label className="block space-y-1 text-sm text-(--text-soft)">
        Sort order
        <input
          type="number"
          value={sortOrderInput}
          onChange={(event) => onSortOrderChange(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-(--text-soft)">
        <input type="checkbox" checked={activeInput} onChange={(event) => onActiveChange(event.target.checked)} />
        Active
      </label>
    </Modal>
  );
}

function buildSubcategoryOptions(subcategories: AdminSubcategory[], categoryId: string | null) {
  if (!categoryId) return [] as Array<{ id: string; name: string; depth: number }>;

  const groupedByParent = new Map<string, AdminSubcategory[]>();

  for (const subcategory of subcategories) {
    if (subcategory.category?.id !== categoryId) continue;

    const parentId = subcategory.parentSubcategory?.id || ROOT_PARENT_KEY;
    const siblings = groupedByParent.get(parentId);
    if (siblings) {
      siblings.push(subcategory);
    } else {
      groupedByParent.set(parentId, [subcategory]);
    }
  }

  for (const siblings of groupedByParent.values()) {
    siblings.sort(byOrderThenName);
  }

  const options: Array<{ id: string; name: string; depth: number }> = [];

  const walk = (parentSubcategoryId: string | null, depth: number, lineage: Set<string>) => {
    const key = parentSubcategoryId || ROOT_PARENT_KEY;
    const siblings = groupedByParent.get(key) || [];

    for (const sibling of siblings) {
      if (lineage.has(sibling.id)) continue;

      options.push({
        id: sibling.id,
        name: sibling.name,
        depth,
      });

      const nextLineage = new Set(lineage);
      nextLineage.add(sibling.id);
      walk(sibling.id, depth + 1, nextLineage);
    }
  };

  walk(null, 0, new Set<string>());
  return options;
}
