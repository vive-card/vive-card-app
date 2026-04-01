import { supabase } from "../lib/supabase";

export type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
  owner_user_id?: string | null;
  created_at?: string | null;
};

export type ProfileRow = {
  id?: string;
  card_id: string;
  public_id?: string | null;
  owner_user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  diagnoses?: string | null;
  medications?: string | null;
  implants?: string | null;
  language?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_notes?: string | null;
  updated_at?: string | null;
};

export type ProfileFormValues = {
  first_name: string;
  last_name: string;
  birth_date: string;
  blood_type: string;
  allergies: string;
  diagnoses: string;
  medications: string;
  implants: string;
  language: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  emergency_contact_notes: string;
};

export type CurrentUserCardProfileResult = {
  user: any;
  card: CardRow | null;
  profile: ProfileRow | null;
};

export const initialProfileForm: ProfileFormValues = {
  first_name: "",
  last_name: "",
  birth_date: "",
  blood_type: "",
  allergies: "",
  diagnoses: "",
  medications: "",
  implants: "",
  language: "de",
  emergency_contact_name: "",
  emergency_contact_relation: "",
  emergency_contact_phone: "",
  emergency_contact_notes: "",
};

export function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeDate(value: string | null | undefined) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const dotMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, dd, mm, yyyy] = dotMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return clean;
  }

  return clean;
}

export function mapProfileToForm(
  profile?: ProfileRow | null
): ProfileFormValues {
  return {
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    birth_date: normalizeDate(profile?.birth_date || ""),
    blood_type: profile?.blood_type || "",
    allergies: profile?.allergies || "",
    diagnoses: profile?.diagnoses || "",
    medications: profile?.medications || "",
    implants: profile?.implants || "",
    language: profile?.language || "de",
    emergency_contact_name: profile?.emergency_contact_name || "",
    emergency_contact_relation: profile?.emergency_contact_relation || "",
    emergency_contact_phone: profile?.emergency_contact_phone || "",
    emergency_contact_notes: profile?.emergency_contact_notes || "",
  };
}

export function lineValue(value?: string | null, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function getStatusLabel(status?: string | null) {
  const value = String(status || "").trim();

  if (!value) return "Unbekannt";
  if (value === "claimed") return "Aktiv";
  if (value === "print_ready") return "Print Ready";
  if (value === "in_stock") return "Auf Lager";
  if (value === "printed") return "Gedruckt";
  if (value === "shipped") return "Versendet";
  if (value === "blocked") return "Gesperrt";
  if (value === "reserved") return "Reserviert";

  return value;
}

export function getStatusColor(status?: string | null) {
  const value = String(status || "").trim();

  if (value === "claimed") return "#24c26a";
  if (value === "blocked") return "#ff6b6b";
  if (value === "print_ready") return "#ffb020";
  if (value === "printed") return "#3da5ff";
  if (value === "shipped") return "#7c92ff";
  if (value === "reserved") return "#ffb020";
  if (value === "in_stock") return "#8c98a8";

  return "#8c98a8";
}

export function buildCardUrl(pid: string) {
  const cleanPid = normalizePid(pid);
  const returnPath = `/card?pid=${encodeURIComponent(cleanPid)}&edit=1`;
  return `/p/${encodeURIComponent(
    cleanPid
  )}?emergency=1&return=${encodeURIComponent(returnPath)}`;
}

export function fullCardUrl(pid: string) {
  return `https://vive-card.com${buildCardUrl(pid)}`;
}

export async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(error?.message || "Keine aktive Session");
  }

  return user;
}

export async function getLatestOwnedCard(userId: string): Promise<CardRow | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("id, public_id, status, owner_user_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Karte konnte nicht geladen werden: " + error.message);
  }

  return data || null;
}

export async function getCardProfile(cardId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("card_profiles")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error("Profil konnte nicht geladen werden: " + error.message);
  }

  return data || null;
}

export async function getCurrentUserCardProfile(): Promise<CurrentUserCardProfileResult> {
  const user = await getCurrentUserOrThrow();
  const card = await getLatestOwnedCard(user.id);

  if (!card) {
    return {
      user,
      card: null,
      profile: null,
    };
  }

  const profile = await getCardProfile(card.id);

  return {
    user,
    card,
    profile,
  };
}

export async function saveCurrentUserCardProfile(
  card: CardRow,
  userId: string,
  values: ProfileFormValues
) {
  const payload = {
    card_id: card.id,
    public_id: card.public_id,
    owner_user_id: userId,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    birth_date: values.birth_date.trim() || null,
    blood_type: values.blood_type.trim(),
    allergies: values.allergies.trim(),
    diagnoses: values.diagnoses.trim(),
    medications: values.medications.trim(),
    implants: values.implants.trim(),
    language: values.language.trim() || "de",
    emergency_contact_name: values.emergency_contact_name.trim(),
    emergency_contact_relation: values.emergency_contact_relation.trim(),
    emergency_contact_phone: values.emergency_contact_phone.trim(),
    emergency_contact_notes: values.emergency_contact_notes.trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("card_profiles")
    .upsert(payload, { onConflict: "card_id" })
    .select()
    .single();

  if (error) {
    throw new Error("Speichern fehlgeschlagen: " + error.message);
  }

  return data;
}
