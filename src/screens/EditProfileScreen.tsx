import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
  owner_user_id?: string | null;
};

type ProfileRow = {
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

type FormState = {
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

const initialForm: FormState = {
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

function normalizeDate(value: string) {
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

function mapProfileToForm(profile?: ProfileRow | null): FormState {
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

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [card, setCard] = useState<CardRow | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadData = useCallback(async () => {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message || "Keine aktive Session");
    }

    const { data: ownedCard, error: cardError } = await supabase
      .from("cards")
      .select("id, public_id, status, owner_user_id")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cardError) {
      throw new Error("Karte konnte nicht geladen werden: " + cardError.message);
    }

    if (!ownedCard) {
      throw new Error("Keine Karte mit diesem User verknüpft");
    }

    setCard(ownedCard);

    const { data: profileRow, error: profileError } = await supabase
      .from("card_profiles")
      .select("*")
      .eq("card_id", ownedCard.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        "Profil konnte nicht geladen werden: " + profileError.message
      );
    }

    setForm(mapProfileToForm(profileRow));
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

const handleSave = async () => {
  try {
    if (!card?.id || !card?.public_id) {
      Alert.alert("Fehler", "Keine Karte gefunden");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message || "Keine aktive Session");
    }

    // 👉 1. PROFILE PAYLOAD
    const profilePayload = {
      card_id: card.id,
      public_id: card.public_id,
      owner_user_id: user.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birth_date: form.birth_date.trim() || null,
      blood_type: form.blood_type.trim(),
      allergies: form.allergies.trim(),
      diagnoses: form.diagnoses.trim(),
      medications: form.medications.trim(),
      implants: form.implants.trim(),
      language: form.language.trim() || "de",
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_relation: form.emergency_contact_relation.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      emergency_contact_notes: form.emergency_contact_notes.trim(),
      updated_at: new Date().toISOString(),
    };

    // 👉 2. SAVE card_profiles
    const { error: profileError } = await supabase
      .from("card_profiles")
      .upsert(profilePayload, { onConflict: "card_id" });

    if (profileError) {
      throw new Error("Profil speichern fehlgeschlagen: " + profileError.message);
    }

    // 👉 3. MAPPING → cards (WICHTIG!)
    const fullName = `${form.first_name} ${form.last_name}`.trim();

    const cardPayload = {
      full_name: fullName || null,
      blood_type: form.blood_type.trim() || null,
      allergies: form.allergies.trim() || null,
      medications: form.medications.trim() || null,

      // 👉 wichtig: das wird im Web als "Wichtiger Hinweis" angezeigt
      emergency_note: form.implants.trim() || null,

      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    };

    // 👉 4. UPDATE cards
    const { error: cardError } = await supabase
      .from("cards")
      .update(cardPayload)
      .eq("id", card.id);

    if (cardError) {
      throw new Error("Card Sync fehlgeschlagen: " + cardError.message);
    }

    Alert.alert("Erfolg", "Profil wurde gespeichert & synchronisiert", [
      {
        text: "OK",
        onPress: () => {
          if (navigation?.goBack) {
            navigation.goBack();
          }
        },
      },
    ]);
  } catch (e: any) {
    const message = e?.message || "Unbekannter Fehler";
    setError(message);
    Alert.alert("Fehler", message);
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>Profil wird geladen …</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Profil bearbeiten</Text>
        <Text style={styles.subtitle}>
          Passe deine persönlichen und medizinischen Angaben an
        </Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>Persönliche Daten</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Vorname</Text>
              <TextInput
                style={styles.input}
                placeholder="Vorname"
                placeholderTextColor="#788396"
                value={form.first_name}
                onChangeText={(v) => setField("first_name", v)}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Nachname</Text>
              <TextInput
                style={styles.input}
                placeholder="Nachname"
                placeholderTextColor="#788396"
                value={form.last_name}
                onChangeText={(v) => setField("last_name", v)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Geburtsdatum</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#788396"
                value={form.birth_date}
                onChangeText={(v) => setField("birth_date", v)}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Blutgruppe</Text>
              <TextInput
                style={styles.input}
                placeholder="z. B. 0 negativ"
                placeholderTextColor="#788396"
                value={form.blood_type}
                onChangeText={(v) => setField("blood_type", v)}
              />
            </View>
          </View>

          <Text style={styles.label}>Sprache</Text>
          <TextInput
            style={styles.input}
            placeholder="de / en / it / fr"
            placeholderTextColor="#788396"
            value={form.language}
            onChangeText={(v) => setField("language", v)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>Medizinische Informationen</Text>

          <Text style={styles.label}>Allergien</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Allergien eintragen"
            placeholderTextColor="#788396"
            value={form.allergies}
            onChangeText={(v) => setField("allergies", v)}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Diagnosen</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Diagnosen eintragen"
            placeholderTextColor="#788396"
            value={form.diagnoses}
            onChangeText={(v) => setField("diagnoses", v)}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Medikamente</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Medikamente eintragen"
            placeholderTextColor="#788396"
            value={form.medications}
            onChangeText={(v) => setField("medications", v)}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Implantate / Hinweise</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Wichtige Hinweise eintragen"
            placeholderTextColor="#788396"
            value={form.implants}
            onChangeText={(v) => setField("implants", v)}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>Notfallkontakt</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Kontaktperson"
                placeholderTextColor="#788396"
                value={form.emergency_contact_name}
                onChangeText={(v) => setField("emergency_contact_name", v)}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Beziehung</Text>
              <TextInput
                style={styles.input}
                placeholder="z. B. Mutter"
                placeholderTextColor="#788396"
                value={form.emergency_contact_relation}
                onChangeText={(v) => setField("emergency_contact_relation", v)}
              />
            </View>
          </View>

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            placeholder="+41..."
            placeholderTextColor="#788396"
            value={form.emergency_contact_phone}
            onChangeText={(v) => setField("emergency_contact_phone", v)}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Zusatzinfo</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Zusätzliche Hinweise"
            placeholderTextColor="#788396"
            value={form.emergency_contact_notes}
            onChangeText={(v) => setField("emergency_contact_notes", v)}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation?.goBack?.()}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Abbrechen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Speichert ..." : "Speichern"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#06080d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#aeb6c4",
    fontSize: 15,
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: {
    color: "#98a2b3",
    fontSize: 17,
    marginTop: 4,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.35)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: "#ff9f9f",
    fontSize: 14,
    lineHeight: 20,
  },
  cardBox: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    color: "#8f98a8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    width: "100%",
    backgroundColor: "#1a2232",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 8,
  },
  textarea: {
    minHeight: 110,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    paddingBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#e10600",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1a2232",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
