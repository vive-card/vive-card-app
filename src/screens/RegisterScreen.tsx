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

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password || !confirmPassword) {
        Alert.alert("Hinweis", "Bitte alle Felder ausfüllen");
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert("Hinweis", "Die Passwörter stimmen nicht überein");
        return;
      }

      if (password.length < 6) {
        Alert.alert("Hinweis", "Das Passwort muss mindestens 6 Zeichen lang sein");
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        Alert.alert("Registrierung fehlgeschlagen", error.message);
        return;
      }

      Alert.alert(
        "Erfolgreich",
        "Konto wurde erstellt. Bitte prüfe je nach Supabase-Einstellung dein E-Mail-Postfach.",
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
        <Text style={styles.title}>VIVE CARD</Text>
        <Text style={styles.subtitle}>Neues Konto erstellen</Text>

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

          <Text style={[styles.label, { marginTop: 14 }]}>Passwort</Text>
          <TextInput
            style={styles.input}
            placeholder="Passwort"
            placeholderTextColor="#7e8797"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Passwort wiederholen</Text>
          <TextInput
            style={styles.input}
            placeholder="Passwort wiederholen"
            placeholderTextColor="#7e8797"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Registrieren ..." : "Registrieren"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation?.navigate?.("Login")}
          >
            <Text style={styles.linkText}>Schon ein Konto? Einloggen</Text>
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
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#aeb6c4",
    fontSize: 18,
    marginBottom: 28,
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
