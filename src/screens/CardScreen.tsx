import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";

import { supabase } from "../lib/supabase";
import {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
  getCurrentUserCardProfile,
  initialProfileForm,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
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

type MedicalDocumentViewRow = MedicalDocumentRow & {
  preview_url?: string | null;
};

const BLOOD_OPTIONS = [
  "",
  "0 negative",
  "0 positive",
  "A negative",
  "A positive",
  "B negative",
  "B positive",
  "AB negative",
  "AB positive",
];

function isImageMime(mimeType?: string | null) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessExtension(fileName?: string | null, mimeType?: string | null) {
  const name = String(fileName || "").toLowerCase();

  if (name.includes(".")) {
    return name.split(".").pop() || "bin";
  }

  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";

  return "bin";
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

function getDocumentEmoji(doc: MedicalDocumentRow) {
  if (isImageMime(doc.mime_type)) return "🖼️";
  if (isPdfMime(doc.mime_type, doc.file_name)) return "📄";
  return "📎";
}

function lineValue(value?: string | null, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [form, setForm] = useState<ProfileFormValues>(initialProfileForm);
  const [documents, setDocuments] = useState<MedicalDocumentViewRow[]>([]);

  const setField = useCallback(
    (key: keyof ProfileFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const loadDocuments = useCallback(async (publicId?: string | null) => {
    if (!publicId) {
      setDocuments([]);
      return;
    }

    try {
      setDocsLoading(true);

      const { data, error } = await supabase
        .from("medical_documents")
        .select(
          "id, owner_id, public_id, file_name, file_path, mime_type, file_size, created_at"
        )
        .eq("public_id", publicId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Dokumente konnten nicht geladen werden: " + error.message);
      }

      const rows = (data || []) as MedicalDocumentRow[];

      const rowsWithPreview = await Promise.all(
        rows.map(async (doc) => {
          if (!isImageMime(doc.mime_type)) {
            return { ...doc, preview_url: null };
          }

          const { data: signedData, error: signedError } = await supabase.storage
            .from("medical-docs")
            .createSignedUrl(doc.file_path, 60 * 10);

          if (signedError || !signedData?.signedUrl) {
            return { ...doc, preview_url: null };
          }

          return {
            ...doc,
            preview_url: signedData.signedUrl,
          };
        })
      );

      setDocuments(rowsWithPreview);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokumente konnten nicht geladen werden");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    if (!result.card) {
      throw new Error("Keine Karte gefunden");
    }

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setForm(mapEmergencyDataToForm(result.profile));

    if (result.card?.public_id) {
      await loadDocuments(result.card.public_id);
    } else {
      setDocuments([]);
    }
  }, [loadDocuments]);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (e: any) {
        Alert.alert("Fehler", e?.message || "Daten konnten nicht geladen werden", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData, navigation]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Aktualisierung fehlgeschlagen");
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const openDocument = async (doc: MedicalDocumentViewRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-docs")
        .createSignedUrl(doc.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Dokument konnte nicht geöffnet werden");
      }

      navigation?.navigate?.("DocumentViewer", {
        url: data.signedUrl,
        fileName: doc.file_name || "Dokument",
        mimeType: doc.mime_type || "",
      });
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokument konnte nicht geöffnet werden");
    }
  };

  const deleteDocument = async (doc: MedicalDocumentViewRow) => {
    Alert.alert(
      "Dokument löschen",
      `Möchtest du "${doc.file_name || "Dokument"}" wirklich löschen?`,
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
                throw new Error(storageError.message);
              }

              const { error: dbError } = await supabase
                .from("medical_documents")
                .delete()
                .eq("id", doc.id);

              if (dbError) {
                throw new Error(dbError.message);
              }

              await loadDocuments(card?.public_id || null);
            } catch (e: any) {
              Alert.alert(
                "Fehler",
                e?.message || "Dokument konnte nicht gelöscht werden"
              );
            }
          },
        },
      ]
    );
  };

  const uploadFileToSupabase = async (params: {
    uri: string;
    fileName: string;
    mimeType: string;
    fileSize?: number | null;
  }) => {
    if (!card?.public_id || !userId) {
      throw new Error("User oder Karte fehlt");
    }

    const ext = guessExtension(params.fileName, params.mimeType);
    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const filePath = `${userId}/${card.public_id}/${uniqueName}`;

    const arrayBuffer = await uriToArrayBuffer(params.uri);

    const { error: uploadError } = await supabase.storage
      .from("medical-docs")
      .upload(filePath, arrayBuffer, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Upload fehlgeschlagen: " + uploadError.message);
    }

    const { error: insertError } = await supabase
      .from("medical_documents")
      .insert({
        owner_id: userId,
        public_id: card.public_id,
        file_name: params.fileName,
        file_path: filePath,
        mime_type: params.mimeType || "application/octet-stream",
        file_size: params.fileSize || null,
      });

    if (insertError) {
      throw new Error("DB-Eintrag fehlgeschlagen: " + insertError.message);
    }

    await loadDocuments(card.public_id);
  };

  const handlePickDocument = async () => {
    try {
      if (!card?.public_id || !userId) {
        Alert.alert("Hinweis", "Keine Karte gefunden");
        return;
      }

      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      await uploadFileToSupabase({
        uri: asset.uri,
        fileName: asset.name || "Dokument",
        mimeType: asset.mimeType || "application/octet-stream",
        fileSize: asset.size || null,
      });

      Alert.alert("Erfolg", "Dokument wurde hochgeladen");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Dokument-Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!card?.public_id || !userId) {
        Alert.alert("Hinweis", "Keine Karte gefunden");
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Kamera-Berechtigung", "Bitte erlaube den Kamera-Zugriff.");
        return;
      }

      setUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileName = asset.fileName || `camera-${Date.now()}.jpg`;

      await uploadFileToSupabase({
        uri: asset.uri,
        fileName,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize || null,
      });

      Alert.alert("Erfolg", "Foto wurde hochgeladen");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Foto-Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!card || !userId) return;

      setSaving(true);
      await saveCurrentUserCardProfile(card, userId, form);

      Alert.alert("Erfolg", "Gespeichert", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message || "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert("Alles löschen", "Wirklich alle Felder leeren?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Leeren",
        style: "destructive",
        onPress: () => setForm(initialProfileForm),
      },
    ]);
  };

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
  }, [documents]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1f6feb" />
        <Text style={styles.loadingText}>Karte wird geladen …</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1f6feb" />
      }
    >
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={styles.brandWrap}>
            <View style={styles.dot} />
            <Text style={styles.brandText}>VIVE CARD</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.softTopButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.softTopButtonText}>← Zurück</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.headline}>
          <View style={styles.headlineLeft}>
            <Text style={styles.headlineTitle}>Notfallinformation</Text>
            <Text style={styles.headlineSub}>
              Alle relevanten medizinischen Daten auf einem Blick.
            </Text>
          </View>

          <View style={styles.pidWrap}>
            <Text style={styles.pidLabel}>PROFIL-ID</Text>
            <Text style={styles.pidValue}>{lineValue(card?.public_id)}</Text>
          </View>
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ Diese Informationen wurden vom Karteninhaber selbst erfasst. Keine
            Garantie auf Vollständigkeit oder Aktualität.
          </Text>
        </View>

        <View style={styles.row2}>
          <FieldBox>
            <FieldLabel
              title="👤 Name"
              chipText="Pflicht"
              chipStyle="default"
            />
            <StyledInput
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              placeholder="Vor- und Nachname"
            />
          </FieldBox>

          <FieldBox>
            <FieldLabel
              title="🎂 Geburtsdatum"
              chipText="Pflicht"
              chipStyle="default"
            />
            <StyledInput
              value={form.dob}
              onChangeText={(v) => setField("dob", v)}
              placeholder="TT.MM.JJJJ"
            />
          </FieldBox>
        </View>

        <FieldBox style={{ marginTop: 12 }}>
          <FieldLabel
            title="🩸 Blutgruppe"
            chipText="Priorität 1"
            chipStyle="warn"
          />
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={form.blood}
              onValueChange={(value) => setField("blood", String(value || ""))}
              style={styles.picker}
              dropdownIconColor="#101318"
            >
              {BLOOD_OPTIONS.map((item) => (
                <Picker.Item
                  key={item || "empty"}
                  label={item || "—"}
                  value={item}
                />
              ))}
            </Picker>
          </View>
        </FieldBox>

        <Text style={styles.sectionTitle}>⚠️ Kritische medizinische Information</Text>

        <View style={styles.grid2}>
          <FieldBox critical>
            <FieldLabel
              title="🧪 Allergien"
              chipText="kritisch"
              chipStyle="critical"
            />
            <StyledInput
              value={form.allergies}
              onChangeText={(v) => setField("allergies", v)}
              multiline
            />
          </FieldBox>

          <FieldBox critical>
            <FieldLabel
              title="💊 Blutverdünner"
              chipText="kritisch"
              chipStyle="critical"
            />
            <StyledInput
              value={form.bloodThinner}
              onChangeText={(v) => setField("bloodThinner", v)}
              multiline
            />
          </FieldBox>

          <FieldBox warn>
            <FieldLabel
              title="💉 Medikamente"
              chipText="wichtig"
              chipStyle="warn"
            />
            <StyledInput
              value={form.meds}
              onChangeText={(v) => setField("meds", v)}
              multiline
            />
          </FieldBox>

          <FieldBox ok>
            <FieldLabel
              title="✅ Impfungen"
              chipText="ok"
              chipStyle="ok"
            />
            <StyledInput
              value={form.vaccines}
              onChangeText={(v) => setField("vaccines", v)}
              multiline
            />
          </FieldBox>
        </View>

        <Text style={styles.sectionTitle}>ℹ️ Weitere medizinische Informationen</Text>

        <View style={styles.grid2}>
          <FieldBox>
            <FieldLabel title="🫀 Chronische Erkrankungen" />
            <StyledInput
              value={form.chronic}
              onChangeText={(v) => setField("chronic", v)}
              multiline
            />
          </FieldBox>

          <FieldBox>
            <FieldLabel title="🎗 Organspende" />
            <StyledInput
              value={form.organ}
              onChangeText={(v) => setField("organ", v)}
              multiline
            />
          </FieldBox>
        </View>

        <FieldBox style={{ marginTop: 12 }}>
          <FieldLabel title="📝 Notizen / Hinweise" />
          <StyledInput
            value={form.notes}
            onChangeText={(v) => setField("notes", v)}
            multiline
          />
        </FieldBox>

        <Text style={styles.sectionTitle}>📞 Notfallkontakte</Text>

        <View style={styles.contacts}>
          <FieldBox>
            <FieldLabel title="Notfallkontakt 1" />
            <StyledInput
              value={form.em1_name}
              onChangeText={(v) => setField("em1_name", v)}
              placeholder="z.B. Ehefrau, Bruder, Kontaktperson"
            />
            <StyledInput
              value={form.em1}
              onChangeText={(v) => setField("em1", v)}
              placeholder="+41..."
              style={{ marginTop: 10 }}
            />
          </FieldBox>

          <FieldBox>
            <FieldLabel title="Notfallkontakt 2" />
            <StyledInput
              value={form.em2_name}
              onChangeText={(v) => setField("em2_name", v)}
              placeholder="z.B. Hausarzt"
            />
            <StyledInput
              value={form.em2}
              onChangeText={(v) => setField("em2", v)}
              placeholder="+41..."
              style={{ marginTop: 10 }}
            />
          </FieldBox>
        </View>

        <Text style={styles.sectionTitle}>📄 Medizinische Dokumente</Text>

        <View style={styles.docsGrid}>
          <View style={styles.docToolbar}>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, uploading && styles.disabledButton]}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              <Text style={styles.actionBtnPrimaryText}>
                {uploading ? "Lädt …" : "📸 Foto aufnehmen"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, uploading && styles.disabledButton]}
              onPress={handlePickDocument}
              disabled={uploading}
            >
              <Text style={styles.actionBtnText}>
                {uploading ? "Lädt …" : "📂 Datei hochladen"}
              </Text>
            </TouchableOpacity>
          </View>

          {docsLoading ? (
            <View style={styles.docsLoadingBox}>
              <ActivityIndicator color="#1f6feb" />
              <Text style={styles.docsLoadingText}>Dokumente werden geladen …</Text>
            </View>
          ) : sortedDocuments.length === 0 ? (
            <View style={styles.docEmpty}>
              <Text style={styles.docEmptyText}>
                Noch keine Dokumente hochgeladen.
              </Text>
            </View>
          ) : (
            sortedDocuments.map((doc) => (
              <View key={doc.id} style={styles.docItem}>
                <TouchableOpacity
                  style={styles.docThumbWrap}
                  onPress={() => openDocument(doc)}
                  activeOpacity={0.85}
                >
                  {isImageMime(doc.mime_type) && doc.preview_url ? (
                    <Image
                      source={{ uri: doc.preview_url }}
                      style={styles.docThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.docThumbFallback}>
                      <Text style={styles.docThumbFallbackIcon}>
                        {getDocumentEmoji(doc)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.docMeta}>
                  <Text style={styles.docName} numberOfLines={2}>
                    {doc.file_name || "Dokument"}
                  </Text>

                  <Text style={styles.docType}>
                    {isImageMime(doc.mime_type)
                      ? "Bild"
                      : isPdfMime(doc.mime_type, doc.file_name)
                      ? "Dokument / PDF"
                      : "Dokument"}
                    {doc.file_size ? ` • ${formatFileSize(doc.file_size)}` : ""}
                  </Text>

                  <Text style={styles.docType}>
                    {lineValue(
                      doc.created_at ? new Date(doc.created_at).toLocaleString() : ""
                    )}
                  </Text>
                </View>

                <View style={styles.docActions}>
                  <TouchableOpacity
                    style={styles.inlineActionBtn}
                    onPress={() => openDocument(doc)}
                  >
                    <Text style={styles.inlineActionBtnText}>Öffnen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inlineDangerBtn}
                    onPress={() => deleteDocument(doc)}
                  >
                    <Text style={styles.inlineDangerBtnText}>Entfernen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <TouchableOpacity
              style={styles.footerBtn}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.footerBtnText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerBtnPrimary}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.footerBtnPrimaryText}>
                {saving ? "Speichern …" : "Speichern"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerBtnDanger}
              onPress={handleClear}
              disabled={saving}
            >
              <Text style={styles.footerBtnDangerText}>Alles löschen</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerInfo}>
            <Text style={styles.smallText}>
              Letztes Update:{" "}
              {lineValue(
                profile?.updated_at
                  ? new Date(profile.updated_at).toLocaleString()
                  : ""
              )}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function FieldBox({
  children,
  style,
  critical,
  warn,
  ok,
}: {
  children: React.ReactNode;
  style?: any;
  critical?: boolean;
  warn?: boolean;
  ok?: boolean;
}) {
  return (
    <View
      style={[
        styles.field,
        critical && styles.fieldCritical,
        warn && styles.fieldWarn,
        ok && styles.fieldOk,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function FieldLabel({
  title,
  chipText,
  chipStyle = "default",
}: {
  title: string;
  chipText?: string;
  chipStyle?: "default" | "critical" | "warn" | "ok";
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.fieldLabel}>{title}</Text>
      {!!chipText && (
        <View
          style={[
            styles.chip,
            chipStyle === "critical" && styles.chipCritical,
            chipStyle === "warn" && styles.chipWarn,
            chipStyle === "ok" && styles.chipOk,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              chipStyle === "critical" && styles.chipTextCritical,
              chipStyle === "warn" && styles.chipTextWarn,
              chipStyle === "ok" && styles.chipTextOk,
            ]}
          >
            {chipText}
          </Text>
        </View>
      )}
    </View>
  );
}

function StyledInput({
  style,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor="#7d8793"
      style={[styles.input, multiline && styles.inputMultiline, style]}
      textAlignVertical={multiline ? "top" : "center"}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  content: {
    paddingBottom: 42,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#5b6472",
    fontSize: 15,
    fontWeight: "600",
  },
  topbar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "#e7ebf0",
    paddingTop: 10,
    paddingBottom: 10,
  },
  topbarInner: {
    paddingHorizontal: 16,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1f6feb",
    shadowColor: "#1f6feb",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  brandText: {
    color: "#101318",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  softTopButton: {
    borderWidth: 1,
    borderColor: "#e7ebf0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  softTopButtonText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 16,
    shadowColor: "rgba(16,19,24,.10)",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  headline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  headlineLeft: {
    flex: 1,
  },
  headlineTitle: {
    color: "#101318",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headlineSub: {
    color: "#5b6472",
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
  },
  pidWrap: {
    alignItems: "flex-end",
  },
  pidLabel: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "800",
  },
  pidValue: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  disclaimerBox: {
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(176,24,24,.08)",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.25)",
  },
  disclaimerText: {
    color: "#7a1212",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  row2: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  field: {
    minWidth: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  fieldCritical: {
    borderColor: "rgba(176,24,24,.55)",
    backgroundColor: "#fffdfd",
  },
  fieldWarn: {
    borderColor: "rgba(211,155,34,.60)",
    backgroundColor: "#fffefb",
  },
  fieldOk: {
    borderColor: "rgba(30,138,74,.45)",
    backgroundColor: "#fbfffc",
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: "#2a3340",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  fieldLabel: {
    flex: 1,
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f0f3f7",
    borderWidth: 1,
    borderColor: "#e7ebf0",
  },
  chipCritical: {
    backgroundColor: "rgba(176,24,24,.08)",
    borderColor: "rgba(176,24,24,.18)",
  },
  chipWarn: {
    backgroundColor: "rgba(211,155,34,.10)",
    borderColor: "rgba(211,155,34,.22)",
  },
  chipOk: {
    backgroundColor: "rgba(30,138,74,.10)",
    borderColor: "rgba(30,138,74,.18)",
  },
  chipText: {
    color: "#5b6472",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipTextCritical: {
    color: "#b01818",
  },
  chipTextWarn: {
    color: "#7a5400",
  },
  chipTextOk: {
    color: "#1e8a4a",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,.10)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: "#101318",
    backgroundColor: "#fbfcfe",
  },
  inputMultiline: {
    minHeight: 88,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(16,19,24,.10)",
    borderRadius: 10,
    backgroundColor: "#fbfcfe",
    overflow: "hidden",
  },
  picker: {
    color: "#101318",
    height: 52,
    marginVertical: -2,
  },
  contacts: {
    gap: 10,
  },
  docsGrid: {
    gap: 12,
  },
  docToolbar: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  actionBtnPrimary: {
    flexGrow: 1,
    minWidth: 180,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#2a3a57",
    alignItems: "center",
  },
  actionBtnPrimaryText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: 180,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#101318",
    fontWeight: "900",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  docsLoadingBox: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  docsLoadingText: {
    marginTop: 8,
    color: "#5b6472",
    fontSize: 13,
    fontWeight: "700",
  },
  docEmpty: {
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e7ebf0",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
  },
  docEmptyText: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "700",
  },
  docItem: {
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    padding: 12,
    gap: 12,
  },
  docThumbWrap: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eef2f6",
  },
  docThumb: {
    width: "100%",
    height: "100%",
  },
  docThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2f6",
  },
  docThumbFallbackIcon: {
    fontSize: 38,
  },
  docMeta: {
    gap: 4,
  },
  docName: {
    color: "#101318",
    fontWeight: "900",
    fontSize: 15,
  },
  docType: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "700",
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },
  inlineActionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e7ebf0",
    backgroundColor: "#ffffff",
  },
  inlineActionBtnText: {
    color: "#101318",
    fontWeight: "900",
    fontSize: 13,
  },
  inlineDangerBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.20)",
    backgroundColor: "#fff0f0",
  },
  inlineDangerBtnText: {
    color: "#b01818",
    fontWeight: "900",
    fontSize: 13,
  },
  footer: {
    marginTop: 14,
    gap: 12,
  },
  footerLeft: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  footerBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e7ebf0",
    backgroundColor: "#ffffff",
  },
  footerBtnText: {
    color: "#101318",
    fontWeight: "900",
    fontSize: 14,
  },
  footerBtnPrimary: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#2a3a57",
  },
  footerBtnPrimaryText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  footerBtnDanger: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.20)",
    backgroundColor: "#fff0f0",
  },
  footerBtnDangerText: {
    color: "#b01818",
    fontWeight: "900",
    fontSize: 14,
  },
  footerInfo: {
    alignItems: "flex-start",
  },
  smallText: {
    fontSize: 12,
    color: "#5b6472",
    fontWeight: "700",
    lineHeight: 18,
  },
});