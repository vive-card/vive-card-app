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
  EmergencyCardRow,
  ProfileFormValues,
  fullCardUrl,
  getCurrentUserCardProfile,
  lineValue,
  mapEmergencyDataToForm,
} from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";

export default function CardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [formView, setFormView] = useState<ProfileFormValues | null>(null);

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setFormView(mapEmergencyDataToForm(result.profile));
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
