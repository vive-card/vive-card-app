import { supabase } from "../lib/supabase";
import { isImageMime } from "../utils/medicalDocuments";

export type MedicalDocumentRow = {
  id: string;
  owner_id?: string | null;
  public_id: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export type MedicalDocumentViewRow = MedicalDocumentRow & {
  preview_url?: string | null;
};

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

export async function getSignedDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("medical-docs")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Dokument konnte nicht geöffnet werden");
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
        return {
          ...doc,
          preview_url: null,
        };
      }

      try {
        const previewUrl = await getSignedDocumentUrl(doc.file_path);
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
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number | null;
  userId: string;
  publicId: string;
}) {
  const ext = guessExtension(params.fileName, params.mimeType);
  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const filePath = `${params.userId}/${params.publicId}/${uniqueName}`;

  const arrayBuffer = await uriToArrayBuffer(params.uri);

  const { error: uploadError } = await supabase.storage
    .from("medical-docs")
    .upload(filePath, arrayBuffer, {
      contentType: params.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Upload fehlgeschlagen: " + uploadError.message);
  }

  const { error: insertError } = await supabase.from("medical_documents").insert({
    owner_id: params.userId,
    public_id: params.publicId,
    file_name: params.fileName,
    file_path: filePath,
    mime_type: params.mimeType || "application/octet-stream",
    file_size: params.fileSize || null,
  });

  if (insertError) {
    throw new Error("DB-Eintrag fehlgeschlagen: " + insertError.message);
  }
}

export async function deleteMedicalDocument(docId: string, filePath: string) {
  const { error: storageError } = await supabase.storage
    .from("medical-docs")
    .remove([filePath]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: dbError } = await supabase
    .from("medical_documents")
    .delete()
    .eq("id", docId);

  if (dbError) {
    throw new Error(dbError.message);
  }
}