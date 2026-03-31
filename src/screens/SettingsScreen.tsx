import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { signOut } from "../lib/auth";
import { colors } from "../constants/colors";

export function SettingsScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    try {
      setBusy(true);
      setError("");
      await signOut();
    } catch (e: any) {
      setError(e?.message || "Logout fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Logout ..." : "Logout"}
        </Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  error: {
    color: colors.err,
    marginTop: 14
  }
});
