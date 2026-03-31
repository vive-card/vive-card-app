import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export function EditProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil bearbeiten</Text>
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
