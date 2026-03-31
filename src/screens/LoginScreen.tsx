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

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert("Login fehlgeschlagen", error.message);
      }
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
        <Text style={styles.subtitle}>Login in dein Dashboard</Text>

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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Einloggen ..." : "Einloggen"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation?.navigate?.("ForgotPassword")}
          >
            <Text style={styles.linkText}>Passwort vergessen?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation?.navigate?.("Register")}
          >
            <Text style={styles.linkText}>Noch kein Konto? Registrieren</Text>
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
