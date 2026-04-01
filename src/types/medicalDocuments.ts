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
