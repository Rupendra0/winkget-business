const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Uploads a file directly to Cloudinary from the client side using a signed signature.
 * @param file The file to upload.
 * @param folder The target folder in Cloudinary (e.g. 'winkget_documents', 'winkget_products').
 * @returns The secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(file: File, folder: string = "winkget_general"): Promise<string> {
  // 1. Fetch signature parameters from backend
  const response = await fetch(`${BACKEND_URL}/api/media/upload-signature?folder=${encodeURIComponent(folder)}`);
  if (!response.ok) {
    throw new Error("Failed to generate upload signature");
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.message || "Failed to generate upload signature");
  }

  const { signature, timestamp, apiKey, cloudName } = payload;

  // 2. Build FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("folder", folder);

  // 3. Upload to Cloudinary
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const uploadResponse = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to upload file to Cloudinary");
  }

  const result = await uploadResponse.json();
  return result.secure_url;
}
