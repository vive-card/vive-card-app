export type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
  owner_user_id?: string | null;
  created_at?: string | null;
  activated?: boolean | null;
  blocked_at?: string | null;

  full_name?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  medications?: string | null;
  emergency_note?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
};

export type EmergencyCardData = {
  name?: string;
  dob?: string;
  blood?: string;
  allergies?: string;
  bloodThinner?: string;
  meds?: string;
  vaccines?: string;
  chronic?: string;
  organ?: string;
  notes?: string;
  em1_name?: string;
  em1?: string;
  em2_name?: string;
  em2?: string;
};

export type EmergencyCardRow = {
  id?: string;
  public_id: string;
  owner_id?: string | null;
  data: EmergencyCardData | null;
  updated_at?: string | null;
};

export type ProfileFormValues = {
  name: string;
  dob: string;
  blood: string;
  allergies: string;
  bloodThinner: string;
  meds: string;
  vaccines: string;
  chronic: string;
  organ: string;
  notes: string;
  em1_name: string;
  em1: string;
  em2_name: string;
  em2: string;
};

export type CurrentUserCardProfileResult = {
  user: any;
  card: CardRow | null;
  profile: EmergencyCardRow | null;
};

export const initialProfileForm: ProfileFormValues = {
  name: "",
  dob: "",
  blood: "",
  allergies: "",
  bloodThinner: "",
  meds: "",
  vaccines: "",
  chronic: "",
  organ: "",
  notes: "",
  em1_name: "",
  em1: "",
  em2_name: "",
  em2: "",
};

export const BLOOD_GROUP_OPTIONS = [
  "",
  "0 negative",
  "0 positive",
  "A negative",
  "A positive",
  "B negative",
  "B positive",
  "AB negative",
  "AB positive",
] as const;

export type BloodGroupOption = (typeof BLOOD_GROUP_OPTIONS)[number];
