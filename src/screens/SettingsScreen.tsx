import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type CardRow = {
  id: string;
  public_id: string;
  status?: string | null;
};

const I18N = {
  de: {
    loading: "Einstellungen werden geladen …",
    title: "Settings",
    error_generic: "Fehler",
    error_no_session: "Keine Session",
    error_link_open: "Link konnte nicht geöffnet werden",

    section_account: "Konto",
    label_email: "E-Mail",
    label_public_id: "PUBLIC_ID",
    label_status: "Status",

    section_navigation: "Navigation",
    nav_dashboard: "Dashboard",
    nav_card: "Karte",
    nav_public_card: "Öffentliche Karte",

    section_wallet: "Wallet",
    wallet_ready: "Wallet vorbereitet",
    wallet_apple: "Apple Wallet",
    wallet_info_title: "Info",
    wallet_info_text: "Wallet kommt später (Backend bereit)",

    section_security: "Sicherheit",
    logout: "Logout",
    logout_title: "Logout",
    logout_confirm: "Wirklich abmelden?",
    cancel: "Abbrechen",

    status_active: "Aktiv",
    status_blocked: "Gesperrt",
    status_pending: "Ausstehend",
    status_unknown: "Unbekannt",

    fallback: "—",
  },

  it: {
    loading: "Caricamento impostazioni…",
    title: "Impostazioni",
    error_generic: "Errore",
    error_no_session: "Nessuna sessione",
    error_link_open: "Impossibile aprire il link",

    section_account: "Account",
    label_email: "E-mail",
    label_public_id: "PUBLIC_ID",
    label_status: "Stato",

    section_navigation: "Navigazione",
    nav_dashboard: "Dashboard",
    nav_card: "Carta",
    nav_public_card: "Carta pubblica",

    section_wallet: "Wallet",
    wallet_ready: "Wallet pronto",
    wallet_apple: "Apple Wallet",
    wallet_info_title: "Info",
    wallet_info_text: "Wallet arriverà più tardi (backend pronto)",

    section_security: "Sicurezza",
    logout: "Logout",
    logout_title: "Logout",
    logout_confirm: "Vuoi davvero uscire?",
    cancel: "Annulla",

    status_active: "Attiva",
    status_blocked: "Bloccata",
    status_pending: "In attesa",
    status_unknown: "Sconosciuto",

    fallback: "—",
  },

  fr: {
    loading: "Chargement des paramètres…",
    title: "Paramètres",
    error_generic: "Erreur",
    error_no_session: "Aucune session",
    error_link_open: "Le lien n’a pas pu être ouvert",

    section_account: "Compte",
    label_email: "E-mail",
    label_public_id: "PUBLIC_ID",
    label_status: "Statut",

    section_navigation: "Navigation",
    nav_dashboard: "Tableau de bord",
    nav_card: "Carte",
    nav_public_card: "Carte publique",

    section_wallet: "Wallet",
    wallet_ready: "Wallet prêt",
    wallet_apple: "Apple Wallet",
    wallet_info_title: "Info",
    wallet_info_text: "Wallet arrivera plus tard (backend prêt)",

    section_security: "Sécurité",
    logout: "Déconnexion",
    logout_title: "Déconnexion",
    logout_confirm: "Voulez-vous vraiment vous déconnecter ?",
    cancel: "Annuler",

    status_active: "Active",
    status_blocked: "Bloquée",
    status_pending: "En attente",
    status_unknown: "Inconnu",

    fallback: "—",
  },

  es: {
    loading: "Cargando ajustes…",
    title: "Ajustes",
    error_generic: "Error",
    error_no_session: "No hay sesión",
    error_link_open: "No se pudo abrir el enlace",

    section_account: "Cuenta",
    label_email: "Correo electrónico",
    label_public_id: "PUBLIC_ID",
    label_status: "Estado",

    section_navigation: "Navegación",
    nav_dashboard: "Panel",
    nav_card: "Tarjeta",
    nav_public_card: "Tarjeta pública",

    section_wallet: "Wallet",
    wallet_ready: "Wallet preparado",
    wallet_apple: "Apple Wallet",
    wallet_info_title: "Info",
    wallet_info_text: "Wallet llegará más tarde (backend listo)",

    section_security: "Seguridad",
    logout: "Cerrar sesión",
    logout_title: "Cerrar sesión",
    logout_confirm: "¿Seguro que quieres cerrar sesión?",
    cancel: "Cancelar",

    status_active: "Activa",
    status_blocked: "Bloqueada",
    status_pending: "Pendiente",
    status_unknown: "Desconocido",

    fallback: "—",
  },

  en: {
    loading: "Loading settings…",
    title: "Settings",
    error_generic: "Error",
    error_no_session: "No session",
    error_link_open: "Link could not be opened",

    section_account: "Account",
    label_email: "Email",
    label_public_id: "PUBLIC_ID",
    label_status: "Status",

    section_navigation: "Navigation",
    nav_dashboard: "Dashboard",
    nav_card: "Card",
    nav_public_card: "Public card",

    section_wallet: "Wallet",
    wallet_ready: "Wallet ready",
    wallet_apple: "Apple Wallet",
    wallet_info_title: "Info",
    wallet_info_text: "Wallet is coming later (backend ready)",

    section_security: "Security",
    logout: "Logout",
    logout_title: "Logout",
    logout_confirm: "Do you really want to log out?",
    cancel: "Cancel",

    status_active: "Active",
    status_blocked: "Blocked",
    status_pending: "Pending",
    status_unknown: "Unknown",

    fallback: "—",
  },
} as const;

function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function buildCardUrl(pid: string) {
  const cleanPid = normalizePid(pid);
  return `/p/${encodeURIComponent(cleanPid)}?emergency=1`;
}

function fullCardUrl(pid: string) {
  return `https://vive-card.com${buildCardUrl(pid)}`;
}

function getStatusColor(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "#1e8a4a";
  if (value === "blocked") return "#b01818";
  if (value === "pending") return "#d39b22";

  return "#5b6472";
}

export default function SettingsScreen({ navigation }: any) {
  const [lang, setLang] = useState<keyof typeof I18N>("de");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [card, setCard] = useState<CardRow | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [error, setError] = useState("");

  function t(key: keyof typeof I18N.de) {
    return I18N[lang]?.[key] ?? I18N.de[key] ?? key;
  }

  function lineValue(value?: string | null, fallback = t("fallback")) {
    const clean = String(value || "").trim();
    return clean || fallback;
  }

  function getStatusLabel(status?: string | null) {
    const value = String(status || "").toLowerCase();

    if (value === "active") return t("status_active");
    if (value === "blocked") return t("status_blocked");
    if (value === "pending") return t("status_pending");

    return t("status_unknown");
  }

  const loadData = useCallback(async () => {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(t("error_no_session"));
    }

    setUserEmail(user.email || "");

    const { data: ownedCard, error: cardError } = await supabase
      .from("cards")
      .select("id, public_id, status, created_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cardError) {
      throw new Error(cardError.message);
    }

    setCard(ownedCard || null);
  }, [lang]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (e: any) {
        setError(e?.message || t("error_generic"));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData, lang]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || t("error_generic"));
    } finally {
      setRefreshing(false);
    }
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t("alert_error"), t("error_link_open"));
      return;
    }
    await Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert(t("logout_title"), t("logout_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>{t("title")}</Text>

      <View style={styles.langRow}>
        <TouchableOpacity
          style={[styles.langBtn, lang === "de" && styles.langBtnActive]}
          onPress={() => setLang("de")}
        >
          <Text
  style={[
    styles.langBtnText,
    lang === "de" && styles.langBtnTextActive,
  ]}
>
  DE
</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, lang === "it" && styles.langBtnActive]}
          onPress={() => setLang("it")}
        >
          <Text style={styles.langBtnText}>IT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, lang === "fr" && styles.langBtnActive]}
          onPress={() => setLang("fr")}
        >
          <Text style={styles.langBtnText}>FR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, lang === "es" && styles.langBtnActive]}
          onPress={() => setLang("es")}
        >
          <Text style={styles.langBtnText}>ES</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
          onPress={() => setLang("en")}
        >
          <Text style={styles.langBtnText}>EN</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.box}>
        <Text style={styles.section}>{t("section_account")}</Text>

        <Text style={styles.label}>{t("label_email")}</Text>
        <Text style={styles.value}>{lineValue(userEmail)}</Text>

        <Text style={styles.label}>{t("label_public_id")}</Text>
        <Text style={styles.valueMono}>{lineValue(card?.public_id)}</Text>

        <Text style={styles.label}>{t("label_status")}</Text>
        <Text style={styles.value}>{getStatusLabel(card?.status)}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.section}>{t("section_navigation")}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.buttonText}>{t("nav_dashboard")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Card")}
        >
          <Text style={styles.buttonText}>{t("nav_card")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (card?.public_id) {
              openUrl(fullCardUrl(card.public_id));
            } else {
              Alert.alert(t("alert_note"), t("no_card_found"));
            }
          }}
        >
          <Text style={styles.buttonText}>{t("nav_public_card")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.box}>
        <Text style={styles.section}>{t("section_wallet")}</Text>

        <View style={styles.row}>
          <Text style={styles.value}>{t("wallet_ready")}</Text>
          <Switch
            value={walletReady}
            onValueChange={setWalletReady}
            trackColor={{ true: "#e10600" }}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert(t("wallet_info_title"), t("wallet_info_text"))
          }
        >
          <Text style={styles.buttonText}>{t("wallet_apple")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.box}>
        <Text style={styles.section}>{t("section_security")}</Text>

        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const COLORS = {
  bg: "#f4f6f8",
  panel: "#ffffff",
  panelSoft: "#fbfcfe",

  border: "#e7ebf0",
  borderStrong: "rgba(16,19,24,0.14)",

  text: "#101318",
  textSoft: "#4b5563",
  textMuted: "#687386",

  primary: "#b01818",
  primaryDark: "#861212",

  dangerSoft: "rgba(176,24,24,0.08)",
  dangerBorder: "rgba(176,24,24,0.25)",

  blueSoft: "rgba(31,111,235,0.08)",
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textSoft,
    fontSize: 15,
    fontWeight: "700",
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 16,
    letterSpacing: -0.4,
  },

  section: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  box: {
    backgroundColor: COLORS.panel,
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  value: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },

  valueMono: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  button: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonText: {
    color: COLORS.text,
    fontWeight: "900",
    textAlign: "center",
    fontSize: 15,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logout: {
    backgroundColor: "#fff0f0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(176,24,24,0.20)",
  },

  logoutText: {
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  error: {
    color: "#7a1212",
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },

  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 18,
  },

  langBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 4,
    marginBottom: 8,
  },

  langBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  langBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

  langBtnTextActive: {
    color: "#ffffff",
  },
});
