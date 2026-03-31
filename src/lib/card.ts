import { supabase } from "./supabase";
import { CardRecord } from "../types/card";

export async function loadOwnedCard(userId: string): Promise<CardRecord> {
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

  if (!data) {
    throw new Error("Es ist noch keine Karte mit diesem User verknüpft");
  }

  return data as CardRecord;
}
