import React, { useCallback, useEffect, useState } from "react";
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
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export default function CardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [formView, setFormView] = useState<ProfileFormValues | null>(null);

  const [documents, setDocuments] = useState<MedicalDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  /* ================= LOAD ================= */

  const loadDocuments = async (publicId: string) => {
    try {
      setDocsLoading(true);

      const { data, error } = await supabase
        .from("medical_documents")
        .select("*")
        .eq("public_id", publicId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (e: any) {
      console.log("Docs error:", e.message);
    } finally {
      setDocsLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setFormView(mapEmergencyDataToForm(result.profile));

    if (result.card?.public_id) {
      await loadDocuments(result.card.public_id);
    }
  }, []);

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

  /* ================= ACTIONS ================= */

  const handleOpenCard = async () => {
    if (!card?.public_id) return;

    const url = fullCardUrl(card.public_id);
    await Linking.openURL(url);
  };

  const handleOpenDocument = async (doc: MedicalDocumentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-docs")
        .createSignedUrl(doc.file_path, 60 * 10);

      if (error || !data?.signedUrl) throw error;

      await Linking.openURL(data.signedUrl);
    } catch (e: any) {
      Alert.alert("Fehler", "Dokument konnte nicht geöffnet werden");
    }
  };

  /* ================= STATES ================= */

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
          Für diesen Account wurde keine VIVE CARD gefunden.
        </Text>
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Deine Karte</Text>

      <View style={styles.card}>
        <Text style={styles.pid}>{card.public_id}</Text>

        <Text style={styles.sectionTitle}>Grunddaten</Text>
        <Text style={styles.valueLarge}>{lineValue(formView?.name)}</Text>
        <Text style={styles.value}>{lineValue(formView?.dob)}</Text>
        <Text style={styles.value}>{lineValue(formView?.blood)}</Text>

        <Text style={styles.sectionTitle}>Kritisch</Text>
        <Text style={styles.value}>{lineValue(formView?.allergies)}</Text>
        <Text style={styles.value}>{lineValue(formView?.bloodThinner)}</Text>

        <Text style={styles.sectionTitle}>Medizinische Dokumente</Text>

        {docsLoading ? (
          <ActivityIndicator />
        ) : documents.length === 0 ? (
          <Text style={styles.emptyText}>Keine Dokumente vorhanden</Text>
        ) : (
          documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docItem}
              onPress={() => handleOpenDocument(doc)}
            >
              <Text style={styles.docName}>{doc.file_name}</Text>
              <Text style={styles.docMeta}>
                {doc.mime_type?.includes("image") ? "Bild" : "PDF"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleOpenCard}>
        <Text style={styles.buttonText}>Web-Karte öffnen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#06080d" },
  content: { padding: 20 },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: { color: "#aaa", marginTop: 10 },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: { color: "#fff", fontSize: 24 },
  emptyText: { color: "#888" },

  title: { color: "#fff", fontSize: 28, marginBottom: 10 },

  card: {
    backgroundColor: "#10141f",
    padding: 16,
    borderRadius: 16,
  },

  pid: { color: "#fff", fontWeight: "bold", marginBottom: 10 },

  sectionTitle: {
    color: "#ff3b30",
    marginTop: 16,
    marginBottom: 6,
  },

  value: { color: "#fff" },
  valueLarge: { color: "#fff", fontSize: 20 },

  docItem: {
    backgroundColor: "#1a2232",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },

  docName: { color: "#fff", fontWeight: "bold" },
  docMeta: { color: "#aaa", fontSize: 12 },

  button: {
    marginTop: 20,
    backgroundColor: "#e10600",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: { color: "#fff", fontWeight: "bold" },
});
