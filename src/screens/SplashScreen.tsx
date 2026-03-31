import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VIVE CARD</Text>
      <Text style={styles.subtitle}>Lade App ...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 8
  }
});
