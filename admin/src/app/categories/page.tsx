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
  createSubcategoryNode,
  deleteCategoryNode,
  deleteSubcategoryNode,
  fetchCategoryExplorer,
  updateCategoryNode,
  updateSubcategoryNode,
  type AdminCategory,
  type AdminSubcategory,
} from "@/lib/adminApi";

type ModalMode = "category" | "subcategory";

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

  const openModal = (mode: ModalMode, categoryId: string | null = null, parentSubcategoryId: string | null = null) => {
    setModalMode(mode);
    setModalCategoryId(categoryId);
    setModalParentSubcategoryId(parentSubcategoryId);
    setNameInput("");
    setSortOrderInput("0");
    setActiveInput(true);
    setModalOpen(true);
  };

  useEffect(() => {
    if (viewId === "create-category") {
      openModal("category");
      return;
    }

    if (viewId === "create-subcategory") {
      openModal("subcategory", categories[0]?.id || null, null);
      return;
    }

    if (viewId === "create-secondary-subcategory") {
      const firstSubcategory = subcategories[0];
      openModal(
        "subcategory",
        firstSubcategory?.category?.id || categories[0]?.id || null,
        firstSubcategory?.id || null
      );
    }
    // The dependency list intentionally tracks updates to route-driven actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  const treeNodes = useMemo<TreeNode[]>(() => {
    const grouped = new Map<string, AdminSubcategory[]>();

    for (const subcategory of subcategories) {
      const categoryId = subcategory.category?.id;
      if (!categoryId) continue;

      const parentId = subcategory.parentSubcategory?.id || "root";
      const key = `${categoryId}::${parentId}`;
      const bucket = grouped.get(key);

      if (bucket) {
        bucket.push(subcategory);
      } else {
        grouped.set(key, [subcategory]);
      }
    }

    const buildChildren = (categoryId: string, parentSubcategoryId: string | null): TreeNode[] => {
      const key = `${categoryId}::${parentSubcategoryId || "root"}`;
      const nodes = [...(grouped.get(key) || [])].sort((a, b) => {
        const sortDelta = (a.sortOrder || 0) - (b.sortOrder || 0);
        if (sortDelta !== 0) return sortDelta;
        return a.name.localeCompare(b.name);
      });

      return nodes.map((subcategory) => ({
        id: `subcategory:${subcategory.id}`,
        label: subcategory.name,
        type: "subcategory",
        parentId: subcategory.parentSubcategory?.id || categoryId,
        children: buildChildren(categoryId, subcategory.id),
      }));
    };

    return categories.map((category) => ({
      id: `category:${category.id}`,
      label: category.name,
      type: "category",
      children: buildChildren(category.id, null),
    }));
  }, [categories, subcategories]);

  const parseNodeRef = (node: TreeNode) => {
    const [type, entityId] = node.id.split(":");
    return { type, entityId };
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
        const categoryId = modalCategoryId || categories[0]?.id;
        if (!categoryId) {
          throw new Error("Select a category before creating subcategory");
        }

        await createSubcategoryNode({
          categoryId,
          parentSubcategoryId: modalParentSubcategoryId || undefined,
          name: cleanName,
          sortOrder: Number(sortOrderInput || "0"),
          isActive: activeInput,
        });
        setMessage("Subcategory created");
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
      openModal("subcategory", entityId, null);
      return;
    }

    if (type === "subcategory") {
      const selected = subcategories.find((item) => item.id === entityId);
      openModal("subcategory", selected?.category?.id || null, entityId);
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
      }
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
      }
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
        subtitle="Expand/collapse, inline edit, and add nested subcategories to unlimited depth."
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
              onClick={() => openModal("subcategory", categories[0]?.id || null, null)}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Subcategory
            </button>
            <button
              type="button"
              onClick={() => {
                const firstSubcategory = subcategories[0];
                openModal(
                  "subcategory",
                  firstSubcategory?.category?.id || categories[0]?.id || null,
                  firstSubcategory?.id || null
                );
              }}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Nested Subcategory
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
  const scopedSubcategories = modalCategoryId
    ? subcategories.filter((subcategory) => subcategory.category?.id === modalCategoryId)
    : [];

  return (
    <Modal
      open={open}
      title={mode === "category" ? "Add Category" : "Add Subcategory"}
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
          Category
          <select
            value={modalCategoryId || ""}
            onChange={(event) => {
              onCategoryChange(event.target.value || null);
              onParentSubcategoryChange(null);
            }}
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

      {mode === "subcategory" ? (
        <label className="block space-y-1 text-sm text-(--text-soft)">
          Parent subcategory (optional)
          <select
            value={modalParentSubcategoryId || ""}
            onChange={(event) => onParentSubcategoryChange(event.target.value || null)}
            className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2"
          >
            <option value="">Root level under selected category</option>
            {scopedSubcategories.map((subcategory) => (
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
