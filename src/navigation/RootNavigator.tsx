import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { getCurrentUser } from "../lib/auth";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator } from "./AppNavigator";
import { SplashScreen } from "../screens/SplashScreen";

export function RootNavigator() {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setIsSignedIn(!!user);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    boot();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
