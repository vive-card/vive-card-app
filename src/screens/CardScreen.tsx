import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  lineValue,
} from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";

export default function CardScreen() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (e: any) {
        Alert.alert("Fehler", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  useCardRealtime({
    cardId: card?.id || null,
    ownerUserId: userId,
    enabled: !loading,
    onChange: loadData,
  });

  const handleOpenCard = async () => {
    if (!card?.public_id) return;

    const url = fullCardUrl(card.public_id);
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#e10600" />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Karte gefunden</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deine Karte</Text>

      <View style={styles.card}>
        <Text style={styles.brand}>VIVE CARD</Text>

        <View style={styles.spacer} />

        <Text style={styles.name}>
          {lineValue(profile?.first_name)} {lineValue(profile?.last_name, "")}
        </Text>

        <Text style={styles.blood}>
          Blutgruppe: {lineValue(profile?.blood_type)}
        </Text>

        <View style={styles.spacer} />

        <Text style={styles.pid}>{card.public_id}</Text>

        <View style={styles.footer}>
          <Text style={styles.emergency}>Notfallkontakt:</Text>
          <Text style={styles.emergencyValue}>
            {lineValue(profile?.emergency_contact_name)}
          </Text>
          <Text style={styles.emergencyValue}>
            {lineValue(profile?.emergency_contact_phone, "")}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleOpenCard}>
        <Text style={styles.buttonText}>Karte öffnen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06080d",
    padding: 20,
    alignItems: "center",
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#06080d",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  brand: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  blood: {
    color: "#aeb6c4",
    marginTop: 6,
  },
  pid: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  footer: {
    marginTop: 20,
  },
  emergency: {
    color: "#8f98a8",
    fontSize: 12,
    marginBottom: 4,
  },
  emergencyValue: {
    color: "#fff",
    fontSize: 14,
  },
  spacer: {
    height: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#e10600",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
