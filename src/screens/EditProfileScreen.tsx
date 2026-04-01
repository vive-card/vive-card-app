import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getCurrentUserCardProfile,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
  initialProfileForm,
  ProfileFormValues,
} from "../services/profileService";

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);

  const [form, setForm] = useState<ProfileFormValues>(initialProfileForm);

  const setField = (key: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    (async () => {
      try {
        const result = await getCurrentUserCardProfile();

        if (!result.card) {
          Alert.alert("Fehler", "Keine Karte gefunden");
          navigation.goBack();
          return;
        }

        setUserId(result.user.id);
        setCard(result.card);

        const mapped = mapEmergencyDataToForm(result.profile);
        setForm(mapped);
      } catch (e: any) {
        Alert.alert("Fehler", e?.message || "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      if (!card || !userId) return;

      setSaving(true);

      await saveCurrentUserCardProfile(card, userId, form);

      Alert.alert("Erfolg", "Gespeichert");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e10600" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profil bearbeiten</Text>

      {/* BASIC */}
      <Text style={styles.section}>Grunddaten</Text>

      <Input label="Name" value={form.name} onChange={(v) => setField("name", v)} />
      <Input label="Geburtsdatum" value={form.dob} onChange={(v) => setField("dob", v)} />
      <Input label="Blutgruppe" value={form.blood} onChange={(v) => setField("blood", v)} />

      {/* CRITICAL */}
      <Text style={styles.section}>Kritische Infos</Text>

      <Input label="Allergien" value={form.allergies} onChange={(v) => setField("allergies", v)} multiline />
      <Input label="Blutverdünner" value={form.bloodThinner} onChange={(v) => setField("bloodThinner", v)} multiline />
      <Input label="Medikamente" value={form.meds} onChange={(v) => setField("meds", v)} multiline />

      {/* MEDICAL */}
      <Text style={styles.section}>Weitere Infos</Text>

      <Input label="Impfungen" value={form.vaccines} onChange={(v) => setField("vaccines", v)} multiline />
      <Input label="Chronische Erkrankungen" value={form.chronic} onChange={(v) => setField("chronic", v)} multiline />
      <Input label="Organspende" value={form.organ} onChange={(v) => setField("organ", v)} multiline />
      <Input label="Notizen" value={form.notes} onChange={(v) => setField("notes", v)} multiline />

      {/* CONTACTS */}
      <Text style={styles.section}>Notfallkontakte</Text>

      <Input label="Kontakt 1 Name" value={form.em1_name} onChange={(v) => setField("em1_name", v)} />
      <Input label="Kontakt 1 Telefon" value={form.em1} onChange={(v) => setField("em1", v)} />

      <Input label="Kontakt 2 Name" value={form.em2_name} onChange={(v) => setField("em2_name", v)} />
      <Input label="Kontakt 2 Telefon" value={form.em2} onChange={(v) => setField("em2", v)} />

      {/* SAVE */}
      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>
          {saving ? "Speichern..." : "Speichern"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= COMPONENT ================= */

function Input({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80 }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },
  section: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 10,
  },
  label: {
    color: "#8f98a8",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#10141f",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#e10600",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
