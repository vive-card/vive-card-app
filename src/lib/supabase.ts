import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

class ExpoSecureStoreAdapter {
  async getItem(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    await SecureStore.deleteItemAsync(key);
    return null;
  }
}

  setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  }

  removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
  storage: new ExpoSecureStoreAdapter(),
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
  debug: false
}
});
