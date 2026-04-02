import { supabase } from "../lib/supabase";
import type {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
  CurrentUserCardProfileResult,
} from "../types";
import { normalizePid, mapFormToEmergencyData } from "../utils";

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

export async function getLatestOwnedCard(
  userId: string
): Promise<CardRow | null> {
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
    .select("public_id, owner_id, data, updated_at")
    .eq("public_id", cleanPid)
    .maybeSingle();

  if (error) {
    throw new Error("Profil konnte nicht geladen werden: " + error.message);
  }

  return (data as EmergencyCardRow | null) || null;
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
    .select("public_id, owner_id, data, updated_at")
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