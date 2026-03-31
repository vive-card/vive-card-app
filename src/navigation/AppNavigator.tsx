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

function DashboardTabIcon({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 20,
        fontWeight: focused ? "900" : "700",
        marginBottom: -2,
      }}
    >
      ▼
    </Text>
  );
}

function CardTabIcon({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 20,
        fontWeight: focused ? "900" : "700",
        marginBottom: -2,
      }}
    >
      ▼
    </Text>
  );
}

function SettingsTabIcon({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 20,
        fontWeight: focused ? "900" : "700",
        marginBottom: -2,
      }}
    >
      ▼
    </Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#f2f2f2",
          borderTopColor: "#d9d9d9",
          height: 84,
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarActiveTintColor: "#1677ff",
        tabBarInactiveTintColor: "#8c8c8c",
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ focused, color }) => (
            <DashboardTabIcon focused={focused} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Karte"
        component={CardScreen}
        options={{
          tabBarLabel: "Karte",
          tabBarIcon: ({ focused, color }) => (
            <CardTabIcon focused={focused} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <SettingsTabIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

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
      <Stack.Screen
        name="MainTabs"
        component={Tabs}
        options={{ headerShown: false }}
      />

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
