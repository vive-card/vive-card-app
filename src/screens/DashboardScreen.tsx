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

import { getCurrentUserCardProfile } from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";
import type {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
} from "../types";
import { mapEmergencyDataToForm } from "../utils";

function getStatusColor(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "#1e8a4a";
  if (value === "blocked") return "#b01818";
  if (value === "pending") return "#d39b22";

  return "#5b6472";
}

function getStatusLabel(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "Aktiv";
  if (value === "blocked") return "Gesperrt";
  if (value === "pending") return "Pending";

  return "Unbekannt";
}

function fullCardUrl(publicId?: string | null) {
  if (!publicId) return "";
  return `https://www.vive-card.com/card?pid=${encodeURIComponent(publicId)}&edit=1`;
}

function lineValue(value?: string | null, fallback = "—") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export default function DashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [formView, setFormView] = useState<ProfileFormValues | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    const result = await getCurrentUserCardProfile();

    setUserEmail(result.user?.email || "");
    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setFormView(mapEmergencyDataToForm(result.profile));
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

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      loadData().catch(() => {});
    });

    return unsubscribe;
  }, [navigation, loadData]);

  useCardRealtime({
    publicId: card?.public_id || null,
    ownerUserId: userId,
    enabled: !loading,
    onChange: loadData,
  });

  const cardUrl = useMemo(() => fullCardUrl(card?.public_id), [card?.public_id]);

  const handleOpenCard = async () => {
    if (!card?.public_id) {
      Alert.alert("Hinweis", "Keine Karte gefunden");
      return;
    }

    const supported = await Linking.canOpenURL(cardUrl);

    if (!supported) {
      Alert.alert("Fehler", "Kartenlink konnte nicht geöffnet werden");
      return;
    }

    await Linking.openURL(cardUrl);
  };

  const handleEditProfile = () => {
    if (!card?.public_id) {
      Alert.alert("Hinweis", "Keine Karte gefunden");
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate("Card");
      return;
    }

    Alert.alert("Hinweis", "Card Screen ist noch nicht verbunden");
  };

  const handleOpenCardTab = () => {
    if (navigation?.navigate) {
      navigation.navigate("Card");
      return;
    }

    Alert.alert("Hinweis", "Card Screen ist noch nicht verbunden");
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>Dashboard wird geladen …</Text>
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
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>
        Willkommen{userEmail ? `, ${userEmail}` : ""}
      </Text>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!card ? (
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>Keine Karte verknüpft</Text>
          <Text style={styles.sectionText}>
            Für diesen User wurde aktuell noch keine VIVE CARD gefunden.
          </Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
            <Text style={styles.secondaryButtonText}>Erneut prüfen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cardBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Deine Karte</Text>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(card.status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusLabel(card.status)}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>PUBLIC_ID</Text>
              <Text style={styles.valueMono}>{lineValue(card.public_id)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Kartenlink</Text>
              <Text style={styles.valueSmall}>{lineValue(cardUrl)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleOpenCard}
              >
                <Text style={styles.primaryButtonText}>Karte öffnen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenCardTab}
              >
                <Text style={styles.secondaryButtonText}>Karte in App</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Grunddaten</Text>

              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={styles.linkText}>Bearbeiten</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{lineValue(formView?.name)}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Geburtsdatum</Text>
                <Text style={styles.value}>{lineValue(formView?.dob)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Blutgruppe</Text>
                <Text style={styles.value}>{lineValue(formView?.blood)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>Kritische Informationen</Text>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Allergien</Text>
              <Text style={styles.value}>{lineValue(formView?.allergies)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Blutverdünner</Text>
              <Text style={styles.value}>
                {lineValue(formView?.bloodThinner)}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Medikamente</Text>
              <Text style={styles.value}>{lineValue(formView?.meds)}</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
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
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>Notfallkontakte</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Kontakt 1 Name</Text>
                <Text style={styles.value}>{lineValue(formView?.em1_name)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Kontakt 1 Telefon</Text>
                <Text style={styles.value}>{lineValue(formView?.em1)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Kontakt 2 Name</Text>
                <Text style={styles.value}>{lineValue(formView?.em2_name)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Kontakt 2 Telefon</Text>
                <Text style={styles.value}>{lineValue(formView?.em2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>Technische Daten</Text>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Emergency Record</Text>
              <Text style={styles.value}>
                {profile?.updated_at ? "Vorhanden" : "Noch nicht gespeichert"}
              </Text>
            </View>

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
        </>
      )}
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
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: {
    color: "#98a2b3",
    fontSize: 18,
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
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  sectionText: {
    color: "#aeb6c4",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  infoBlock: {
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  infoCol: {
    flex: 1,
    marginBottom: 10,
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
  valueSmall: {
    color: "#d7dce5",
    fontSize: 14,
    lineHeight: 20,
  },
  valueMono: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#e10600",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexGrow: 1,
    minWidth: 150,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#1a2232",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexGrow: 1,
    minWidth: 150,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "700",
  },
});
