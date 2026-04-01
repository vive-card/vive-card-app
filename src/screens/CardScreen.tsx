import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "../lib/supabase";
import {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
  fullCardUrl,
  getCurrentUserCardProfile,
  lineValue,
  mapEmergencyDataToForm,
} from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";

type MedicalDocumentRow = {
  id: string;
  public_id: string;
  owner_id?: string | null;
  file_name?: string | null;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

function isImageMime(mimeType?: string | null) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

function formatFileSize(bytes?: number | null) {
  const value = Number(bytes || 0);

  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(doc: MedicalDocumentRow) {
  if (isImageMime(doc.mime_type)) return "🖼️";
  if (isPdfMime(doc.mime_type, doc.file_name)) return "📄";
  return "📎";
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

export default function CardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [formView, setFormView] = useState<ProfileFormValues | null>(null);
  const [documents, setDocuments] = useState<MedicalDocumentRow[]>([]);

  const loadDocuments = useCallback(async (publicId?: string | null) => {
    if (!publicId) {
      setDocuments([]);
      return;
    }

    const { data, error } = await supabase
      .from("medical_documents")
      .select("*")
      .eq("public_id", publicId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Dokumente konnten nicht geladen werden: " + error.message);
    }

    setDocuments(data || []);
  }, []);

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setFormView(mapEmergencyDataToForm(result.profile));

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
        Alert.alert("Fehler", e?.message || "Daten konnten nicht geladen werden");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

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

  useCardRealtime({
    publicId: card?.public_id || null,
    ownerUserId: userId,
    enabled: !loading,
    onChange: loadData,
  });

  const handleOpenCard = async () => {
    if (!card?.public_id) {
      Alert.alert("Hinweis", "Keine Karte gefunden");
      return;
    }

    const url = fullCardUrl(card.public_id);
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Fehler", "Kartenlink konnte nicht geöffnet werden");
      return;
    }

    await Linking.openURL(url);
  };

  const openDocument = async (doc: MedicalDocumentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-docs")
        .createSignedUrl(doc.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Signed URL konnte nicht erstellt werden");
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

  const deleteDocument = async (doc: MedicalDocumentRow) => {
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
                throw new Error(
                  "Storage-Löschen fehlgeschlagen: " + storageError.message
                );
              }

              const { error: dbError } = await supabase
                .from("medical_documents")
                .delete()
                .eq("id", doc.id);

              if (dbError) {
                throw new Error("DB-Löschen fehlgeschlagen: " + dbError.message);
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
        Alert.alert(
          "Kamera-Berechtigung",
          "Bitte erlaube den Kamera-Zugriff."
        );
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

      const fileName =
        asset.fileName || `camera-${Date.now()}.jpg`;

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
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>Karte wird geladen …</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Keine Karte gefunden</Text>
        <Text style={styles.emptyText}>
          Für diesen Account wurde aktuell keine VIVE CARD gefunden.
        </Text>
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
      <Text style={styles.title}>Deine Karte</Text>
      <Text style={styles.subtitle}>
        Vorschau basierend auf dem Web-Schema
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.brand}>VIVE CARD</Text>
            <Text style={styles.cardSub}>Medical Emergency Profile</Text>
          </View>

          <View style={styles.pidBox}>
            <Text style={styles.pidLabel}>PUBLIC_ID</Text>
            <Text style={styles.pid}>{lineValue(card.public_id)}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.valueLarge}>{lineValue(formView?.name)}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Geburtsdatum</Text>
            <Text style={styles.value}>{lineValue(formView?.dob)}</Text>
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Blutgruppe</Text>
            <Text style={styles.value}>{lineValue(formView?.blood)}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Kritische Informationen</Text>

        <View style={styles.alertBox}>
          <Text style={styles.alertLabel}>Allergien</Text>
          <Text style={styles.alertValue}>{lineValue(formView?.allergies)}</Text>
        </View>

        <View style={styles.alertBox}>
          <Text style={styles.alertLabel}>Blutverdünner</Text>
          <Text style={styles.alertValue}>
            {lineValue(formView?.bloodThinner)}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Medikamente</Text>
          <Text style={styles.value}>{lineValue(formView?.meds)}</Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Weitere Informationen</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Impfungen</Text>
          <Text style={styles.value}>{lineValue(formView?.vaccines)}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Chronische Erkrankungen</Text>
          <Text style={styles.value}>{lineValue(formView?.chronic)}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Organspende</Text>
          <Text style={styles.value}>{lineValue(formView?.organ)}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Notizen / Hinweise</Text>
          <Text style={styles.value}>{lineValue(formView?.notes)}</Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Notfallkontakte</Text>

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>
            {lineValue(formView?.em1_name, "Kontakt 1")}
          </Text>
          <Text style={styles.contactValue}>{lineValue(formView?.em1)}</Text>
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>
            {lineValue(formView?.em2_name, "Kontakt 2")}
          </Text>
          <Text style={styles.contactValue}>{lineValue(formView?.em2)}</Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Medizinische Dokumente</Text>

        <View style={styles.uploadRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, uploading && styles.buttonDisabled]}
            onPress={handleTakePhoto}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>
              {uploading ? "Lädt …" : "📸 Foto aufnehmen"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButtonSmall, uploading && styles.buttonDisabled]}
            onPress={handlePickDocument}
            disabled={uploading}
          >
            <Text style={styles.primaryButtonSmallText}>
              {uploading ? "Lädt …" : "📂 Datei hochladen"}
            </Text>
          </TouchableOpacity>
        </View>

        {sortedDocuments.length === 0 ? (
          <View style={styles.docEmptyBox}>
            <Text style={styles.docEmptyText}>
              Noch keine medizinischen Dokumente vorhanden.
            </Text>
          </View>
        ) : (
          sortedDocuments.map((doc) => (
            <View key={doc.id} style={styles.docItem}>
              <View style={styles.docMeta}>
                <Text style={styles.docName}>
                  {getDocumentIcon(doc)} {lineValue(doc.file_name, "Dokument")}
                </Text>

                <Text style={styles.docType}>
                  {isImageMime(doc.mime_type)
                    ? "Bild"
                    : isPdfMime(doc.mime_type, doc.file_name)
                    ? "PDF"
                    : "Dokument"}
                  {" • "}
                  {formatFileSize(doc.file_size)}
                </Text>

                <Text style={styles.docDate}>
                  {lineValue(
                    doc.created_at ? new Date(doc.created_at).toLocaleString() : ""
                  )}
                </Text>
              </View>

              <View style={styles.docActions}>
                <TouchableOpacity
                  style={styles.docOpenButton}
                  onPress={() => openDocument(doc)}
                >
                  <Text style={styles.docOpenButtonText}>Öffnen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.docDeleteButton}
                  onPress={() => deleteDocument(doc)}
                >
                  <Text style={styles.docDeleteButtonText}>Löschen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.separator} />

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Letztes Update</Text>
          <Text style={styles.value}>
            {lineValue(
              profile?.updated_at
                ? new Date(profile.updated_at).toLocaleString()
                : ""
            )}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleOpenCard}>
        <Text style={styles.buttonText}>Web-Karte öffnen</Text>
      </TouchableOpacity>
    </ScrollView>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#aeb6c4",
    fontSize: 15,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: "#06080d",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#aeb6c4",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
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
  card: {
    width: "100%",
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cardSub: {
    color: "#98a2b3",
    fontSize: 13,
    marginTop: 4,
  },
  pidBox: {
    alignItems: "flex-end",
  },
  pidLabel: {
    color: "#8f98a8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  pid: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  infoBlock: {
    marginBottom: 14,
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
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 22,
  },
  valueLarge: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  alertBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
    backgroundColor: "rgba(255,107,107,0.08)",
    padding: 12,
    marginBottom: 12,
  },
  alertLabel: {
    color: "#ffb3b3",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  alertValue: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 22,
  },
  contactBox: {
    backgroundColor: "#151b28",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  contactTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  contactValue: {
    color: "#d7dce5",
    fontSize: 15,
    lineHeight: 21,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  primaryButtonSmall: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: "#e10600",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryButtonSmallText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: "#1a2232",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  docEmptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
    backgroundColor: "#121827",
  },
  docEmptyText: {
    color: "#98a2b3",
    fontSize: 14,
    lineHeight: 20,
  },
  docItem: {
    backgroundColor: "#151b28",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  docMeta: {
    marginBottom: 12,
  },
  docName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  docType: {
    color: "#aeb6c4",
    fontSize: 13,
    marginBottom: 4,
  },
  docDate: {
    color: "#7f8a9d",
    fontSize: 12,
  },
  docActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  docOpenButton: {
    backgroundColor: "#24314a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  docOpenButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  docDeleteButton: {
    backgroundColor: "rgba(225,6,0,0.14)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(225,6,0,0.28)",
  },
  docDeleteButtonText: {
    color: "#ff8f8f",
    fontSize: 14,
    fontWeight: "800",
  },
  button: {
    backgroundColor: "#e10600",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
