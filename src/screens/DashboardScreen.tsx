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
import {
  CardRow,
  ProfileRow,
  fullCardUrl,
  getCurrentUserCardProfile,
  getStatusColor,
  getStatusLabel,
  lineValue,
} from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";

export default function DashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    const result = await getCurrentUserCardProfile();

    setUserEmail(result.user?.email || "");
    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
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
    cardId: card?.id || null,
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

  const handleEditProfile = () => {
    if (!card?.id) {
      Alert.alert("Hinweis", "Keine Karte gefunden");
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate("EditProfile");
      return;
    }

    Alert.alert("Hinweis", "EditProfile Screen ist noch nicht verbunden");
  };

  const handleOpenCardTab = () => {
    if (navigation?.navigate) {
      navigation.navigate("Karte");
      return;
    }

    Alert.alert("Hinweis", "Karte Screen ist noch nicht verbunden");
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
              <Text style={styles.valueSmall}>{fullCardUrl(card.public_id)}</Text>
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
              <Text style={styles.sectionTitle}>Persönliche Daten</Text>

              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={styles.linkText}>Bearbeiten</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Vorname</Text>
                <Text style={styles.value}>{lineValue(profile?.first_name)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Nachname</Text>
                <Text style={styles.value}>{lineValue(profile?.last_name)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Geburtsdatum</Text>
                <Text style={styles.value}>{lineValue(profile?.birth_date)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Blutgruppe</Text>
                <Text style={styles.value}>{lineValue(profile?.blood_type)}</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Sprache</Text>
              <Text style={styles.value}>{lineValue(profile?.language, "de")}</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>Medizinische Informationen</Text>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Allergien</Text>
              <Text style={styles.value}>{lineValue(profile?.allergies)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Diagnosen</Text>
              <Text style={styles.value}>{lineValue(profile?.diagnoses)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Medikamente</Text>
              <Text style={styles.value}>{lineValue(profile?.medications)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Implantate / Hinweise</Text>
              <Text style={styles.value}>{lineValue(profile?.implants)}</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>Notfallkontakt</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>
                  {lineValue(profile?.emergency_contact_name)}
                </Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>Beziehung</Text>
                <Text style={styles.value}>
                  {lineValue(profile?.emergency_contact_relation)}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Telefon</Text>
              <Text style={styles.value}>
                {lineValue(profile?.emergency_contact_phone)}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Zusatzinfo</Text>
              <Text style={styles.value}>
                {lineValue(profile?.emergency_contact_notes)}
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
