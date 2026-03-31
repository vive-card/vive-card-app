import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        Alert.alert("Hinweis", "Bitte E-Mail eingeben");
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) {
        Alert.alert("Fehler", error.message);
        return;
      }

      Alert.alert(
        "E-Mail gesendet",
        "Wenn die Adresse existiert, wurde eine Passwort-Reset-E-Mail verschickt.",
        [
          {
            text: "OK",
            onPress: () => navigation?.navigate?.("Login"),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Fehler", err?.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Passwort zurücksetzen</Text>
        <Text style={styles.subtitle}>
          Gib deine E-Mail-Adresse ein, um ein neues Passwort anzufordern
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={styles.input}
            placeholder="deine@email.ch"
            placeholderTextColor="#7e8797"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Senden ..." : "Reset-Link senden"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation?.navigate?.("Login")}
          >
            <Text style={styles.linkText}>Zurück zum Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#aeb6c4",
    fontSize: 16,
    marginBottom: 28,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#10141f",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  label: {
    color: "#c8cfdb",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1b2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: "#e10600",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    color: "#c7ccd6",
    fontSize: 16,
  },
});
