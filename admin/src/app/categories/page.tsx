"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { uploadToCloudinary } from "@/lib/cloudinaryHelper";
import useSWR from "swr";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/admin/Modal";
import PageLayout from "@/components/admin/PageLayout";
import TreeView, { type TreeNode } from "@/components/admin/TreeView";
import DynamicVendorForm from "@/components/forms/DynamicVendorForm";
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
import { type CustomFormField } from "@/lib/adminClient";

type ModalMode = "category" | "subcategory" | "secondary";
type ModalIntent = "create" | "edit";
type NodeRefType = TreeNode["type"];
type SubcategorySection = {
  category: AdminCategory;
  items: AdminSubcategory[];
};

const ROOT_PARENT_KEY = "root";
const CATEGORY_MEDIA_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const CATEGORY_MEDIA_IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_CATEGORY_MEDIA_UPLOAD_BYTES = 2 * 1024 * 1024;

const isValidCategoryMediaValue = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  return (
    CATEGORY_MEDIA_URL_REGEX.test(normalized) ||
    CATEGORY_MEDIA_IMAGE_DATA_URL_REGEX.test(normalized)
  );
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

const byOrderThenName = <T extends { sortOrder: number; name: string }>(a: T, b: T) => {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
};

const CUSTOM_FIELD_TYPE_OPTIONS: Array<{ value: CustomFormField["type"]; label: string }> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "select", label: "Single Select" },
  { value: "multi-select", label: "Multi Select" },
];

type DraftCustomFormField = {
  draftId: string;
  key: string;
  label: string;
  type: CustomFormField["type"];
  required: boolean;
  placeholder: string;
  helpText: string;
  optionsText: string;
  span: 6 | 12;
  sortOrder: string;
};

const createDraftId = () => `field-${Date.now()}-${Math.round(Math.random() * 100000)}`;

const toFieldKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

const parseDraftOptions = (value: string) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 60);

const createDraftCustomField = (index = 0): DraftCustomFormField => ({
  draftId: createDraftId(),
  key: "",
  label: "",
  type: "text",
  required: false,
  placeholder: "",
  helpText: "",
  optionsText: "",
  span: 12,
  sortOrder: String((index + 1) * 10),
});

const toDraftCustomFormFields = (fields: CustomFormField[] | undefined): DraftCustomFormField[] => {
  const source = Array.isArray(fields) ? [...fields] : [];
  source.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });

  return source.map((field, index) => ({
    draftId: createDraftId(),
    key: String(field.key || ""),
    label: String(field.label || ""),
    type: field.type,
    required: Boolean(field.required),
    placeholder: String(field.placeholder || ""),
    helpText: String(field.helpText || ""),
    optionsText: Array.isArray(field.options) ? field.options.join(", ") : "",
    span: field.span === 6 ? 6 : 12,
    sortOrder: Number.isFinite(Number(field.sortOrder)) ? String(field.sortOrder) : String((index + 1) * 10),
  }));
};

const toCustomFormFieldsPayload = (
  customFormEnabled: boolean,
  draftFields: DraftCustomFormField[]
): CustomFormField[] => {
  if (!customFormEnabled) return [];

  const usedKeys = new Set<string>();
  const nextFields: CustomFormField[] = [];

  draftFields.forEach((draftField, index) => {
    const label = String(draftField.label || "").trim().slice(0, 80);
    if (!label) return;

    const desiredKey = toFieldKey(draftField.key || draftField.label) || `field_${index + 1}`;
    let nextKey = desiredKey;
    let suffix = 2;

    while (usedKeys.has(nextKey)) {
      nextKey = `${desiredKey}_${suffix}`;
      suffix += 1;
    }
    usedKeys.add(nextKey);

    const options = String(draftField.optionsText || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 60);

    nextFields.push({
      key: nextKey,
      label,
      type: draftField.type,
      required: Boolean(draftField.required),
      placeholder: String(draftField.placeholder || "").trim() || undefined,
      helpText: String(draftField.helpText || "").trim() || undefined,
      options: draftField.type === "select" || draftField.type === "multi-select" ? options : [],
      span: draftField.span === 6 ? 6 : 12,
      sortOrder: Number.isFinite(Number(draftField.sortOrder)) ? Number(draftField.sortOrder) : (index + 1) * 10,
    });
  });

  return nextFields.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });
};

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
  const isManageSubcategoryView = viewId === "manage-subcategory";
  const activeItem = findSidebarItem(viewId);

  const [message, setMessage] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<ModalIntent>("create");
  const [modalMode, setModalMode] = useState<ModalMode>("category");
  const [modalCategoryId, setModalCategoryId] = useState<string | null>(null);
  const [modalParentSubcategoryId, setModalParentSubcategoryId] = useState<string | null>(null);
  const [editingNodeRef, setEditingNodeRef] = useState<{ type: "category" | "subcategory"; entityId: string } | null>(
    null
  );
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [deleteTargetNode, setDeleteTargetNode] = useState<TreeNode | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [iconImageInput, setIconImageInput] = useState("");
  const [coverImageInput, setCoverImageInput] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [customFormEnabledInput, setCustomFormEnabledInput] = useState(false);
  const [customFormTitleInput, setCustomFormTitleInput] = useState("");
  const [customFormFieldsInput, setCustomFormFieldsInput] = useState<DraftCustomFormField[]>([]);
  const [subcategorySearchInput, setSubcategorySearchInput] = useState("");

  const { data, error, isLoading, mutate } = useSWR("category-explorer", fetchCategoryExplorer, {
    keepPreviousData: true,
  });

  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const subcategories = useMemo(() => data?.subcategories ?? [], [data?.subcategories]);

  const orderedCategories = useMemo(() => [...categories].sort(byOrderThenName), [categories]);
  const orderedSubcategories = useMemo(() => [...subcategories].sort(byOrderThenName), [subcategories]);

  const categoryById = useMemo(() => {
    const lookup = new Map<string, AdminCategory>();
    for (const category of categories) {
      lookup.set(category.id, category);
    }
    return lookup;
  }, [categories]);

  const subcategoryById = useMemo(() => {
    const lookup = new Map<string, AdminSubcategory>();
    for (const subcategory of subcategories) {
      lookup.set(subcategory.id, subcategory);
    }
    return lookup;
  }, [subcategories]);

  const openCreateModal = useCallback(
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

      setModalIntent("create");
      setModalMode(mode);
      setModalCategoryId(nextCategoryId);
      setModalParentSubcategoryId(nextParentSubcategoryId);
      setEditingNodeRef(null);
      setEditingSubcategoryId(null);
      setNameInput("");
      setIconImageInput("");
      setCoverImageInput("");
      setSortOrderInput("");
      setActiveInput(true);
      setCustomFormEnabledInput(false);
      setCustomFormTitleInput("");
      setCustomFormFieldsInput([]);
      setModalOpen(true);
    },
    [orderedCategories, orderedSubcategories, subcategoryById]
  );

  useEffect(() => {
    if (viewId === "create-category") {
      openCreateModal("category");
    } else if (viewId === "create-subcategory") {
      openCreateModal("subcategory", { categoryId: orderedCategories[0]?.id || null });
    } else if (viewId === "create-secondary-subcategory") {
      openCreateModal("secondary", { parentSubcategoryId: orderedSubcategories[0]?.id || null });
    }
  }, [openCreateModal, orderedCategories, orderedSubcategories, viewId]);

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
          type: parentSubcategoryId ? "secondary" : "subcategory",
          parentId: parentSubcategoryId ? `subcategory:${parentSubcategoryId}` : `category:${categoryId}`,
          categoryId,
          parentSubcategoryId: parentSubcategoryId || undefined,
          mediaUrl: String(subcategory.icon || "").trim() || undefined,
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
      mediaUrl: String(category.icon || "").trim() || undefined,
      categoryId: category.id,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      children: buildSubcategoryChildren(category.id, null, new Set<string>()),
    }));
  }, [orderedCategories, orderedSubcategories]);

  const subcategorySections = useMemo<SubcategorySection[]>(() => {
    const grouped = new Map<string, AdminSubcategory[]>();
    const normalizedSearch = subcategorySearchInput.trim().toLowerCase();

    for (const subcategory of orderedSubcategories) {
      if (subcategory.parentSubcategory?.id) continue;

      const categoryId = subcategory.category?.id;
      if (!categoryId) continue;

      const siblings = grouped.get(categoryId);
      if (siblings) {
        siblings.push(subcategory);
      } else {
        grouped.set(categoryId, [subcategory]);
      }
    }

    for (const siblings of grouped.values()) {
      siblings.sort(byOrderThenName);
    }

    return orderedCategories
      .map((category) => {
        const items = grouped.get(category.id) || [];
        if (!normalizedSearch) {
          return {
            category,
            items,
          };
        }

        const categoryMatch = category.name.toLowerCase().includes(normalizedSearch);
        return {
          category,
          items: categoryMatch
            ? items
            : items.filter((item) => item.name.toLowerCase().includes(normalizedSearch)),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [orderedCategories, orderedSubcategories, subcategorySearchInput]);

  const parseNodeRef = useCallback((node: TreeNode) => {
    const [typeToken, ...entityParts] = node.id.split(":");
    return {
      type: typeToken as NodeRefType,
      entityId: entityParts.join(":"),
    };
  }, []);

  const openEditModal = useCallback(
    (node: TreeNode) => {
      const { type, entityId } = parseNodeRef(node);
      setMessage(null);
      setErrorText(null);

      if (type === "category") {
        const category = categoryById.get(entityId);
        if (!category) {
          setErrorText("Category not found for editing");
          return;
        }

        setModalIntent("edit");
        setModalMode("category");
        setModalCategoryId(category.id);
        setModalParentSubcategoryId(null);
        setEditingNodeRef({ type: "category", entityId });
        setEditingSubcategoryId(null);
        setNameInput(category.name || "");
        setIconImageInput(String(category.icon || ""));
        setCoverImageInput("");
        setSortOrderInput(String(Number.isFinite(Number(category.sortOrder)) ? category.sortOrder : 0));
        setActiveInput(Boolean(category.isActive));
        setCustomFormEnabledInput(Boolean(category.customFormEnabled));
        setCustomFormTitleInput(String(category.customFormTitle || ""));
        setCustomFormFieldsInput(toDraftCustomFormFields(category.customFormFields));
        setModalOpen(true);
        return;
      }

      if (type === "subcategory") {
        const subcategory = subcategoryById.get(entityId);
        if (!subcategory) {
          setErrorText("Subcategory not found for editing");
          return;
        }

        setModalIntent("edit");
        setModalMode("subcategory");
        setModalCategoryId(subcategory.category?.id || node.categoryId || orderedCategories[0]?.id || null);
        setModalParentSubcategoryId(subcategory.parentSubcategory?.id || null);
        setEditingNodeRef({ type: "subcategory", entityId });
        setEditingSubcategoryId(entityId);
        setNameInput(subcategory.name || "");
        setIconImageInput(String(subcategory.icon || ""));
        setCoverImageInput(String(subcategory.coverImage || ""));
        setSortOrderInput(String(Number.isFinite(Number(subcategory.sortOrder)) ? subcategory.sortOrder : 0));
        setActiveInput(Boolean(subcategory.isActive));
        setCustomFormEnabledInput(Boolean(subcategory.customFormEnabled));
        setCustomFormTitleInput(String(subcategory.customFormTitle || ""));
        setCustomFormFieldsInput(toDraftCustomFormFields(subcategory.customFormFields));
        setModalOpen(true);
        return;
      }

      setErrorText("This node type cannot be edited.");
    },
    [categoryById, orderedCategories, parseNodeRef, subcategoryById]
  );

  const submitModal = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setErrorText(null);

    try {
      const cleanName = nameInput.trim();
      if (!cleanName) {
        throw new Error("Name is required");
      }

      const normalizedSortOrderInput = String(sortOrderInput || "").trim();
      let parsedSortOrder: number | undefined;
      if (normalizedSortOrderInput) {
        const numericSortOrder = Number(normalizedSortOrderInput);
        if (!Number.isFinite(numericSortOrder) || !Number.isInteger(numericSortOrder)) {
          throw new Error("Position must be a whole number");
        }
        parsedSortOrder = numericSortOrder;
      }

      const customFormFields = toCustomFormFieldsPayload(customFormEnabledInput, customFormFieldsInput);
      const customFormEnabled = customFormEnabledInput && customFormFields.length > 0;
      const customFormTitle = customFormTitleInput.trim();
      const categoryIconImage = iconImageInput.trim();
      const subcategoryIconImage = iconImageInput.trim();
      const subcategoryCoverImage = coverImageInput.trim();

      if (modalMode === "category" && !isValidCategoryMediaValue(categoryIconImage)) {
        throw new Error("Category icon must be a valid URL or uploaded image");
      }

      if (modalMode !== "category" && !isValidCategoryMediaValue(subcategoryIconImage)) {
        throw new Error("Subcategory icon must be a valid URL or uploaded image");
      }

      if (modalMode !== "category" && subcategoryCoverImage && !isValidCategoryMediaValue(subcategoryCoverImage)) {
        throw new Error("Subcategory cover image must be a valid URL or uploaded image");
      }

      if (modalIntent === "create") {
        if (modalMode === "category") {
          await createCategoryNode({
            name: cleanName,
            icon: categoryIconImage || undefined,
            sortOrder: parsedSortOrder,
            isActive: activeInput,
            customFormEnabled,
            customFormTitle,
            customFormFields,
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
            icon: subcategoryIconImage || undefined,
            coverImage: subcategoryCoverImage || undefined,
            sortOrder: parsedSortOrder,
            isActive: activeInput,
            customFormEnabled,
            customFormTitle,
            customFormFields,
          });
          setMessage(modalMode === "secondary" ? "Secondary subcategory created" : "Subcategory created");
        }
      } else {
        if (!editingNodeRef) {
          throw new Error("No node selected for editing");
        }

        if (editingNodeRef.type === "category") {
          await updateCategoryNode(editingNodeRef.entityId, {
            name: cleanName,
            icon: categoryIconImage,
            sortOrder: parsedSortOrder,
            isActive: activeInput,
            customFormEnabled,
            customFormTitle,
            customFormFields,
          });
          setMessage("Category updated");
        }

        if (editingNodeRef.type === "subcategory") {
          const categoryId = modalCategoryId || subcategoryById.get(editingNodeRef.entityId)?.category?.id;
          if (!categoryId) {
            throw new Error("No category selected for subcategory");
          }

          await updateSubcategoryNode(editingNodeRef.entityId, {
            categoryId,
            parentSubcategoryId: modalParentSubcategoryId || "",
            name: cleanName,
            icon: subcategoryIconImage,
            coverImage: subcategoryCoverImage,
            sortOrder: parsedSortOrder,
            isActive: activeInput,
            customFormEnabled,
            customFormTitle,
            customFormFields,
          });
          setMessage("Subcategory updated");
        }
      }

      setModalOpen(false);
      setEditingNodeRef(null);
      setEditingSubcategoryId(null);
      await mutate();
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : "Save operation failed";
      setErrorText(messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = (node: TreeNode) => {
    const { type, entityId } = parseNodeRef(node);

    if (type === "category") {
      openCreateModal("subcategory", { categoryId: entityId });
      return;
    }

    if (type === "subcategory") {
      openCreateModal("secondary", {
        categoryId: node.categoryId || subcategoryById.get(entityId)?.category?.id || null,
        parentSubcategoryId: entityId,
      });
      return;
    }

    openCreateModal("secondary", {
      categoryId: node.categoryId || null,
      parentSubcategoryId: node.parentSubcategoryId || null,
    });
  };

  const handleDeleteRequest = (node: TreeNode) => {
    setMessage(null);
    setErrorText(null);
    setDeleteTargetNode(node);
  };

  const confirmDelete = async () => {
    if (!deleteTargetNode) return;

    const { type, entityId } = parseNodeRef(deleteTargetNode);
    setDeleteSubmitting(true);
    setMessage(null);
    setErrorText(null);

    try {
      if (type === "category") {
        await deleteCategoryNode(entityId);
        setMessage("Category deleted");
      } else if (type === "subcategory") {
        await deleteSubcategoryNode(entityId);
        setMessage("Subcategory deleted");
      } else {
        throw new Error("This node type cannot be deleted");
      }

      setDeleteTargetNode(null);
      await mutate();
    } catch (deleteError) {
      const messageText = deleteError instanceof Error ? deleteError.message : "Delete operation failed";
      setErrorText(messageText);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleReorder = async (updates: Array<{ node: TreeNode; sortOrder: number }>) => {
    if (!updates.length) return;

    setMessage(null);
    setErrorText(null);

    try {
      await Promise.all(
        updates.map(async ({ node, sortOrder }) => {
          const { type, entityId } = parseNodeRef(node);

          if (type === "category") {
            await updateCategoryNode(entityId, { sortOrder });
            return;
          }

          if (type === "subcategory") {
            await updateSubcategoryNode(entityId, { sortOrder });
            return;
          }

          throw new Error("This node type does not support sorting");
        })
      );

      await mutate();
      setMessage("Order updated");
    } catch (reorderError) {
      const messageText = reorderError instanceof Error ? reorderError.message : "Unable to update position";
      setErrorText(messageText);
    }
  };

  return (
    <AdminShell title="Category Explorer" subtitle="Nested tree editing for category structures.">
      <PageLayout
        title={activeItem?.label || "Category Explorer"}
        subtitle="Manage category hierarchy through tiles and popup action cards."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateModal("category")}
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add Category
            </button>
            <button
              type="button"
              onClick={() =>
                openCreateModal("subcategory", {
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
                openCreateModal("secondary", {
                  parentSubcategoryId: orderedSubcategories[0]?.id || null,
                })
              }
              className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs text-(--text-soft) hover:bg-(--surface-hover)"
            >
              Add more
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
        ) : isManageSubcategoryView ? (
          <section className="space-y-3">
            <div className="max-w-md">
              <label htmlFor="subcategory-search" className="sr-only">
                Search subcategories
              </label>
              <input
                id="subcategory-search"
                value={subcategorySearchInput}
                onChange={(event) => setSubcategorySearchInput(event.target.value)}
                placeholder="Search categories or subcategories"
                className="w-full rounded-full bg-(--surface-muted) px-4 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            {subcategorySections.length === 0 ? (
              <section className="rounded-xl bg-(--surface) px-3 py-8 text-center text-sm text-(--text-soft)">
                {subcategorySearchInput.trim()
                  ? "No subcategories matched your search."
                  : "No top-level subcategories found yet."}
              </section>
            ) : (
              subcategorySections.map((section) => (
                <article key={section.category.id} className="space-y-2 px-1 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-(--text-strong)">{section.category.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-500">{section.items.length} subcategories</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {section.items.map((subcategory) => {
                      const iconUrl = String(subcategory.icon || "").trim();

                      return (
                        <button
                          key={subcategory.id}
                          type="button"
                          onClick={() =>
                            openEditModal({
                              id: `subcategory:${subcategory.id}`,
                              label: subcategory.name,
                              type: "subcategory",
                              parentId: `category:${section.category.id}`,
                              categoryId: section.category.id,
                              mediaUrl: iconUrl || undefined,
                              sortOrder: subcategory.sortOrder,
                              isActive: subcategory.isActive,
                              description: subcategory.description,
                              createdAt: subcategory.createdAt,
                              updatedAt: subcategory.updatedAt,
                              children: [],
                            })
                          }
                          className="group flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300"
                          title="Click to edit subcategory"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                            {iconUrl ? (
                              <img src={iconUrl} alt={`${subcategory.name} icon`} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-xs font-semibold uppercase text-slate-600">
                                {String(subcategory.name || "S").trim().charAt(0) || "S"}
                              </span>
                            )}
                          </span>

                          <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-slate-800">{subcategory.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : (
          <TreeView
            nodes={treeNodes}
            onAdd={handleAdd}
            onEdit={openEditModal}
            onDelete={handleDeleteRequest}
            onReorder={handleReorder}
          />
        )}
      </PageLayout>

      <CreateNodeModal
        open={modalOpen}
        intent={modalIntent}
        mode={modalMode}
        categories={categories}
        subcategories={subcategories}
        nameInput={nameInput}
        sortOrderInput={sortOrderInput}
        iconImageInput={iconImageInput}
        coverImageInput={coverImageInput}
        activeInput={activeInput}
        customFormEnabledInput={customFormEnabledInput}
        customFormTitleInput={customFormTitleInput}
        customFormFieldsInput={customFormFieldsInput}
        modalCategoryId={modalCategoryId}
        modalParentSubcategoryId={modalParentSubcategoryId}
        editingSubcategoryId={editingSubcategoryId}
        submitting={isSubmitting}
        onNameChange={setNameInput}
        onIconImageChange={setIconImageInput}
        onCoverImageChange={setCoverImageInput}
        onSortOrderChange={setSortOrderInput}
        onActiveChange={setActiveInput}
        onCustomFormEnabledChange={setCustomFormEnabledInput}
        onCustomFormTitleChange={setCustomFormTitleInput}
        onCustomFormFieldsChange={setCustomFormFieldsInput}
        onCategoryChange={setModalCategoryId}
        onParentSubcategoryChange={setModalParentSubcategoryId}
        onClose={() => {
          if (isSubmitting) return;
          setModalOpen(false);
          setEditingNodeRef(null);
          setEditingSubcategoryId(null);
        }}
        onSubmit={() => void submitModal()}
      />

      <Modal
        open={Boolean(deleteTargetNode)}
        title="Delete node"
        onClose={() => {
          if (deleteSubmitting) return;
          setDeleteTargetNode(null);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTargetNode(null)}
              disabled={deleteSubmitting}
              className="rounded-lg border border-(--border) px-3 py-1.5 text-xs text-(--text-soft)"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleteSubmitting}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
            >
              {deleteSubmitting ? "Deleting..." : "Yes, delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-(--text-soft)">
          Are you sure you want to delete <span className="font-semibold text-(--text-strong)">{deleteTargetNode?.label}</span>
          ? This will also remove all nested children.
        </p>
      </Modal>
    </AdminShell>
  );
}

type CreateNodeModalProps = {
  open: boolean;
  intent: ModalIntent;
  mode: ModalMode;
  categories: AdminCategory[];
  subcategories: AdminSubcategory[];
  nameInput: string;
  iconImageInput: string;
  coverImageInput: string;
  sortOrderInput: string;
  activeInput: boolean;
  customFormEnabledInput: boolean;
  customFormTitleInput: string;
  customFormFieldsInput: DraftCustomFormField[];
  modalCategoryId: string | null;
  modalParentSubcategoryId: string | null;
  editingSubcategoryId: string | null;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onIconImageChange: (value: string) => void;
  onCoverImageChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onCustomFormEnabledChange: (value: boolean) => void;
  onCustomFormTitleChange: (value: string) => void;
  onCustomFormFieldsChange: (value: DraftCustomFormField[]) => void;
  onCategoryChange: (value: string | null) => void;
  onParentSubcategoryChange: (value: string | null) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function CreateNodeModal({
  open,
  intent,
  mode,
  categories,
  subcategories,
  nameInput,
  iconImageInput,
  coverImageInput,
  sortOrderInput,
  activeInput,
  customFormEnabledInput,
  customFormTitleInput,
  customFormFieldsInput,
  modalCategoryId,
  modalParentSubcategoryId,
  editingSubcategoryId,
  submitting,
  onNameChange,
  onIconImageChange,
  onCoverImageChange,
  onSortOrderChange,
  onActiveChange,
  onCustomFormEnabledChange,
  onCustomFormTitleChange,
  onCustomFormFieldsChange,
  onCategoryChange,
  onParentSubcategoryChange,
  onClose,
  onSubmit,
}: CreateNodeModalProps) {
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (open) {
      setIconUploadError(null);
      setCoverUploadError(null);
    }
  }, [open]);

  const parentOptions = useMemo(
    () =>
      buildSubcategoryOptions(
        subcategories,
        modalCategoryId,
        new Set(editingSubcategoryId ? [editingSubcategoryId] : [])
      ),
    [editingSubcategoryId, modalCategoryId, subcategories]
  );

  const parentRequired = mode === "secondary";
  const customFieldCount = useMemo(
    () => toCustomFormFieldsPayload(customFormEnabledInput, customFormFieldsInput).length,
    [customFormEnabledInput, customFormFieldsInput]
  );

  const previewFields = useMemo(() => {
    if (!customFormEnabledInput) return [] as CustomFormField[];

    const usedKeys = new Set<string>();
    const next: CustomFormField[] = [];

    customFormFieldsInput.forEach((draftField, index) => {
      const label = String(draftField.label || "").trim().slice(0, 80);
      if (!label) return;

      const desiredKey = toFieldKey(draftField.key || draftField.label) || `field_${index + 1}`;
      let nextKey = desiredKey;
      let suffix = 2;
      while (usedKeys.has(nextKey)) {
        nextKey = `${desiredKey}_${suffix}`;
        suffix += 1;
      }
      usedKeys.add(nextKey);

      const options =
        draftField.type === "select" || draftField.type === "multi-select" ? parseDraftOptions(draftField.optionsText) : [];

      next.push({
        key: nextKey,
        label,
        type: draftField.type,
        required: Boolean(draftField.required),
        placeholder: String(draftField.placeholder || "").trim() || undefined,
        helpText: String(draftField.helpText || "").trim() || undefined,
        options,
        span: draftField.span === 6 ? 6 : 12,
        sortOrder: Number.isFinite(Number(draftField.sortOrder)) ? Number(draftField.sortOrder) : (index + 1) * 10,
      });
    });

    return next.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.label.localeCompare(right.label);
    });
  }, [customFormEnabledInput, customFormFieldsInput]);

  const modalTitle =
    intent === "create"
      ? mode === "category"
        ? "Add Category"
        : mode === "subcategory"
          ? "Add Subcategory"
          : "Add Secondary Subcategory"
      : mode === "category"
        ? "Edit Category"
        : mode === "subcategory"
          ? "Edit Subcategory"
          : "Edit Secondary Subcategory";

  const submitLabel = submitting ? "Saving..." : intent === "create" ? "Create" : "Update";

  const disableSave =
    submitting ||
    !nameInput.trim() ||
    (mode !== "category" && !modalCategoryId) ||
    (parentRequired && !modalParentSubcategoryId) ||
    (customFormEnabledInput && customFieldCount === 0);

  const addCustomField = () => {
    onCustomFormFieldsChange([...customFormFieldsInput, createDraftCustomField(customFormFieldsInput.length)]);
  };

  const handleMediaFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const label = "Icon image";

    if (!file.type.startsWith("image/")) {
      setIconUploadError("Please upload an image file only.");
      return;
    }

    if (file.size > MAX_CATEGORY_MEDIA_UPLOAD_BYTES) {
      setIconUploadError(`${label} must be under 2MB.`);
      return;
    }

    try {
      setIconUploadError("Uploading icon...");
      const imageData = await uploadToCloudinary(file, "winkget_categories");
      onIconImageChange(imageData);
      setIconUploadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload the selected image. Please try again.";
      setIconUploadError(message);
    }
  };

  const handleIconFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    void handleMediaFileUpload(event);
  };

  const handleCoverMediaFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const label = "Cover image";

    if (!file.type.startsWith("image/")) {
      setCoverUploadError("Please upload an image file only.");
      return;
    }

    if (file.size > MAX_CATEGORY_MEDIA_UPLOAD_BYTES) {
      setCoverUploadError(`${label} must be under 2MB.`);
      return;
    }

    try {
      setCoverUploadError("Uploading cover...");
      const imageData = await uploadToCloudinary(file, "winkget_categories");
      onCoverImageChange(imageData);
      setCoverUploadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload the selected image. Please try again.";
      setCoverUploadError(message);
    }
  };

  const handleCoverFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    void handleCoverMediaFileUpload(event);
  };

  const updateCustomField = (draftId: string, patch: Partial<DraftCustomFormField>) => {
    onCustomFormFieldsChange(
      customFormFieldsInput.map((field) => {
        if (field.draftId !== draftId) return field;
        const nextField = { ...field, ...patch };
        if (patch.label !== undefined) {
          nextField.key = toFieldKey(nextField.label);
        }
        return nextField;
      })
    );
  };

  const removeCustomField = (draftId: string) => {
    onCustomFormFieldsChange(customFormFieldsInput.filter((field) => field.draftId !== draftId));
  };

  const customFormSourceLabel =
    mode === "category"
      ? "for this category"
      : mode === "subcategory"
        ? "for this subcategory"
        : "for this nested subcategory";

  return (
    <Modal
      open={open}
      title={modalTitle}
      onClose={onClose}
      panelClassName={customFormEnabledInput ? "!max-w-5xl" : undefined}
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
            {submitLabel}
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

      {mode === "category" ? (
        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-1 block text-xs font-semibold text-(--text-soft)">Category icon image</span>
          {iconImageInput ? (
            <div className="flex items-center gap-4 border border-slate-200 bg-white rounded-lg p-3">
              <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-105 flex items-center justify-center shrink-0 p-1">
                <img
                  src={iconImageInput}
                  alt="Category icon preview"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center text-center">
                  Change Icon
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconFileUpload} />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onIconImageChange("");
                    setIconUploadError(null);
                  }}
                  className="border border-slate-200 bg-slate-50 hover:bg-slate-105 text-slate-600 px-4 py-1.5 rounded-md text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-white">
              <p className="text-xs text-slate-400 mb-2">No icon uploaded yet</p>
              <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center">
                Upload Icon
                <input type="file" accept="image/*" className="hidden" onChange={handleIconFileUpload} />
              </label>
            </div>
          )}
          {iconUploadError ? <p className="text-xs text-rose-700">{iconUploadError}</p> : null}
        </section>
      ) : null}

      {mode !== "category" ? (
        <section className="space-y-4">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold text-(--text-soft)">Subcategory icon image</span>
            {iconImageInput ? (
              <div className="flex items-center gap-4 border border-slate-200 bg-white rounded-lg p-3">
                <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-105 flex items-center justify-center shrink-0 p-1">
                  <img
                    src={iconImageInput}
                    alt="Subcategory icon preview"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center text-center">
                    Change Icon
                    <input type="file" accept="image/*" className="hidden" onChange={handleIconFileUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onIconImageChange("");
                      setIconUploadError(null);
                    }}
                    className="border border-slate-200 bg-slate-50 hover:bg-slate-105 text-slate-600 px-4 py-1.5 rounded-md text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-white">
                <p className="text-xs text-slate-400 mb-2">No icon uploaded yet</p>
                <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center">
                  Upload Icon
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconFileUpload} />
                </label>
              </div>
            )}
            {iconUploadError ? <p className="text-xs text-rose-700">{iconUploadError}</p> : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold text-(--text-soft)">Subcategory cover image</span>
            {coverImageInput ? (
              <div className="flex items-center gap-4 border border-slate-200 bg-white rounded-lg p-3">
                <img
                  src={coverImageInput}
                  alt="Subcategory cover preview"
                  className="h-20 w-32 rounded-lg object-cover border border-slate-200 bg-slate-105 shrink-0"
                  loading="lazy"
                />
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center text-center">
                    Change Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onCoverImageChange("");
                      setCoverUploadError(null);
                    }}
                    className="border border-slate-200 bg-slate-50 hover:bg-slate-105 text-slate-600 px-4 py-1.5 rounded-md text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-white">
                <p className="text-xs text-slate-400 mb-2">No cover image uploaded yet</p>
                <label className="cursor-pointer bg-(--accent) hover:brightness-95 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center">
                  Upload Cover
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                </label>
              </div>
            )}
            {coverUploadError ? <p className="text-xs text-rose-700">{coverUploadError}</p> : null}
          </div>
        </section>
      ) : null}

      <label className="block space-y-1 text-sm text-(--text-soft)">
        Position (optional)
        <input
          type="number"
          value={sortOrderInput}
          onChange={(event) => onSortOrderChange(event.target.value)}
          className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-2 outline-none focus:border-(--accent)"
          placeholder="Leave empty for automatic placement"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-(--text-soft)">
        <input type="checkbox" checked={activeInput} onChange={(event) => onActiveChange(event.target.checked)} />
        Active
      </label>

      <section className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-sky-900">
          <input
            type="checkbox"
            checked={customFormEnabledInput}
            onChange={(event) => onCustomFormEnabledChange(event.target.checked)}
          />
          Enable additional vendor form {customFormSourceLabel}
        </label>

        {!customFormEnabledInput ? (
          <p className="text-xs text-sky-800">
            Turn this on to collect custom details on vendor registration and admin user forms.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm text-sky-900">
              Form title (optional)
              <input
                value={customFormTitleInput}
                onChange={(event) => onCustomFormTitleChange(event.target.value)}
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="Additional business details"
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-800">
                  Fields ({customFieldCount} valid)
                </p>

                {customFormFieldsInput.length === 0 ? (
                  <div className="space-y-2">
                    <p className="rounded-lg border border-dashed border-sky-300 bg-white px-3 py-2 text-xs text-sky-800">
                      Add at least one field to enable this custom form.
                    </p>
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                    >
                      Add field
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customFormFieldsInput.map((field, index) => (
                      <article key={field.draftId} className="space-y-2 rounded-lg border border-sky-200 bg-white p-2.5">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block space-y-1 text-xs text-slate-700">
                            Label
                            <input
                              value={field.label}
                              onChange={(event) => updateCustomField(field.draftId, { label: event.target.value })}
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-sky-500"
                              placeholder="Field label"
                            />
                          </label>

                          <label className="block space-y-1 text-xs text-slate-700">
                            Type
                            <select
                              value={field.type}
                              onChange={(event) =>
                                updateCustomField(field.draftId, {
                                  type: event.target.value as CustomFormField["type"],
                                })
                              }
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5"
                            >
                              {CUSTOM_FIELD_TYPE_OPTIONS.map((typeOption) => (
                                <option key={typeOption.value} value={typeOption.value}>
                                  {typeOption.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block space-y-1 text-xs text-slate-700">
                            Position
                            <input
                              type="number"
                              value={field.sortOrder}
                              onChange={(event) => updateCustomField(field.draftId, { sortOrder: event.target.value })}
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-sky-500"
                            />
                          </label>

                          <label className="block space-y-1 text-xs text-slate-700">
                            Row type
                            <select
                              value={field.span}
                              onChange={(event) =>
                                updateCustomField(field.draftId, {
                                  span: event.target.value === "6" ? 6 : 12,
                                })
                              }
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5"
                            >
                              <option value="12">Full width</option>
                              <option value="6">Half width</option>
                            </select>
                          </label>

                          <label className="flex items-end gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) => updateCustomField(field.draftId, { required: event.target.checked })}
                            />
                            Required field
                          </label>
                        </div>

                        <label className="block space-y-1 text-xs text-slate-700">
                          Placeholder
                          <input
                            value={field.placeholder}
                            onChange={(event) => updateCustomField(field.draftId, { placeholder: event.target.value })}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-sky-500"
                            placeholder="Placeholder text"
                          />
                        </label>

                        <label className="block space-y-1 text-xs text-slate-700">
                          Help text
                          <input
                            value={field.helpText}
                            onChange={(event) => updateCustomField(field.draftId, { helpText: event.target.value })}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-sky-500"
                            placeholder="Optional helper text"
                          />
                        </label>

                        {field.type === "select" || field.type === "multi-select" ? (
                          <label className="block space-y-1 text-xs text-slate-700">
                            Options (comma separated)
                            <input
                              value={field.optionsText}
                              onChange={(event) => updateCustomField(field.draftId, { optionsText: event.target.value })}
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-sky-500"
                              placeholder="Option A, Option B, Option C"
                            />
                          </label>
                        ) : null}

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-500">Field #{index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.draftId)}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}

                    <button
                      type="button"
                      onClick={addCustomField}
                      className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                    >
                      Add field
                    </button>
                  </div>
                )}
              </section>

              <aside className="space-y-3 self-start lg:sticky lg:top-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Live preview</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Preview mode</span>
                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("desktop")}
                        className={`px-2.5 py-1 text-[11px] font-semibold ${
                          previewMode === "desktop" ? "bg-white text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("mobile")}
                        className={`px-2.5 py-1 text-[11px] font-semibold ${
                          previewMode === "mobile" ? "bg-white text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>
                </div>

                {previewFields.length > 0 ? (
                  <DynamicVendorForm
                    fields={previewFields}
                    title={String(customFormTitleInput || "").trim() || "Additional details"}
                    previewMode={previewMode}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-xs text-slate-500">
                    Add fields to see a preview.
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </section>
    </Modal>
  );
}

function buildSubcategoryOptions(
  subcategories: AdminSubcategory[],
  categoryId: string | null,
  blockedIds?: Set<string>
) {
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
      if (blockedIds?.has(sibling.id)) continue;

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
