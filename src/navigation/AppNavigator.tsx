import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import DashboardScreen from "../screens/DashboardScreen";
import CardScreen from "../screens/CardScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * SIMPLE ICONS (kannst du später durch echte Icons ersetzen)
 */
function TabIcon({
  label,
  focused,
  color,
}: {
  label: string;
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 18,
        fontWeight: focused ? "900" : "600",
        marginBottom: -2,
      }}
    >
      {label}
    </Text>
  );
}

/**
 * ===================== TABS =====================
 */
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#0b0f17",
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 84,
          paddingTop: 8,
          paddingBottom: 18,
        },

        tabBarActiveTintColor: "#e10600",
        tabBarInactiveTintColor: "#8c8c8c",

        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="●" focused={focused} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Card"
        component={CardScreen}
        options={{
          tabBarLabel: "Karte",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="■" focused={focused} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="⚙" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * ===================== STACK =====================
 */
export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#06080d",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "800",
        },
        contentStyle: {
          backgroundColor: "#06080d",
        },
      }}
    >
      {/* MAIN APP */}
      <Stack.Screen
        name="MainTabs"
        component={Tabs}
        options={{ headerShown: false }}
      />

      {/* EDIT PROFILE (arbeitet jetzt mit emergency_cards!) */}
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: "Profil bearbeiten",
          presentation: "card",
        }}
      />
    </Stack.Navigator>
  );
}
