"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import TreeView, { type TreeNode } from "@/components/admin/TreeView";
import { findSidebarItem } from "@/data/adminNavigation";
import {
  createCategoryNode,
  createSecondaryNode,
  createSubcategoryNode,
  deleteCategoryNode,
  deleteSubcategoryNode,
  fetchCategoryExplorer,
  updateCategoryNode,
  updateSubcategoryNode,
  type AdminCategory,
  type AdminSubcategory,
  type SecondaryNode,
} from "@/lib/adminApi";

type ModalMode = "category" | "subcategory" | "secondary";

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

  const [secondaryNodes, setSecondaryNodes] = useState<SecondaryNode[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("category");
  const [modalParentId, setModalParentId] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("0");
  const [activeInput, setActiveInput] = useState(true);

  const { data, error, isLoading, mutate } = useSWR("category-explorer", fetchCategoryExplorer, {
    keepPreviousData: true,
  });

  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const subcategories = useMemo(() => data?.subcategories ?? [], [data?.subcategories]);

  useEffect(() => {
    if (viewId === "create-category") {
      openModal("category");
    } else if (viewId === "create-subcategory") {
      openModal("subcategory", categories[0]?.id || null);
    } else if (viewId === "create-secondary-subcategory") {
      openModal("secondary", subcategories[0]?.id || null);
    }
    // The dependency list intentionally tracks updates to route-driven actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  const treeNodes = useMemo<TreeNode[]>(() => {
    return categories.map((category) => {
      const categoryChildren = subcategories
        .filter((subcategory) => subcategory.category?.id === category.id)
        .map((subcategory) => {
          const thirdLevel = secondaryNodes
            .filter((secondary) => secondary.parentSubcategoryId === subcategory.id)
            .map<TreeNode>((secondary) => ({
              id: `secondary:${secondary.id}`,
              label: secondary.label,
              type: "secondary",
              parentId: subcategory.id,
            }));

          return {
            id: `subcategory:${subcategory.id}`,
            label: subcategory.name,
            type: "subcategory" as const,
            parentId: category.id,
            children: thirdLevel,
          };
        });

      return {
        id: `category:${category.id}`,
        label: category.name,
        type: "category" as const,
        children: categoryChildren,
      };
    });
  }, [categories, secondaryNodes, subcategories]);

  const parseNodeRef = (node: TreeNode) => {
    const [type, entityId] = node.id.split(":");
    return { type, entityId };
  };

  const openModal = (mode: ModalMode, parentId: string | null = null) => {
    setModalMode(mode);
    setModalParentId(parentId);
    setNameInput("");
    setSortOrderInput("0");
    setActiveInput(true);
    setModalOpen(true);
  };

  const submitCreate = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setErrorText(null);

    try {
      const cleanName = nameInput.trim();
      if (!cleanName) {
        throw new Error("Name is required");
      }

      if (modalMode === "category") {
        await createCategoryNode({
          name: cleanName,
          sortOrder: Number(sortOrderInput || "0"),
          isActive: activeInput,
        });
        setMessage("Category created");
      }

      if (modalMode === "subcategory") {
        const parent = modalParentId || categories[0]?.id;
        if (!parent) {
          throw new Error("No parent category available");
        }

        await createSubcategoryNode({
          categoryId: parent,
          name: cleanName,
          sortOrder: Number(sortOrderInput || "0"),
          isActive: activeInput,
        });
        setMessage("Subcategory created");
      }

      if (modalMode === "secondary") {
        const parent = modalParentId || subcategories[0]?.id;
        if (!parent) {
          throw new Error("No parent subcategory available");
        }

        setSecondaryNodes((prev) => [...prev, createSecondaryNode(parent, cleanName)]);
        setMessage("Secondary subcategory added (local)");
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
      openModal("subcategory", entityId);
      return;
    }

    if (type === "subcategory") {
      openModal("secondary", entityId);
      return;
    }

    openModal("secondary", node.parentId || null);
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

      setSecondaryNodes((prev) => prev.map((item) => (item.id === entityId ? { ...item, label: nextLabel } : item)));
      setMessage("Secondary subcategory updated (local)");
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

      setSecondaryNodes((prev) => prev.filter((item) => item.id !== entityId));
      setMessage("Secondary subcategory deleted (local)");
    } catch (deleteError) {
      const messageText =
        deleteError instanceof Error
          ? `${deleteError.message} (delete endpoint may be unavailable on current backend)`
          : "Delete operation failed";
      setErrorText(messageText);
    }
  };

  return (
    <AdminShell title="Category Explorer" subtitle="Nested tree editing for category structures.">
      <PageLayout
        title={activeItem?.label || "Category Explorer"}
        subtitle="Expand/collapse, inline edit, add category/subcategory/secondary, and delete actions."
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
              onClick={() => openModal("subcategory", categories[0]?.id || null)}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Subcategory
            </button>
            <button
              type="button"
              onClick={() => openModal("secondary", subcategories[0]?.id || null)}
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
          <TreeView nodes={treeNodes} onAdd={handleAdd} onEdit={handleInlineEdit} onDelete={handleDelete} />
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
        modalParentId={modalParentId}
        submitting={isSubmitting}
        onNameChange={setNameInput}
        onSortOrderChange={setSortOrderInput}
        onActiveChange={setActiveInput}
        onParentChange={setModalParentId}
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
  modalParentId: string | null;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onParentChange: (value: string | null) => void;
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
  modalParentId,
  submitting,
  onNameChange,
  onSortOrderChange,
  onActiveChange,
  onParentChange,
  onClose,
  onSubmit,
}: CreateNodeModalProps) {
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
            disabled={submitting}
            className="rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      {mode === "subcategory" ? (
        <label className="block space-y-1 text-sm text-(--text-soft)">
          Parent category
          <select
            value={modalParentId || ""}
            onChange={(event) => onParentChange(event.target.value || null)}
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

      {mode === "secondary" ? (
        <label className="block space-y-1 text-sm text-(--text-soft)">
          Parent subcategory
          <select
            value={modalParentId || ""}
            onChange={(event) => onParentChange(event.target.value || null)}
            className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2"
          >
            <option value="">Select subcategory</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </label>
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

      {mode !== "secondary" ? (
        <>
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
            <input
              type="checkbox"
              checked={activeInput}
              onChange={(event) => onActiveChange(event.target.checked)}
            />
            Active
          </label>
        </>
      ) : null}
    </Modal>
  );
}
