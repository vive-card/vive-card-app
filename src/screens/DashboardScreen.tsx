import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getCurrentUserCardProfile } from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";
import type {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
} from "../types";
import { mapEmergencyDataToForm } from "../utils";

const I18N = {
  de: {
    loading: "Dashboard wird geladen …",
    dashboard_title: "Dashboard",
    welcome: "Willkommen",
    unknown_error: "Unbekannter Fehler",

    alert_note: "Hinweis",
    alert_error: "Fehler",
    no_card_found: "Keine Karte gefunden",
    card_link_open_failed: "Kartenlink konnte nicht geöffnet werden",
    card_screen_not_connected: "Card Screen ist noch nicht verbunden",

    status_active: "Aktiv",
    status_blocked: "Gesperrt",
    status_pending: "Pending",
    status_unknown: "Unbekannt",

    no_card_linked_title: "Keine Karte verknüpft",
    no_card_linked_text: "Für diesen User wurde aktuell noch keine VIVE CARD gefunden.",
    check_again: "Erneut prüfen",

    your_card: "Deine Karte",
    public_id: "PUBLIC_ID",
    card_link: "Kartenlink",
    open_card: "Karte öffnen",
    open_card_in_app: "Karte in App",

    basic_data: "Grunddaten",
    edit: "Bearbeiten",
    name: "Name",
    dob: "Geburtsdatum",
    blood_group: "Blutgruppe",

    critical_info: "Kritische Informationen",
    allergies: "Allergien",
    blood_thinner: "Blutverdünner",
    medication: "Medikamente",

    more_info: "Weitere Informationen",
    vaccinations: "Impfungen",
    chronic_conditions: "Chronische Erkrankungen",
    organ_donation: "Organspende",
    notes: "Notizen / Hinweise",

    emergency_contacts: "Notfallkontakte",
    contact1_name: "Kontakt 1 Name",
    contact1_phone: "Kontakt 1 Telefon",
    contact2_name: "Kontakt 2 Name",
    contact2_phone: "Kontakt 2 Telefon",

    technical_data: "Technische Daten",
    emergency_record: "Emergency Record",
    record_exists: "Vorhanden",
    record_missing: "Noch nicht gespeichert",
    last_update: "Letztes Update",

    fallback: "—",
  },

  it: {
    loading: "Dashboard in caricamento…",
    dashboard_title: "Dashboard",
    welcome: "Benvenuto",
    unknown_error: "Errore sconosciuto",

    alert_note: "Avviso",
    alert_error: "Errore",
    no_card_found: "Nessuna carta trovata",
    card_link_open_failed: "Impossibile aprire il link della carta",
    card_screen_not_connected: "La schermata Card non è ancora collegata",

    status_active: "Attiva",
    status_blocked: "Bloccata",
    status_pending: "In attesa",
    status_unknown: "Sconosciuto",

    no_card_linked_title: "Nessuna carta collegata",
    no_card_linked_text: "Per questo utente al momento non è stata trovata alcuna VIVE CARD.",
    check_again: "Controlla di nuovo",

    your_card: "La tua carta",
    public_id: "PUBLIC_ID",
    card_link: "Link della carta",
    open_card: "Apri carta",
    open_card_in_app: "Carta nell'app",

    basic_data: "Dati di base",
    edit: "Modifica",
    name: "Nome",
    dob: "Data di nascita",
    blood_group: "Gruppo sanguigno",

    critical_info: "Informazioni critiche",
    allergies: "Allergie",
    blood_thinner: "Anticoagulanti",
    medication: "Farmaci",

    more_info: "Ulteriori informazioni",
    vaccinations: "Vaccinazioni",
    chronic_conditions: "Malattie croniche",
    organ_donation: "Donazione di organi",
    notes: "Note / Indicazioni",

    emergency_contacts: "Contatti di emergenza",
    contact1_name: "Contatto 1 Nome",
    contact1_phone: "Contatto 1 Telefono",
    contact2_name: "Contatto 2 Nome",
    contact2_phone: "Contatto 2 Telefono",

    technical_data: "Dati tecnici",
    emergency_record: "Record di emergenza",
    record_exists: "Presente",
    record_missing: "Non ancora salvato",
    last_update: "Ultimo aggiornamento",

    fallback: "—",
  },

  fr: {
    loading: "Chargement du tableau de bord…",
    dashboard_title: "Tableau de bord",
    welcome: "Bienvenue",
    unknown_error: "Erreur inconnue",

    alert_note: "Information",
    alert_error: "Erreur",
    no_card_found: "Aucune carte trouvée",
    card_link_open_failed: "Le lien de la carte n’a pas pu être ouvert",
    card_screen_not_connected: "L’écran Card n’est pas encore connecté",

    status_active: "Active",
    status_blocked: "Bloquée",
    status_pending: "En attente",
    status_unknown: "Inconnu",

    no_card_linked_title: "Aucune carte liée",
    no_card_linked_text: "Aucune VIVE CARD n’a été trouvée actuellement pour cet utilisateur.",
    check_again: "Vérifier à nouveau",

    your_card: "Votre carte",
    public_id: "PUBLIC_ID",
    card_link: "Lien de la carte",
    open_card: "Ouvrir la carte",
    open_card_in_app: "Carte dans l’app",

    basic_data: "Données de base",
    edit: "Modifier",
    name: "Nom",
    dob: "Date de naissance",
    blood_group: "Groupe sanguin",

    critical_info: "Informations critiques",
    allergies: "Allergies",
    blood_thinner: "Anticoagulants",
    medication: "Médicaments",

    more_info: "Autres informations",
    vaccinations: "Vaccinations",
    chronic_conditions: "Maladies chroniques",
    organ_donation: "Don d’organes",
    notes: "Notes / Remarques",

    emergency_contacts: "Contacts d’urgence",
    contact1_name: "Contact 1 Nom",
    contact1_phone: "Contact 1 Téléphone",
    contact2_name: "Contact 2 Nom",
    contact2_phone: "Contact 2 Téléphone",

    technical_data: "Données techniques",
    emergency_record: "Dossier d’urgence",
    record_exists: "Disponible",
    record_missing: "Pas encore enregistré",
    last_update: "Dernière mise à jour",

    fallback: "—",
  },

  es: {
    loading: "Cargando panel…",
    dashboard_title: "Panel",
    welcome: "Bienvenido",
    unknown_error: "Error desconocido",

    alert_note: "Aviso",
    alert_error: "Error",
    no_card_found: "No se encontró ninguna tarjeta",
    card_link_open_failed: "No se pudo abrir el enlace de la tarjeta",
    card_screen_not_connected: "La pantalla Card aún no está conectada",

    status_active: "Activa",
    status_blocked: "Bloqueada",
    status_pending: "Pendiente",
    status_unknown: "Desconocido",

    no_card_linked_title: "No hay ninguna tarjeta vinculada",
    no_card_linked_text: "Actualmente no se encontró ninguna VIVE CARD para este usuario.",
    check_again: "Comprobar de nuevo",

    your_card: "Tu tarjeta",
    public_id: "PUBLIC_ID",
    card_link: "Enlace de la tarjeta",
    open_card: "Abrir tarjeta",
    open_card_in_app: "Tarjeta en la app",

    basic_data: "Datos básicos",
    edit: "Editar",
    name: "Nombre",
    dob: "Fecha de nacimiento",
    blood_group: "Grupo sanguíneo",

    critical_info: "Información crítica",
    allergies: "Alergias",
    blood_thinner: "Anticoagulantes",
    medication: "Medicamentos",

    more_info: "Más información",
    vaccinations: "Vacunas",
    chronic_conditions: "Enfermedades crónicas",
    organ_donation: "Donación de órganos",
    notes: "Notas / Indicaciones",

    emergency_contacts: "Contactos de emergencia",
    contact1_name: "Contacto 1 Nombre",
    contact1_phone: "Contacto 1 Teléfono",
    contact2_name: "Contacto 2 Nombre",
    contact2_phone: "Contacto 2 Teléfono",

    technical_data: "Datos técnicos",
    emergency_record: "Registro de emergencia",
    record_exists: "Disponible",
    record_missing: "Aún no guardado",
    last_update: "Última actualización",

    fallback: "—",
  },

  en: {
    loading: "Loading dashboard…",
    dashboard_title: "Dashboard",
    welcome: "Welcome",
    unknown_error: "Unknown error",

    alert_note: "Notice",
    alert_error: "Error",
    no_card_found: "No card found",
    card_link_open_failed: "Card link could not be opened",
    card_screen_not_connected: "Card screen is not connected yet",

    status_active: "Active",
    status_blocked: "Blocked",
    status_pending: "Pending",
    status_unknown: "Unknown",

    no_card_linked_title: "No card linked",
    no_card_linked_text: "No VIVE CARD has currently been found for this user.",
    check_again: "Check again",

    your_card: "Your card",
    public_id: "PUBLIC_ID",
    card_link: "Card link",
    open_card: "Open card",
    open_card_in_app: "Card in app",

    basic_data: "Basic data",
    edit: "Edit",
    name: "Name",
    dob: "Date of birth",
    blood_group: "Blood group",

    critical_info: "Critical information",
    allergies: "Allergies",
    blood_thinner: "Blood thinners",
    medication: "Medication",

    more_info: "More information",
    vaccinations: "Vaccinations",
    chronic_conditions: "Chronic conditions",
    organ_donation: "Organ donation",
    notes: "Notes / Remarks",

    emergency_contacts: "Emergency contacts",
    contact1_name: "Contact 1 Name",
    contact1_phone: "Contact 1 Phone",
    contact2_name: "Contact 2 Name",
    contact2_phone: "Contact 2 Phone",

    technical_data: "Technical data",
    emergency_record: "Emergency record",
    record_exists: "Available",
    record_missing: "Not saved yet",
    last_update: "Last update",

    fallback: "—",
  },
} as const;

function getStatusColor(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "#1e8a4a";
  if (value === "blocked") return "#b01818";
  if (value === "pending") return "#d39b22";

  return "#5b6472";
}

function fullCardUrl(publicId?: string | null) {
  if (!publicId) return "";
  return `https://www.vive-card.com/card?pid=${encodeURIComponent(publicId)}&edit=1`;
}


export default function DashboardScreen({ navigation }: any) {
  const [lang, setLang] = useState<keyof typeof I18N>("de");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function t(key: keyof typeof I18N.de) {
    return I18N[lang]?.[key] ?? I18N.de[key] ?? key;
  }
  function getStatusLabel(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return t("status_active");
  if (value === "blocked") return t("status_blocked");
  if (value === "pending") return t("status_pending");

  return t("status_unknown");
}

function lineValue(value?: string | null, fallback = t("fallback")) {
  const clean = String(value || "").trim();
  return clean || fallback;
}
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [formView, setFormView] = useState<ProfileFormValues | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    const result = await getCurrentUserCardProfile();

    setUserEmail(result.user?.email || "");
    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setFormView(mapEmergencyDataToForm(result.profile));
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || t("unknown_error"));
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setError(e?.message || t("unknown_error"));
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      loadData().catch(() => {});
    });

    return unsubscribe;
  }, [navigation, loadData]);

  useCardRealtime({
    publicId: card?.public_id || null,
    ownerUserId: userId,
    enabled: !loading,
    onChange: loadData,
  });

  const cardUrl = useMemo(() => fullCardUrl(card?.public_id), [card?.public_id]);

  const handleOpenCard = async () => {
    if (!card?.public_id) {
      Alert.alert(t("alert_note"), t("no_card_found"));
      return;
    }

    const supported = await Linking.canOpenURL(cardUrl);

    if (!supported) {
      Alert.alert(t("alert_error"), t("card_link_open_failed"));
      return;
    }

    await Linking.openURL(cardUrl);
  };

  const handleEditProfile = () => {
    if (!card?.public_id) {
      Alert.alert(t("alert_note"), t("no_card_found"));
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate("Card");
      return;
    }

   Alert.alert(t("alert_note"), t("card_screen_not_connected"));
  };

  const handleOpenCardTab = () => {
    if (navigation?.navigate) {
      navigation.navigate("Card");
      return;
    }

    Alert.alert(t("alert_note"), t("card_screen_not_connected"));
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>{t("dashboard_title")}</Text>
<Text style={styles.subtitle}>
  {t("welcome")}{userEmail ? `, ${userEmail}` : ""}
</Text>
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!card ? (
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>{t("no_card_linked_title")}</Text>
<Text style={styles.sectionText}>
  {t("no_card_linked_text")}
</Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
            <Text style={styles.secondaryButtonText}>{t("check_again")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cardBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t("your_card")}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(card.status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusLabel(card.status)}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("public_id")}</Text>
              <Text style={styles.valueMono}>{lineValue(card.public_id)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("card_link")}</Text>
              <Text style={styles.valueSmall}>{lineValue(cardUrl)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleOpenCard}
              >
                <Text style={styles.primaryButtonText}>{t("open_card")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenCardTab}
              >
                <Text style={styles.secondaryButtonText}>{t("open_card_in_app")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t("basic_data")}</Text>

              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={styles.linkText}>{t("edit")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("name")}</Text>
              <Text style={styles.value}>{lineValue(formView?.name)}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("dob")}</Text>
                <Text style={styles.value}>{lineValue(formView?.dob)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("blood_group")}</Text>
                <Text style={styles.value}>{lineValue(formView?.blood)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>{t("critical_info")}</Text>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("allergies")}</Text>
              <Text style={styles.value}>{lineValue(formView?.allergies)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("blood_thinner")}</Text>
              <Text style={styles.value}>
                {lineValue(formView?.bloodThinner)}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("medication")}</Text>
              <Text style={styles.value}>{lineValue(formView?.meds)}</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>{t("more_info")}</Text>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("vaccinations")}</Text>
              <Text style={styles.value}>{lineValue(formView?.vaccines)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("chronic_conditions")}</Text>
              <Text style={styles.value}>{lineValue(formView?.chronic)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("organ_donation")}</Text>
              <Text style={styles.value}>{lineValue(formView?.organ)}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("notes")}</Text>
              <Text style={styles.value}>{lineValue(formView?.notes)}</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>{t("emergency_contacts")}</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("contact1_name")}</Text>
                <Text style={styles.value}>{lineValue(formView?.em1_name)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("contact1_phone")}</Text>
                <Text style={styles.value}>{lineValue(formView?.em1)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("contact2_name")}</Text>
                <Text style={styles.value}>{lineValue(formView?.em2_name)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.label}>{t("contact2_phone")}</Text>
                <Text style={styles.value}>{lineValue(formView?.em2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBox}>
            <Text style={styles.sectionTitle}>{t("technical_data")}</Text>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("emergency_record")}</Text>
              <Text style={styles.value}>
                {profile?.updated_at ? t("record_exists") : t("record_missing")}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>{t("last_update")}</Text>
              <Text style={styles.value}>
                {lineValue(
                  profile?.updated_at
                    ? new Date(profile.updated_at).toLocaleString()
                    : ""
                )}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#06080d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#aeb6c4",
    fontSize: 15,
  },
  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: {
    color: "#98a2b3",
    fontSize: 18,
    marginTop: 4,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.35)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: "#ff9f9f",
    fontSize: 14,
    lineHeight: 20,
  },
  cardBox: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  sectionText: {
    color: "#aeb6c4",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  infoBlock: {
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  infoCol: {
    flex: 1,
    marginBottom: 10,
  },
  label: {
    color: "#8f98a8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 22,
  },
  valueSmall: {
    color: "#d7dce5",
    fontSize: 14,
    lineHeight: 20,
  },
  valueMono: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#e10600",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexGrow: 1,
    minWidth: 150,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#1a2232",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexGrow: 1,
    minWidth: 150,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "700",
  },
});
