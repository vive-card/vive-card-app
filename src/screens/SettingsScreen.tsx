import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>
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
    fontWeight: "800"
  }
});
