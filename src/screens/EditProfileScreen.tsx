import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { supabase } from "../lib/supabase";
import {
  getCurrentUserCardProfile,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
  initialProfileForm,
  ProfileFormValues,
} from "../services/profileService";

type MedicalDocumentRow = {
  id: string;
  owner_id?: string | null;
  public_id: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

const BLOOD_OPTIONS = [
  { label: "—", value: "" },
  { label: "0 negative", value: "0 negative" },
  { label: "0 positive", value: "0 positive" },
  { label: "A negative", value: "A negative" },
  { label: "A positive", value: "A positive" },
  { label: "B negative", value: "B negative" },
  { label: "B positive", value: "B positive" },
  { label: "AB negative", value: "AB negative" },
  { label: "AB positive", value: "AB positive" },
];

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);
  const [form, setForm] = useState<ProfileFormValues>(initialProfileForm);
  const [documents, setDocuments] = useState<MedicalDocumentRow[]>([]);

  const setField = (key: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadDocuments = async (publicId: string) => {
    try {
      setDocsLoading(true);

      const { data, error } = await supabase
        .from("medical_documents")
        .select("id, owner_id, public_id, file_name, file_path, mime_type, file_size, created_at")
        .eq("public_id", publicId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Dokumente konnten nicht geladen werden: " + error.message);
      }

      setDocuments((data || []) as MedicalDocumentRow[]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokumente konnten nicht geladen werden");
    } finally {
      setDocsLoading(false);
    }
  };

  const loadAll = async () => {
    const result = await getCurrentUserCardProfile();

    if (!result.card) {
      throw new Error("Keine Karte gefunden");
    }

    setUserId(result.user.id);
    setCard(result.card);
    setForm(mapEmergencyDataToForm(result.profile));
    await loadDocuments(result.card.public_id);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadAll();
      } catch (e: any) {
        Alert.alert("Fehler", e?.message || "Fehler beim Laden", [
          {
            text: "OK",
            onPress: () => navigation?.goBack?.(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadAll();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Aktualisierung fehlgeschlagen");
    } finally {
      setRefreshing(false);
    }
  };

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

  const uriToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const uploadDocument = async (params: {
    uri: string;
    fileName: string;
    mimeType?: string | null;
    fileSize?: number | null;
  }) => {
    try {
      if (!card?.public_id || !userId) {
        Alert.alert("Fehler", "Karte oder User fehlt");
        return;
      }

      setUploadingDoc(true);

      const mimeType = params.mimeType || "application/octet-stream";
      const extension =
        params.fileName.split(".").pop()?.toLowerCase() ||
        (mimeType === "application/pdf" ? "pdf" : "jpg");

      const safeName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

      const filePath = `${userId}/${card.public_id}/${safeName}`;
      const fileBlob = await uriToBlob(params.uri);

      const { error: uploadError } = await supabase.storage
        .from("medical-docs")
        .upload(filePath, fileBlob, {
          upsert: false,
          contentType: mimeType,
        });

      if (uploadError) {
        throw new Error("Upload fehlgeschlagen: " + uploadError.message);
      }

      const { error: dbError } = await supabase.from("medical_documents").insert({
        owner_id: userId,
        public_id: card.public_id,
        file_name: params.fileName,
        file_path: filePath,
        mime_type: mimeType,
        file_size: params.fileSize || null,
      });

      if (dbError) {
        throw new Error("DB-Speicherung fehlgeschlagen: " + dbError.message);
      }

      await loadDocuments(card.public_id);
      Alert.alert("Erfolg", "Dokument wurde hochgeladen");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokument konnte nicht hochgeladen werden");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Hinweis", "Kamerazugriff wurde nicht erlaubt");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      await uploadDocument({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize || null,
      });
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Foto konnte nicht aufgenommen werden");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      await uploadDocument({
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType: asset.mimeType || "application/octet-stream",
        fileSize: asset.size || null,
      });
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Datei konnte nicht ausgewählt werden");
    }
  };

  const handleOpenDocument = async (doc: MedicalDocumentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-docs")
        .createSignedUrl(doc.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Signed URL konnte nicht erstellt werden");
      }

      const supported = await Linking.canOpenURL(data.signedUrl);
      if (!supported) {
        throw new Error("Dokument kann nicht geöffnet werden");
      }

      await Linking.openURL(data.signedUrl);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokument konnte nicht geöffnet werden");
    }
  };

  const handleDeleteDocument = async (doc: MedicalDocumentRow) => {
    Alert.alert(
      "Dokument löschen",
      `Willst du "${doc.file_name}" wirklich löschen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              const { error: storageError } = await supabase.storage
                .from("medical-docs")
                .remove([doc.file_path]);

              if (storageError) {
                throw new Error(
                  "Datei konnte nicht aus Storage gelöscht werden: " +
                    storageError.message
                );
              }

              const { error: dbError } = await supabase
                .from("medical_documents")
                .delete()
                .eq("id", doc.id)
                .eq("public_id", doc.public_id);

              if (dbError) {
                throw new Error(
                  "DB-Eintrag konnte nicht gelöscht werden: " + dbError.message
                );
              }

              if (card?.public_id) {
                await loadDocuments(card.public_id);
              }

              Alert.alert("Erfolg", "Dokument gelöscht");
            } catch (e: any) {
              Alert.alert("Fehler", e?.message || "Dokument konnte nicht gelöscht werden");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e10600" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Profil bearbeiten</Text>

      <Text style={styles.section}>Grunddaten</Text>

      <Input
        label="Name"
        value={form.name}
        onChange={(v) => setField("name", v)}
      />
      <Input
        label="Geburtsdatum"
        value={form.dob}
        onChange={(v) => setField("dob", v)}
      />

      <Text style={styles.label}>Blutgruppe</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={form.blood}
          onValueChange={(value) => setField("blood", String(value || ""))}
          dropdownIconColor="#ffffff"
          style={styles.picker}
        >
          {BLOOD_OPTIONS.map((option) => (
            <Picker.Item
              key={option.value || "empty"}
              label={option.label}
              value={option.value}
              color="#ffffff"
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.section}>Kritische Infos</Text>

      <Input
        label="Allergien"
        value={form.allergies}
        onChange={(v) => setField("allergies", v)}
        multiline
      />
      <Input
        label="Blutverdünner"
        value={form.bloodThinner}
        onChange={(v) => setField("bloodThinner", v)}
        multiline
      />
      <Input
        label="Medikamente"
        value={form.meds}
        onChange={(v) => setField("meds", v)}
        multiline
      />

      <Text style={styles.section}>Weitere Infos</Text>

      <Input
        label="Impfungen"
        value={form.vaccines}
        onChange={(v) => setField("vaccines", v)}
        multiline
      />
      <Input
        label="Chronische Erkrankungen"
        value={form.chronic}
        onChange={(v) => setField("chronic", v)}
        multiline
      />
      <Input
        label="Organspende"
        value={form.organ}
        onChange={(v) => setField("organ", v)}
        multiline
      />
      <Input
        label="Notizen"
        value={form.notes}
        onChange={(v) => setField("notes", v)}
        multiline
      />

      <Text style={styles.section}>Notfallkontakte</Text>

      <Input
        label="Kontakt 1 Name"
        value={form.em1_name}
        onChange={(v) => setField("em1_name", v)}
      />
      <Input
        label="Kontakt 1 Telefon"
        value={form.em1}
        onChange={(v) => setField("em1", v)}
      />

      <Input
        label="Kontakt 2 Name"
        value={form.em2_name}
        onChange={(v) => setField("em2_name", v)}
      />
      <Input
        label="Kontakt 2 Telefon"
        value={form.em2}
        onChange={(v) => setField("em2", v)}
      />

      <Text style={styles.section}>Medizinische Dokumente</Text>

      <View style={styles.docButtonRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, styles.docButton]}
          onPress={handleTakePhoto}
          disabled={uploadingDoc}
        >
          <Text style={styles.secondaryButtonText}>
            {uploadingDoc ? "Lädt ..." : "📸 Foto aufnehmen"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.docButton]}
          onPress={handlePickFile}
          disabled={uploadingDoc}
        >
          <Text style={styles.secondaryButtonText}>
            {uploadingDoc ? "Lädt ..." : "📂 Datei hochladen"}
          </Text>
        </TouchableOpacity>
      </View>

      {docsLoading ? (
        <View style={styles.docsLoadingWrap}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.docsLoadingText}>Dokumente werden geladen ...</Text>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.emptyDocBox}>
          <Text style={styles.emptyDocText}>
            Noch keine Dokumente hinzugefügt.
          </Text>
        </View>
      ) : (
        documents.map((doc) => (
          <View key={doc.id} style={styles.docItem}>
            <View style={styles.docMeta}>
              <Text style={styles.docName}>{doc.file_name}</Text>
              <Text style={styles.docType}>
                {doc.mime_type?.startsWith("image/")
                  ? "Bild"
                  : doc.mime_type === "application/pdf"
                  ? "PDF"
                  : "Dokument"}
                {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
              </Text>
            </View>

            <View style={styles.docActions}>
              <TouchableOpacity
                style={styles.docOpenButton}
                onPress={() => handleOpenDocument(doc)}
              >
                <Text style={styles.docOpenText}>Öffnen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docDeleteButton}
                onPress={() => handleDeleteDocument(doc)}
              >
                <Text style={styles.docDeleteText}>Entfernen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Speichern..." : "Speichern"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

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
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor="#6f7a8f"
      />
    </View>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#06080d",
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pickerWrap: {
    backgroundColor: "#10141f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
    overflow: "hidden",
  },
  picker: {
    color: "#ffffff",
    backgroundColor: "#10141f",
  },
  docButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  docButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#1a2232",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  docsLoadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  docsLoadingText: {
    color: "#aeb6c4",
    marginTop: 8,
  },
  emptyDocBox: {
    backgroundColor: "#10141f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginBottom: 8,
  },
  emptyDocText: {
    color: "#8f98a8",
    fontSize: 14,
  },
  docItem: {
    backgroundColor: "#10141f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginBottom: 10,
  },
  docMeta: {
    marginBottom: 10,
  },
  docName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  docType: {
    color: "#8f98a8",
    fontSize: 12,
    marginTop: 4,
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
  },
  docOpenButton: {
    flex: 1,
    backgroundColor: "#1a2232",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  docOpenText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  docDeleteButton: {
    flex: 1,
    backgroundColor: "rgba(225,6,0,0.14)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(225,6,0,0.25)",
  },
  docDeleteText: {
    color: "#ff8f8f",
    fontWeight: "700",
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
