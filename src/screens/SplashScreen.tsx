import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../constants/colors";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VIVE CARD</Text>
      <ActivityIndicator size="small" color={colors.text} style={styles.loader} />
      <Text style={styles.subtitle}>Lade App ...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  loader: {
    marginTop: 16
  },
  subtitle: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 14
  }
});
