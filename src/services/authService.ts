// src/services/authService.ts

import { supabase } from "../lib/supabase";

export type AuthUser = {
  id: string;
  email?: string | null;
};

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  email: string;
  password: string;
};

export type ResetPasswordParams = {
  email: string;
};

function cleanEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function cleanPassword(password: string) {
  return String(password || "");
}

function assertEmail(email: string) {
  const value = cleanEmail(email);

  if (!value) {
    throw new Error("E-Mail ist erforderlich");
  }

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (!isValid) {
    throw new Error("Bitte gib eine gültige E-Mail-Adresse ein");
  }

  return value;
}

function assertPassword(password: string, minLength = 6) {
  const value = cleanPassword(password);

  if (!value) {
    throw new Error("Passwort ist erforderlich");
  }

  if (value.length < minLength) {
    throw new Error(`Das Passwort muss mindestens ${minLength} Zeichen lang sein`);
  }

  return value;
}

function mapAuthUser(user: any): AuthUser {
  return {
    id: String(user?.id || ""),
    email: user?.email || null,
  };
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || "Benutzer konnte nicht geladen werden");
  }

  return user ? mapAuthUser(user) : null;
}

export async function getCurrentUserOrThrow() {
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Keine aktive Session");
  }

  return user;
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Session konnte nicht geladen werden");
  }

  return session || null;
}

export async function signIn(params: SignInParams) {
  const email = assertEmail(params.email);
  const password = assertPassword(params.password);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || "Anmeldung fehlgeschlagen");
  }

  if (!data.user) {
    throw new Error("Anmeldung fehlgeschlagen");
  }

  return {
    user: mapAuthUser(data.user),
    session: data.session || null,
  };
}

export async function signUp(params: SignUpParams) {
  const email = assertEmail(params.email);
  const password = assertPassword(params.password);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || "Registrierung fehlgeschlagen");
  }

  return {
    user: data.user ? mapAuthUser(data.user) : null,
    session: data.session || null,
  };
}

export async function sendPasswordReset(params: ResetPasswordParams) {
  const email = assertEmail(params.email);

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw new Error(error.message || "Passwort-Reset fehlgeschlagen");
  }

  return true;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Abmelden fehlgeschlagen");
  }

  return true;
}

export function onAuthStateChange(
  callback: (event: string, session: any | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}