import { supabase } from "./supabase";
import { CardProfileRecord } from "../types/profile";

export async function loadProfile(cardId: string): Promise<CardProfileRecord | null> {
  const { data, error } = await supabase
    .from("card_profiles")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error("Profil konnte nicht geladen werden: " + error.message);
  }

  return (data as CardProfileRecord | null) || null;
}

export async function saveProfile(payload: CardProfileRecord): Promise<CardProfileRecord> {
  const { data, error } = await supabase
    .from("card_profiles")
    .upsert(payload, { onConflict: "card_id" })
    .select()
    .single();

  if (error) {
    throw new Error("Speichern fehlgeschlagen: " + error.message);
  }

  return data as CardProfileRecord;
}
