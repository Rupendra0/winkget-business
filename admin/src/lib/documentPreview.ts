export type DocumentKind = "image" | "pdf" | "word" | "other";

export const parseDataUrlMime = (dataUrl: string) => {
  const match = /^data:([^;]+);base64,/i.exec(dataUrl || "");
  return match?.[1]?.toLowerCase() || "";
};

export const inferExtension = (mimeType: string) => {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "bin";
};

export const getDocumentKind = (dataUrl: string): DocumentKind => {
  const mimeType = parseDataUrlMime(dataUrl);

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "word";
  }

  return "other";
};

export const getDocumentTypeLabel = (dataUrl: string) => {
  const kind = getDocumentKind(dataUrl);

  if (kind === "image") return "Image";
  if (kind === "pdf") return "PDF";
  if (kind === "word") return "Word";
  return "File";
};

export const buildDocumentFileName = (label: string, dataUrl: string) => {
  const mimeType = parseDataUrlMime(dataUrl);
  const extension = inferExtension(mimeType);
  const sanitized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${sanitized || "document"}.${extension}`;
};

export const openDocumentInNewTab = (dataUrl: string) => {
  if (!dataUrl) return;
  const tab = window.open();
  if (!tab) return;
  tab.opener = null;
  tab.location.href = dataUrl;
};

export const downloadDocument = (dataUrl: string, fileName: string) => {
  if (!dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const requestFullscreen = async (element: HTMLElement | null) => {
  if (!element) return;

  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  const webkitElement = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  if (webkitElement.webkitRequestFullscreen) {
    await webkitElement.webkitRequestFullscreen();
  }
};
