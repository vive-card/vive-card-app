import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CardScreen } from "../screens/CardScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type AppTabParamList = {
  Dashboard: undefined;
  Karte: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Karte" component={CardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
