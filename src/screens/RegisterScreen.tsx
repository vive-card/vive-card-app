import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { signUp } from "../lib/auth";
import { colors } from "../constants/colors";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister() {
    try {
      setBusy(true);
      setError("");
      setMessage("");

      await signUp(email.trim(), password);

      setMessage("Registrierung erfolgreich. Prüfe deine E-Mails.");
    } catch (e: any) {
      setError(e?.message || "Registrierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Registrieren</Text>
        <Text style={styles.subtitle}>Neues VIVE CARD Konto erstellen</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="deine@email.ch"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Passwort</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Passwort"
            placeholderTextColor={colors.muted}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}

          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? "Registrierung läuft ..." : "Registrieren"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>Zurück zum Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
    marginBottom: 28
  },
  form: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line
  },
  label: {
    color: colors.muted,
    marginBottom: 8,
    marginTop: 10,
    fontSize: 13
  },
  input: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text
  },
  button: {
    marginTop: 20,
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
  link: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 14,
    fontSize: 14
  },
  error: {
    color: colors.err,
    marginTop: 12,
    fontSize: 14
  },
  success: {
    color: colors.ok,
    marginTop: 12,
    fontSize: 14
  }
});
