import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

export default function DocumentViewerScreen({ route }: any) {
  const doc = route?.params?.doc;

  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string>("");

  const isImage = useMemo(() => {
    return String(doc?.mime_type || "").startsWith("image/");
  }, [doc]);

  const isPdf = useMemo(() => {
    return String(doc?.mime_type || "") === "application/pdf";
  }, [doc]);

  useEffect(() => {
    (async () => {
      try {
        if (!doc?.file_path) {
          throw new Error("Dokumentpfad fehlt");
        }

        const { data, error } = await supabase.storage
          .from("medical-docs")
          .createSignedUrl(doc.file_path, 60 * 10);

        if (error || !data?.signedUrl) {
          throw new Error(error?.message || "Signed URL konnte nicht erstellt werden");
        }

        setSignedUrl(data.signedUrl);
      } catch (e: any) {
        Alert.alert("Fehler", e?.message || "Dokument konnte nicht geladen werden");
      } finally {
        setLoading(false);
      }
    })();
  }, [doc]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>Dokument wird geladen …</Text>
      </View>
    );
  }

  if (!signedUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Dokument konnte nicht geladen werden.</Text>
      </View>
    );
  }

  if (isImage) {
    return (
      <View style={styles.screen}>
        <Image
          source={{ uri: signedUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (isPdf) {
    return (
      <View style={styles.screen}>
        <WebView
          source={{ uri: signedUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#e10600" />
              <Text style={styles.loadingText}>PDF wird geladen …</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>
        Dieser Dateityp kann in der App nicht direkt angezeigt werden.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  center: {
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
  errorText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  image: {
    flex: 1,
    width: "100%",
    backgroundColor: "#06080d",
  },
  webview: {
    flex: 1,
    backgroundColor: "#06080d",
  },
});
