import { supabase } from "../lib/supabase";

export type MessageType = "" | "ok" | "err";

type AuthResult = {
  requiresTerms: boolean;
  requiresPrivacyClaim: boolean;
  requiresPid: boolean;
  claimSuccessPid: string | null;
  message: string;
};

type ClaimResult = {
  claimSuccessPid: string;
  message: string;
};

type SimpleMessageResult = {
  message: string;
};

type ProfileRow = {
  owner_id: string;
  email?: string | null;
  public_id?: string | null;
  terms_accepted_at?: string | null;
  privacy_claim_accepted_at?: string | null;
  email_confirmed_at?: string | null;
};

type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
  blocked_at?: string | null;
};

const SUPABASE_URL = "https://uyrvuekhvczbjvpbequv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cnZ1ZWtodmN6Ymp2cGJlcXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjA1OTAsImV4cCI6MjA4NjkzNjU5MH0.-6Fia8CGlMxKf6xPGAZK-kFfUXtCtqXH7etfFtMJ1OU";

const TEXT = {
  errEnterEmail: "Bitte E-Mail eingeben.",
  errEnterLogin: "Bitte E-Mail und Passwort eingeben.",
  errInvalidEmail: "Bitte eine gültige E-Mail eingeben.",
  errUserMissing: "Login ok, aber User fehlt. Bitte neu einloggen.",
  errRelogin: "Bitte neu einloggen.",
  errPwShort: "Passwort zu kurz (mind. 6 Zeichen).",
  errPwMatch: "Passwörter stimmen nicht überein.",
  errPid: "Bitte PUBLIC_ID eingeben.",
  errLoginFirst: "Bitte zuerst einloggen.",
  errClaimRpc: "Claim Fehler: RPC nicht verfügbar.",
  errBlocked: "Diese VIVE CARD wurde gesperrt oder deaktiviert.",
  errCardCheckPrefix: "Kartenstatus konnte nicht geprüft werden: ",
  errProfileLoadPrefix: "Profil konnte nicht geladen werden: ",
  errSavePrefix: "Speichern fehlgeschlagen: ",
  errPidSavePrefix: "PUBLIC_ID konnte nicht gespeichert werden: ",
  errPrivacySavePrefix:
    "Datenschutzzustimmung konnte nicht gespeichert werden: ",
  errResetPrefix: "Reset fehlgeschlagen: ",
  errResetApplyPrefix: "Passwort-Änderung fehlgeschlagen: ",
  errLoginPrefix: "Login fehlgeschlagen: ",
  errClaimPrefix: "Claim fehlgeschlagen: ",
  needTerms: "Bitte AGB & Nutzungsvereinbarung akzeptieren.",
  needPrivacyClaim:
    "Bitte bestätige zuerst den Datenschutzhinweis zur Kartenaktivierung.",
  needPid: "Bitte PUBLIC_ID eingeben und 'Claim Card' drücken.",
  termsOk: "AGB akzeptiert.",
  privacyClaimOk: "Datenschutzhinweis akzeptiert.",
  claimOk: "Claim OK.",
  signupOk:
    "Konto erstellt. Bitte bestätige jetzt deine E-Mail über den Link in deinem Postfach.",
  resetSent:
    "E-Mail zum Zurücksetzen wurde versendet. Bitte Postfach prüfen.",
  resetOk:
    "Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.",
  emailConfirmRequired:
    "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.",
  blockRequestOk:
    "Deine Sperranfrage wurde erfolgreich übermittelt. Die Karte wurde sofort gesperrt und unser Support prüft den Fall schnellstmöglich.",
  blockRequestFailed: "Sperranfrage konnte nicht gesendet werden.",
  signupFailed: "Registrierung fehlgeschlagen.",
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function normalizePid(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return {
    user: data?.user || null,
    error: error || null,
  };
}

async function loadProfile(ownerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "owner_id, email, public_id, terms_accepted_at, privacy_claim_accepted_at, email_confirmed_at"
    )
    .eq("owner_id", ownerId)
    .maybeSingle();

  return {
    profile: (data as ProfileRow | null) || null,
    error: error || null,
  };
}

async function upsertProfile(values: Partial<ProfileRow> & { owner_id: string }) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(values, { onConflict: "owner_id" })
    .select(
      "owner_id, email, public_id, terms_accepted_at, privacy_claim_accepted_at, email_confirmed_at"
    )
    .maybeSingle();

  return {
    profile: (data as ProfileRow | null) || null,
    error: error || null,
  };
}

async function savePrivacyClaimConsent(ownerId: string) {
  return upsertProfile({
    owner_id: ownerId,
    privacy_claim_accepted_at: new Date().toISOString(),
  });
}

async function getOrCreateProfile() {
  const { user, error: userErr } = await getCurrentUser();

  if (userErr || !user) {
    return {
      user: null,
      profile: null,
      error: new Error(TEXT.errRelogin),
    };
  }

  const loaded = await loadProfile(user.id);

  if (loaded.error) {
    return {
      user,
      profile: null,
      error: new Error(TEXT.errProfileLoadPrefix + loaded.error.message),
    };
  }

  if (loaded.profile) {
    return {
      user,
      profile: loaded.profile,
      error: null,
    };
  }

  const created = await upsertProfile({ owner_id: user.id });

  if (created.error) {
    return {
      user,
      profile: null,
      error: new Error(TEXT.errSavePrefix + created.error.message),
    };
  }

  return {
    user,
    profile: created.profile,
    error: null,
  };
}

async function syncConfirmedEmailIfNeeded(user: any, profile: ProfileRow | null) {
  const authConfirmedAt =
    user?.email_confirmed_at || user?.confirmed_at || null;

  if (!profile?.email_confirmed_at && authConfirmedAt) {
    const updated = await upsertProfile({
      owner_id: user.id,
      email: String(user.email || "").trim().toLowerCase(),
      email_confirmed_at: authConfirmedAt,
    });

    if (!updated.error && updated.profile) {
      return updated.profile;
    }
  }

  return profile;
}

async function getCardByPid(pid: string) {
  const cleanPid = normalizePid(pid);

  if (!cleanPid) {
    return {
      card: null,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("cards")
    .select("id, public_id, status, blocked_at")
    .eq("public_id", cleanPid)
    .maybeSingle();

  return {
    card: (data as CardRow | null) || null,
    error: error || null,
  };
}

function isBlockedCard(card: CardRow | null) {
  if (!card) return false;
  return String(card.status || "") === "blocked" || !!card.blocked_at;
}

export async function ensureCardNotBlocked(publicId: string): Promise<void> {
  const cleanPid = normalizePid(publicId);

  if (!cleanPid) return;

  const { card, error } = await getCardByPid(cleanPid);

  if (error) {
    throw new Error(TEXT.errCardCheckPrefix + error.message);
  }

  if (card && isBlockedCard(card)) {
    throw new Error(TEXT.errBlocked);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error(TEXT.errEnterEmail);
  }

  if (!isValidEmail(cleanEmail)) {
    throw new Error(TEXT.errEnterEmail);
  }

  const redirectTo = "https://vive-card.com/login";

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });

  if (error) {
    throw new Error(TEXT.errResetPrefix + error.message);
  }
}

export async function applyPasswordReset(
  newPassword: string,
  repeatPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error(TEXT.errPwShort);
  }

  if (newPassword !== repeatPassword) {
    throw new Error(TEXT.errPwMatch);
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(TEXT.errResetApplyPrefix + error.message);
  }
}

export async function claimCard(publicId: string): Promise<ClaimResult> {
  const cleanPid = normalizePid(publicId);

  if (!cleanPid) {
    throw new Error(TEXT.errPid);
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData?.session) {
    throw new Error(TEXT.errLoginFirst);
  }

  const profileResult = await getOrCreateProfile();

  if (profileResult.error || !profileResult.user) {
    throw new Error(profileResult.error?.message || TEXT.errUserMissing);
  }

  let profile = await syncConfirmedEmailIfNeeded(
    profileResult.user,
    profileResult.profile
  );

  if (!profile?.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error(TEXT.emailConfirmRequired);
  }

  if (!profile?.terms_accepted_at) {
    throw new Error(TEXT.needTerms);
  }

  if (!profile?.privacy_claim_accepted_at) {
    throw new Error(TEXT.needPrivacyClaim);
  }

  await ensureCardNotBlocked(cleanPid);

  try {
    const { error: claimError } = await supabase.rpc("claim_card", {
      p_public_id: cleanPid,
    });

    if (claimError) {
      throw new Error(TEXT.errClaimPrefix + claimError.message);
    }
  } catch (error: any) {
    if (String(error?.message || "").startsWith(TEXT.errClaimPrefix)) {
      throw error;
    }
    throw new Error(TEXT.errClaimRpc);
  }

  const updatedProfile = await upsertProfile({
    owner_id: profileResult.user.id,
    public_id: cleanPid,
  });

  if (updatedProfile.error) {
    throw new Error(TEXT.errPidSavePrefix + updatedProfile.error.message);
  }

  return {
    claimSuccessPid: cleanPid,
    message: TEXT.claimOk,
  };
}

export async function loginWithEmail(params: {
  email: string;
  password: string;
  publicId?: string;
}): Promise<AuthResult> {
  const cleanEmail = String(params.email || "").trim().toLowerCase();
  const cleanPassword = String(params.password || "");
  const cleanPid = normalizePid(params.publicId);

  if (!cleanEmail || !cleanPassword) {
    throw new Error(TEXT.errEnterLogin);
  }

  if (!isValidEmail(cleanEmail)) {
    throw new Error(TEXT.errEnterEmail);
  }

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (loginError) {
    throw new Error(TEXT.errLoginPrefix + loginError.message);
  }

  const profileResult = await getOrCreateProfile();

  if (profileResult.error || !profileResult.user) {
    throw new Error(profileResult.error?.message || TEXT.errUserMissing);
  }

  let profile = await syncConfirmedEmailIfNeeded(
    profileResult.user,
    profileResult.profile
  );

  if (!profile?.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error(TEXT.emailConfirmRequired);
  }

  if (!profile?.terms_accepted_at) {
    return {
      requiresTerms: true,
      requiresPrivacyClaim: false,
      requiresPid: false,
      claimSuccessPid: null,
      message: TEXT.needTerms,
    };
  }

  if (!profile?.privacy_claim_accepted_at) {
    return {
      requiresTerms: false,
      requiresPrivacyClaim: true,
      requiresPid: false,
      claimSuccessPid: null,
      message: TEXT.needPrivacyClaim,
    };
  }

  if (cleanPid) {
    const claimResult = await claimCard(cleanPid);

    return {
      requiresTerms: false,
      requiresPrivacyClaim: false,
      requiresPid: false,
      claimSuccessPid: claimResult.claimSuccessPid,
      message: claimResult.message,
    };
  }

  if (profile?.public_id) {
    await ensureCardNotBlocked(profile.public_id);
  }

  return {
    requiresTerms: false,
    requiresPrivacyClaim: false,
    requiresPid: true,
    claimSuccessPid: null,
    message: TEXT.needPid,
  };
}

export async function acceptTerms(params: {
  publicId?: string;
}): Promise<AuthResult> {
  const cleanPid = normalizePid(params.publicId);

  const { user, error: userErr } = await getCurrentUser();

  if (userErr || !user) {
    throw new Error(TEXT.errRelogin);
  }

  const updated = await upsertProfile({
    owner_id: user.id,
    terms_accepted_at: new Date().toISOString(),
  });

  if (updated.error) {
    throw new Error(TEXT.errSavePrefix + updated.error.message);
  }

  if (!updated.profile?.privacy_claim_accepted_at) {
    return {
      requiresTerms: false,
      requiresPrivacyClaim: true,
      requiresPid: false,
      claimSuccessPid: null,
      message: TEXT.needPrivacyClaim,
    };
  }

  if (cleanPid) {
    const claimResult = await claimCard(cleanPid);

    return {
      requiresTerms: false,
      requiresPrivacyClaim: false,
      requiresPid: false,
      claimSuccessPid: claimResult.claimSuccessPid,
      message: claimResult.message,
    };
  }

  if (updated.profile?.public_id) {
    await ensureCardNotBlocked(updated.profile.public_id);
  }

  return {
    requiresTerms: false,
    requiresPrivacyClaim: false,
    requiresPid: true,
    claimSuccessPid: null,
    message: TEXT.needPid,
  };
}

export async function acceptPrivacyClaim(params: {
  publicId?: string;
}): Promise<{
  requiresPid: boolean;
  claimSuccessPid: string | null;
  message: string;
}> {
  const cleanPid = normalizePid(params.publicId);

  const { user, error: userErr } = await getCurrentUser();

  if (userErr || !user) {
    throw new Error(TEXT.errRelogin);
  }

  const updated = await savePrivacyClaimConsent(user.id);

  if (updated.error) {
    throw new Error(TEXT.errPrivacySavePrefix + updated.error.message);
  }

  if (cleanPid) {
    const claimResult = await claimCard(cleanPid);

    return {
      requiresPid: false,
      claimSuccessPid: claimResult.claimSuccessPid,
      message: claimResult.message,
    };
  }

  if (updated.profile?.public_id) {
    await ensureCardNotBlocked(updated.profile.public_id);
  }

  return {
    requiresPid: true,
    claimSuccessPid: null,
    message: TEXT.needPid,
  };
}

export async function signupWithEmail(params: {
  email: string;
  password: string;
  repeatPassword: string;
  termsAccepted: boolean;
}): Promise<SimpleMessageResult> {
  const cleanEmail = String(params.email || "").trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error(TEXT.errEnterEmail);
  }

  if (!isValidEmail(cleanEmail)) {
    throw new Error(TEXT.errInvalidEmail);
  }

  if (!params.password || params.password.length < 6) {
    throw new Error(TEXT.errPwShort);
  }

  if (params.password !== params.repeatPassword) {
    throw new Error(TEXT.errPwMatch);
  }

  if (!params.termsAccepted) {
    throw new Error(
      "Bitte akzeptiere zuerst die AGB und die Nutzungsvereinbarung."
    );
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/signup-with-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email: cleanEmail,
      password: params.password,
      terms_accepted: true,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || TEXT.signupFailed);
  }

  return {
    message: TEXT.signupOk,
  };
}

export async function submitBlockRequest(params: {
  email: string;
  publicId: string;
  reason?: string;
}): Promise<SimpleMessageResult> {
  const cleanEmail = String(params.email || "").trim().toLowerCase();
  const cleanPid = normalizePid(params.publicId);

  if (!cleanEmail) {
    throw new Error(TEXT.errEnterEmail);
  }

  if (!isValidEmail(cleanEmail)) {
    throw new Error(TEXT.errInvalidEmail);
  }

  if (!cleanPid) {
    throw new Error(TEXT.errPid);
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/request-card-block`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: cleanEmail,
        public_id: cleanPid,
        reason: String(params.reason || "").trim(),
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || data?.details || TEXT.blockRequestFailed
    );
  }

  return {
    message: TEXT.blockRequestOk,
  };
}