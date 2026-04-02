import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";

import {
  loginWithEmail,
  forgotPassword,
  applyPasswordReset,
  acceptTerms,
  acceptPrivacyClaim,
  claimCard,
  signupWithEmail,
  submitBlockRequest,
  normalizePid,
} from "../services/authService";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [publicId, setPublicId] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [claimSuccessPid, setClaimSuccessPid] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading("login");
      setMessage("");

      const res = await loginWithEmail({
        email,
        password,
        publicId,
      });

      setMessage(res.message);

      if (res.requiresTerms) {
        setShowTerms(true);
        return;
      }

      if (res.requiresPrivacyClaim) {
        setShowPrivacy(true);
        return;
      }

      if (res.requiresPid) {
        return;
      }

      if (res.claimSuccessPid) {
        setClaimSuccessPid(res.claimSuccessPid);
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleForgot = async () => {
    try {
      setLoading("forgot");
      await forgotPassword(email);
      setMessage("Reset E-Mail wurde gesendet.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    try {
      setLoading("reset");
      await applyPasswordReset(password, password);
      setMessage("Passwort geändert.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      setLoading("terms");

      const res = await acceptTerms({ publicId });

      setMessage(res.message);
      setShowTerms(false);

      if (res.requiresPrivacyClaim) {
        setShowPrivacy(true);
        return;
      }

      if (res.claimSuccessPid) {
        setClaimSuccessPid(res.claimSuccessPid);
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAcceptPrivacy = async () => {
    try {
      setLoading("privacy");

      const res = await acceptPrivacyClaim({ publicId });

      setMessage(res.message);
      setShowPrivacy(false);

      if (res.claimSuccessPid) {
        setClaimSuccessPid(res.claimSuccessPid);
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleClaim = async () => {
    try {
      setLoading("claim");

      const res = await claimCard(publicId);

      setMessage(res.message);
      setClaimSuccessPid(res.claimSuccessPid);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSignup = async () => {
    try {
      setLoading("signup");

      const res = await signupWithEmail({
        email,
        password,
        repeatPassword: password,
        termsAccepted: true,
      });

      setMessage(res.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleBlock = async () => {
    try {
      setLoading("block");

      const res = await submitBlockRequest({
        email,
        publicId,
      });

      setMessage(res.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>VIVE CARD Login</Text>

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Passwort"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="PUBLIC_ID"
        value={publicId}
        onChangeText={(v) => setPublicId(normalizePid(v))}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>
          {loading === "login" ? "..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgot}>
        <Text style={styles.link}>Passwort vergessen?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={handleSignup}>
        <Text style={styles.buttonText}>Registrieren</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={handleClaim}>
        <Text style={styles.buttonText}>Claim Card</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={handleBlock}>
        <Text style={styles.buttonText}>Karte sperren</Text>
      </TouchableOpacity>

      {showTerms && (
        <View style={styles.box}>
          <Text>Bitte AGB akzeptieren</Text>
          <TouchableOpacity style={styles.button} onPress={handleAcceptTerms}>
            <Text style={styles.buttonText}>Akzeptieren</Text>
          </TouchableOpacity>
        </View>
      )}

      {showPrivacy && (
        <View style={styles.box}>
          <Text>Bitte Datenschutz akzeptieren</Text>
          <TouchableOpacity style={styles.button} onPress={handleAcceptPrivacy}>
            <Text style={styles.buttonText}>Akzeptieren</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!claimSuccessPid && (
        <View style={styles.success}>
          <Text>✅ Karte aktiviert: {claimSuccessPid}</Text>
        </View>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0e0f12",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1c1e24",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#e10600",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  secondary: {
    backgroundColor: "#2a2d35",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  link: {
    color: "#fff",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  message: {
    color: "#fff",
    marginTop: 20,
  },
  box: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#1c1e24",
    borderRadius: 8,
  },
  success: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#1f4d2b",
    borderRadius: 8,
  },
});