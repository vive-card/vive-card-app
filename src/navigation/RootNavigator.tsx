import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { getCurrentUser } from "../lib/auth";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator } from "./AppNavigator";
import { SplashScreen } from "../screens/SplashScreen";

export function RootNavigator() {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setIsSignedIn(!!user);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isSignedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
