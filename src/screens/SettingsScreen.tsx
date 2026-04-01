import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
};

function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function buildCardUrl(pid: string) {
  const cleanPid = normalizePid(pid);
  return `/p/${encodeURIComponent(cleanPid)}?emergency=1`;
}

function fullCardUrl(pid: string) {
  return `https://vive-card.com${buildCardUrl(pid)}`;
}

export default function SettingsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [card, setCard] = useState<CardRow | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Keine Session");
    }

    setUserEmail(user.email || "");

    const { data: ownedCard, error: cardError } = await supabase
      .from("cards")
      .select("id, public_id, status, created_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cardError) {
      throw new Error(cardError.message);
    }

    setCard(ownedCard || null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (e: any) {
        setError(e?.message || "Fehler");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Fehler");
    } finally {
      setRefreshing(false);
    }
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Fehler", "Link konnte nicht geöffnet werden");
      return;
    }
    await Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
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
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Settings</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Konto */}
      <View style={styles.box}>
        <Text style={styles.section}>Konto</Text>

        <Text style={styles.label}>E-Mail</Text>
        <Text style={styles.value}>{userEmail || "—"}</Text>

        <Text style={styles.label}>PUBLIC_ID</Text>
        <Text style={styles.valueMono}>{card?.public_id || "—"}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{card?.status || "—"}</Text>
      </View>

      {/* Navigation */}
      <View style={styles.box}>
        <Text style={styles.section}>Navigation</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.buttonText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Karte")}
        >
          <Text style={styles.buttonText}>Karte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (card?.public_id) {
              openUrl(fullCardUrl(card.public_id));
            }
          }}
        >
          <Text style={styles.buttonText}>Öffentliche Karte</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet */}
      <View style={styles.box}>
        <Text style={styles.section}>Wallet</Text>

        <View style={styles.row}>
          <Text style={styles.value}>Wallet vorbereitet</Text>
          <Switch
            value={walletReady}
            onValueChange={setWalletReady}
            trackColor={{ true: "#e10600" }}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert("Info", "Wallet kommt später (Backend bereit)")
          }
        >
          <Text style={styles.buttonText}>Apple Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Sicherheit */}
      <View style={styles.box}>
        <Text style={styles.section}>Sicherheit</Text>

        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#06080d",
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 20,
  },
  section: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  box: {
    backgroundColor: "#10141f",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  label: {
    color: "#888",
    fontSize: 12,
    marginTop: 10,
  },
  value: {
    color: "#fff",
    fontSize: 16,
  },
  valueMono: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  button: {
    backgroundColor: "#1a2232",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logout: {
    backgroundColor: "#2a1114",
    padding: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: "#ff6b6b",
    textAlign: "center",
    fontWeight: "800",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 10,
  },
});
