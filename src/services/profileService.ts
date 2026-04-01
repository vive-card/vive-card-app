import { supabase } from "../lib/supabase";

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

export function formatDateForWeb(value: string | null | undefined) {
  const clean = normalizeDate(value);
  if (!clean) return "";

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return clean;

  const [, yyyy, mm, dd] = isoMatch;
  return ${dd}.`${mm}.${yyyy}`;
}

export function normalizePhone(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/[^0-9+]/g, "");
}

export function mapEmergencyDataToForm(
  profile?: EmergencyCardRow | null
): ProfileFormValues {
  const d = profile?.data || {};

  return {
    name: d.name || "",
    dob: normalizeDate(d.dob || ""),
    blood: d.blood || "",
    allergies: d.allergies || "",
    bloodThinner: d.bloodThinner || "",
    meds: d.meds || "",
    vaccines: d.vaccines || "",
    chronic: d.chronic || "",
    organ: d.organ || "",
    notes: d.notes || "",
    em1_name: d.em1_name || "",
    em1: d.em1 || "",
    em2_name: d.em2_name || "",
    em2: d.em2 || "",
  };
}

export function mapFormToEmergencyData(
  values: ProfileFormValues
): EmergencyCardData {
  return {
    name: values.name.trim(),
    dob: values.dob.trim() || "",
    blood: values.blood.trim(),
    allergies: values.allergies.trim(),
    bloodThinner: values.bloodThinner.trim(),
    meds: values.meds.trim(),
    vaccines: values.vaccines.trim(),
    chronic: values.chronic.trim(),
    organ: values.organ.trim(),
    notes: values.notes.trim(),
    em1_name: values.em1_name.trim(),
    em1: values.em1.trim(),
    em2_name: values.em2_name.trim(),
    em2: values.em2.trim(),
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
    .select(`
      id,
      public_id,
      status,
      owner_user_id,
      created_at,
      activated,
      blocked_at,
      full_name,
      blood_type,
      allergies,
      medications,
      emergency_note,
      emergency_contact_name,
      emergency_contact_phone
    `)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Karte konnte nicht geladen werden: " + error.message);
  }

  return data || null;
}

export async function getEmergencyCardProfile(
  publicId: string
): Promise<EmergencyCardRow | null> {
  const cleanPid = normalizePid(publicId);

  const { data, error } = await supabase
    .from("emergency_cards")
    .select("id, public_id, owner_id, data, updated_at")
    .eq("public_id", cleanPid)
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

  const profile = await getEmergencyCardProfile(card.public_id);

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
  const emergencyData = mapFormToEmergencyData(values);

  const emergencyPayload = {
    public_id: card.public_id,
    owner_id: userId,
    data: emergencyData,
    updated_at: new Date().toISOString(),
  };

  const { data: emergencyRow, error: emergencyError } = await supabase
    .from("emergency_cards")
    .upsert(emergencyPayload, { onConflict: "public_id" })
    .select()
    .single();

  if (emergencyError) {
    throw new Error(
      "Speichern in emergency_cards fehlgeschlagen: " + emergencyError.message
    );
  }

  const cardPayload = {
    full_name: values.name.trim() || null,
    blood_type: values.blood.trim() || null,
    allergies: values.allergies.trim() || null,
    medications: values.meds.trim() || null,
    emergency_note: values.notes.trim() || null,
    emergency_contact_name: values.em1_name.trim() || null,
    emergency_contact_phone: values.em1.trim() || null,
  };

  const { error: cardError } = await supabase
    .from("cards")
    .update(cardPayload)
    .eq("id", card.id);

  if (cardError) {
    throw new Error("Cards Sync fehlgeschlagen: " + cardError.message);
  }

  return emergencyRow;
}
