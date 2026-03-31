import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>Settings Screen ist verbunden.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06080d",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 12,
  },
  text: {
    color: "#aeb6c4",
    fontSize: 16,
  },
});
