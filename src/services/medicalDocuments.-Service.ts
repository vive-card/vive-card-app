import { supabase } from "../lib/supabase";
import type {
  MedicalDocumentRow,
  MedicalDocumentViewRow,
} from "../types/medicalDocuments";
import { isImageMime } from "../utils/formatters";

function guessExtension(fileName?: string | null, mimeType?: string | null) {
  const name = String(fileName || "").toLowerCase();

  if (name.includes(".")) {
    return name.split(".").pop() || "bin";
  }

  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";

  return "bin";
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

export async function getSignedMedicalDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("medical-docs")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Signed URL konnte nicht erstellt werden");
  }

  return data.signedUrl;
}

export async function loadMedicalDocuments(
  publicId: string
): Promise<MedicalDocumentViewRow[]> {
  const { data, error } = await supabase
    .from("medical_documents")
    .select(
      "id, owner_id, public_id, file_name, file_path, mime_type, file_size, created_at"
    )
    .eq("public_id", publicId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Dokumente konnten nicht geladen werden: " + error.message);
  }

  const rows = (data || []) as MedicalDocumentRow[];

  const rowsWithPreview = await Promise.all(
    rows.map(async (doc) => {
      if (!isImageMime(doc.mime_type)) {
        return { ...doc, preview_url: null };
      }

      try {
        const previewUrl = await getSignedMedicalDocumentUrl(doc.file_path);

        return {
          ...doc,
          preview_url: previewUrl,
        };
      } catch {
        return {
          ...doc,
          preview_url: null,
        };
      }
    })
  );

  return rowsWithPreview;
}

export async function uploadMedicalDocument(params: {
  userId: string;
  publicId: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number | null;
}) {
  const { userId, publicId, uri, fileName, mimeType, fileSize } = params;

  if (!userId || !publicId) {
    throw new Error("User oder Karte fehlt");
  }

  const ext = guessExtension(fileName, mimeType);
  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const filePath = `${userId}/${publicId}/${uniqueName}`;

  const arrayBuffer = await uriToArrayBuffer(uri);

  const { error: uploadError } = await supabase.storage
    .from("medical-docs")
    .upload(filePath, arrayBuffer, {
      contentType: mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Upload fehlgeschlagen: " + uploadError.message);
  }

  const { error: insertError } = await supabase
    .from("medical_documents")
    .insert({
      owner_id: userId,
      public_id: publicId,
      file_name: fileName,
      file_path: filePath,
      mime_type: mimeType || "application/octet-stream",
      file_size: fileSize || null,
    });

  if (insertError) {
    throw new Error("DB-Eintrag fehlgeschlagen: " + insertError.message);
  }

  return {
    file_path: filePath,
  };
}

export async function deleteMedicalDocument(
  documentId: string,
  filePath: string,
  publicId?: string
) {
  const { error: storageError } = await supabase.storage
    .from("medical-docs")
    .remove([filePath]);

  if (storageError) {
    throw new Error("Storage-Löschen fehlgeschlagen: " + storageError.message);
  }

  let query = supabase.from("medical_documents").delete().eq("id", documentId);

  if (publicId) {
    query = query.eq("public_id", publicId);
  }

  const { error: dbError } = await query;

  if (dbError) {
    throw new Error("DB-Löschen fehlgeschlagen: " + dbError.message);
  }

  return true;
}
