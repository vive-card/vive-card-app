import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "../lib/supabase";
import type { CardRow, EmergencyCardRow, ProfileFormValues } from "../types";
import {
  getCurrentUserCardProfile,
  initialProfileForm,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
} from "../services/profileService";
import type { MedicalDocumentViewRow } from "../services/medicalDocumentsService";
import {
  deleteMedicalDocument,
  getSignedDocumentUrl,
  loadMedicalDocuments,
  uploadMedicalDocument,
} from "../services/medicalDocumentsService";
import { useCardRealtime } from "../hooks/useCardRealtime";
import { getDocumentEmoji, isImageMime } from "../utils/medicalDocuments";
import { formatFileSize, lineValue, normalizeTel } from "../utils/formatters";

type LangKey = "de" | "it" | "fr" | "es" | "en";
type StatusKind = "" | "ok" | "warn" | "err";

const LANG_OPTIONS: LangKey[] = ["de", "it", "fr", "es", "en"];

const BLOOD_OPTIONS = [
  "",
  "0 negative",
  "0 positive",
  "A negative",
  "A positive",
  "B negative",
  "B positive",
  "AB negative",
  "AB positive",
];

const I18N: Record<LangKey, Record<string, string>> = {
  de: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 NOTFALL",
    btn_check: "🟡 PRÜFEN",
    btn_logout: "↩︎ Abmelden",
    title: "Notfallinformation",
    subtitle: "Alle relevanten medizinischen Daten auf einem Blick.",
    profile_id: "PROFIL-ID",
    required: "Pflicht",
    prio1: "Priorität 1",
    critical_title: "⚠️ Kritische medizinische Information",
    info_title: "ℹ️ Weitere medizinische Informationen",
    contacts_title: "📞 Notfallkontakte",
    docs_title: "📄 Medizinische Dokumente",
    disclaimer:
      "⚠️ Diese Informationen wurden vom Karteninhaber selbst erfasst. Keine Garantie auf Vollständigkeit oder Aktualität.",
    name: "👤 Name",
    dob: "🎂 Geburtsdatum",
    blood: "🩸 Blutgruppe",
    allergies: "🧪 Allergien",
    thinner: "💊 Blutverdünner",
    meds: "💉 Medikamente",
    vaccines: "✅ Impfungen",
    chronic: "🫀 Chronische Erkrankungen",
    organ: "🎗 Organspende",
    notes: "📝 Notizen / Hinweise",
    ec1: "Notfallkontakt 1",
    ec2: "Notfallkontakt 2",
    call: "Anrufen",
    edit: "Bearbeiten",
    edit_active: "Bearbeitung aktiv",
    save: "Speichern",
    clear: "Alles löschen",
    last_update: "Letztes Update:",
    status_ready: "Bereit.",
    status_loading: "Lade…",
    status_saved: "Gespeichert.",
    status_cleared: "Geleert.",
    status_uploading: "Dokument wird hochgeladen…",
    status_docs_loaded: "Dokumente geladen.",
    status_docs_empty: "Noch keine Dokumente hochgeladen.",
    status_blocked: "Diese VIVE CARD wurde gesperrt oder deaktiviert.",
    status_error: "Ein Fehler ist aufgetreten.",
    need_login: "Du musst eingeloggt sein um diese Karte zu bearbeiten.",
    readonly: "Diese Karte wird im öffentlichen Notfallmodus angezeigt.",
    camera: "📸 Foto aufnehmen",
    upload: "📂 Datei hochladen",
    open: "Öffnen",
    remove: "Entfernen",
    image: "Bild",
    file: "Dokument / PDF",
    docs_empty: "Noch keine Dokumente hochgeladen.",
    docs_notice_single:
      "Achtung: Es ist 1 zusätzliches medizinisches Dokument vorhanden.",
    docs_notice_multi:
      "Achtung: Es sind {count} zusätzliche medizinische Dokumente vorhanden.",
    emergency_mode_title: "NOTFALL-MODUS",
    emergency_mode_sub: "Nur kritische Daten – für Einsatzkräfte",
    close: "✕ Schließen",
    call112: "📞 Notruf 112",
    call144: "🚑 Sanität 144",
    docs_overlay_title: "📄 Wichtige Dokumente",
    emergency_hint:
      "Tipp: 112 funktioniert europaweit. In der Schweiz ist 144 der medizinische Rettungsdienst.",
    confirm_clear: "Wirklich alle Felder löschen?",
    no_card_title: "Keine Karte gefunden",
    no_card_text:
      "Für diesen Account wurde aktuell keine VIVE CARD gefunden.",
    select_blood: "Blutgruppe auswählen",
    cancel: "Abbrechen",
    critical_chip: "kritisch",
    important_chip: "wichtig",
    ok_chip: "ok",
    camera_permission_title: "Kamera",
    camera_permission_text: "Bitte Kamera-Zugriff erlauben.",
  },
  it: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENZA",
    btn_check: "🟡 VERIFICA",
    btn_logout: "↩︎ Esci",
    title: "Informazioni d’emergenza",
    subtitle: "Tutti i dati medici rilevanti in un colpo d’occhio.",
    profile_id: "ID PROFILO",
    required: "Obbligo",
    prio1: "Priorità 1",
    critical_title: "⚠️ Informazioni mediche critiche",
    info_title: "ℹ️ Altre informazioni mediche",
    contacts_title: "📞 Contatti d’emergenza",
    docs_title: "📄 Documenti medici",
    disclaimer:
      "⚠️ Queste informazioni sono state inserite dal titolare della carta. Nessuna garanzia di completezza o attualità.",
    name: "👤 Nome",
    dob: "🎂 Data di nascita",
    blood: "🩸 Gruppo sanguigno",
    allergies: "🧪 Allergie",
    thinner: "💊 Anticoagulanti",
    meds: "💉 Farmaci",
    vaccines: "✅ Vaccini",
    chronic: "🫀 Malattie croniche",
    organ: "🎗 Donazione organi",
    notes: "📝 Note / indicazioni",
    ec1: "Contatto d’emergenza 1",
    ec2: "Contatto d’emergenza 2",
    call: "Chiama",
    edit: "Modifica",
    edit_active: "Modifica attiva",
    save: "Salva",
    clear: "Cancella tutto",
    last_update: "Ultimo aggiornamento:",
    status_ready: "Pronto.",
    status_loading: "Caricamento…",
    status_saved: "Salvato.",
    status_cleared: "Cancellato.",
    status_uploading: "Caricamento documento…",
    status_docs_loaded: "Documenti caricati.",
    status_docs_empty: "Nessun documento caricato.",
    status_blocked: "Questa VIVE CARD è stata bloccata o disattivata.",
    status_error: "Si è verificato un errore.",
    need_login: "Devi essere loggato per modificare questa carta.",
    readonly: "Questa carta è mostrata in modalità emergenza pubblica.",
    camera: "📸 Scatta foto",
    upload: "📂 Carica file",
    open: "Apri",
    remove: "Rimuovi",
    image: "Immagine",
    file: "Documento / PDF",
    docs_empty: "Nessun documento caricato.",
    docs_notice_single:
      "Attenzione: è presente 1 documento medico aggiuntivo.",
    docs_notice_multi:
      "Attenzione: sono presenti {count} documenti medici aggiuntivi.",
    emergency_mode_title: "MODALITÀ EMERGENZA",
    emergency_mode_sub: "Solo dati critici – per i soccorritori",
    close: "✕ Chiudi",
    call112: "📞 Emergenza 112",
    call144: "🚑 Ambulanza 144",
    docs_overlay_title: "📄 Documenti importanti",
    emergency_hint:
      "Suggerimento: 112 funziona in tutta Europa. In Svizzera il 144 è il soccorso sanitario.",
    confirm_clear: "Vuoi davvero cancellare tutti i campi?",
    no_card_title: "Nessuna carta trovata",
    no_card_text: "Per questo account non è stata trovata nessuna VIVE CARD.",
    select_blood: "Seleziona gruppo sanguigno",
    cancel: "Annulla",
    critical_chip: "critico",
    important_chip: "importante",
    ok_chip: "ok",
    camera_permission_title: "Fotocamera",
    camera_permission_text: "Consenti l’accesso alla fotocamera.",
  },
  fr: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 URGENCE",
    btn_check: "🟡 VÉRIFIER",
    btn_logout: "↩︎ Déconnexion",
    title: "Informations d’urgence",
    subtitle: "Toutes les données médicales pertinentes en un coup d’œil.",
    profile_id: "ID PROFIL",
    required: "Obligatoire",
    prio1: "Priorité 1",
    critical_title: "⚠️ Informations médicales critiques",
    info_title: "ℹ️ Autres informations médicales",
    contacts_title: "📞 Contacts d’urgence",
    docs_title: "📄 Documents médicaux",
    disclaimer:
      "⚠️ Ces informations ont été saisies par le titulaire de la carte. Aucune garantie d’exhaustivité ou d’actualité.",
    name: "👤 Nom",
    dob: "🎂 Date de naissance",
    blood: "🩸 Groupe sanguin",
    allergies: "🧪 Allergies",
    thinner: "💊 Anticoagulants",
    meds: "💉 Médicaments",
    vaccines: "✅ Vaccins",
    chronic: "🫀 Maladies chroniques",
    organ: "🎗 Don d’organes",
    notes: "📝 Notes / indications",
    ec1: "Contact d’urgence 1",
    ec2: "Contact d’urgence 2",
    call: "Appeler",
    edit: "Modifier",
    edit_active: "Modification active",
    save: "Enregistrer",
    clear: "Tout supprimer",
    last_update: "Dernière mise à jour :",
    status_ready: "Prêt.",
    status_loading: "Chargement…",
    status_saved: "Enregistré.",
    status_cleared: "Supprimé.",
    status_uploading: "Téléchargement du document…",
    status_docs_loaded: "Documents chargés.",
    status_docs_empty: "Aucun document téléchargé.",
    status_blocked: "Cette VIVE CARD a été bloquée ou désactivée.",
    status_error: "Une erreur est survenue.",
    need_login: "Vous devez être connecté pour modifier cette carte.",
    readonly: "Cette carte est affichée en mode urgence public.",
    camera: "📸 Prendre photo",
    upload: "📂 Téléverser fichier",
    open: "Ouvrir",
    remove: "Supprimer",
    image: "Image",
    file: "Document / PDF",
    docs_empty: "Aucun document téléchargé.",
    docs_notice_single:
      "Attention : 1 document médical supplémentaire est disponible.",
    docs_notice_multi:
      "Attention : {count} documents médicaux supplémentaires sont disponibles.",
    emergency_mode_title: "MODE URGENCE",
    emergency_mode_sub: "Données critiques uniquement – pour les secours",
    close: "✕ Fermer",
    call112: "📞 Urgence 112",
    call144: "🚑 Ambulance 144",
    docs_overlay_title: "📄 Documents importants",
    emergency_hint:
      "Astuce : 112 fonctionne dans toute l’Europe. En Suisse, le 144 est le service médical d’urgence.",
    confirm_clear: "Voulez-vous vraiment tout supprimer ?",
    no_card_title: "Aucune carte trouvée",
    no_card_text: "Aucune VIVE CARD n’a été trouvée pour ce compte.",
    select_blood: "Choisir le groupe sanguin",
    cancel: "Annuler",
    critical_chip: "critique",
    important_chip: "important",
    ok_chip: "ok",
    camera_permission_title: "Caméra",
    camera_permission_text: "Veuillez autoriser l’accès à la caméra.",
  },
  es: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENCIA",
    btn_check: "🟡 COMPROBAR",
    btn_logout: "↩︎ Cerrar sesión",
    title: "Información de emergencia",
    subtitle: "Todos los datos médicos relevantes de un vistazo.",
    profile_id: "ID DE PERFIL",
    required: "Obligatorio",
    prio1: "Prioridad 1",
    critical_title: "⚠️ Información médica crítica",
    info_title: "ℹ️ Más información médica",
    contacts_title: "📞 Contactos de emergencia",
    docs_title: "📄 Documentos médicos",
    disclaimer:
      "⚠️ Esta información fue introducida por el titular de la tarjeta. No se garantiza su integridad o actualidad.",
    name: "👤 Nombre",
    dob: "🎂 Fecha de nacimiento",
    blood: "🩸 Grupo sanguíneo",
    allergies: "🧪 Alergias",
    thinner: "💊 Anticoagulantes",
    meds: "💉 Medicamentos",
    vaccines: "✅ Vacunas",
    chronic: "🫀 Enfermedades crónicas",
    organ: "🎗 Donación de órganos",
    notes: "📝 Notas / indicaciones",
    ec1: "Contacto de emergencia 1",
    ec2: "Contacto de emergencia 2",
    call: "Llamar",
    edit: "Editar",
    edit_active: "Edición activa",
    save: "Guardar",
    clear: "Borrar todo",
    last_update: "Última actualización:",
    status_ready: "Listo.",
    status_loading: "Cargando…",
    status_saved: "Guardado.",
    status_cleared: "Borrado.",
    status_uploading: "Subiendo documento…",
    status_docs_loaded: "Documentos cargados.",
    status_docs_empty: "No hay documentos subidos.",
    status_blocked: "Esta VIVE CARD ha sido bloqueada o desactivada.",
    status_error: "Se produjo un error.",
    need_login: "Debes iniciar sesión para editar esta tarjeta.",
    readonly: "Esta tarjeta se muestra en modo público de emergencia.",
    camera: "📸 Tomar foto",
    upload: "📂 Subir archivo",
    open: "Abrir",
    remove: "Eliminar",
    image: "Imagen",
    file: "Documento / PDF",
    docs_empty: "No hay documentos subidos.",
    docs_notice_single:
      "Atención: hay 1 documento médico adicional disponible.",
    docs_notice_multi:
      "Atención: hay {count} documentos médicos adicionales disponibles.",
    emergency_mode_title: "MODO EMERGENCIA",
    emergency_mode_sub: "Solo datos críticos – para emergencias",
    close: "✕ Cerrar",
    call112: "📞 Emergencia 112",
    call144: "🚑 Ambulancia 144",
    docs_overlay_title: "📄 Documentos importantes",
    emergency_hint:
      "Consejo: el 112 funciona en toda Europa. En Suiza, el 144 es el servicio médico de urgencias.",
    confirm_clear: "¿Seguro que quieres borrar todos los campos?",
    no_card_title: "No se encontró ninguna tarjeta",
    no_card_text:
      "Actualmente no se encontró ninguna VIVE CARD para esta cuenta.",
    select_blood: "Seleccionar grupo sanguíneo",
    cancel: "Cancelar",
    critical_chip: "crítico",
    important_chip: "importante",
    ok_chip: "ok",
    camera_permission_title: "Cámara",
    camera_permission_text: "Permite el acceso a la cámara.",
  },
  en: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENCY",
    btn_check: "🟡 CHECK",
    btn_logout: "↩︎ Logout",
    title: "Emergency information",
    subtitle: "All relevant medical data at a glance.",
    profile_id: "PROFILE ID",
    required: "Required",
    prio1: "Priority 1",
    critical_title: "⚠️ Critical medical information",
    info_title: "ℹ️ Further medical information",
    contacts_title: "📞 Emergency contacts",
    docs_title: "📄 Medical documents",
    disclaimer:
      "⚠️ This information was entered by the card holder. No guarantee of completeness or freshness.",
    name: "👤 Name",
    dob: "🎂 Date of birth",
    blood: "🩸 Blood group",
    allergies: "🧪 Allergies",
    thinner: "💊 Blood thinners",
    meds: "💉 Medications",
    vaccines: "✅ Vaccines",
    chronic: "🫀 Chronic conditions",
    organ: "🎗 Organ donation",
    notes: "📝 Notes / hints",
    ec1: "Emergency contact 1",
    ec2: "Emergency contact 2",
    call: "Call",
    edit: "Edit",
    edit_active: "Editing active",
    save: "Save",
    clear: "Clear all",
    last_update: "Last update:",
    status_ready: "Ready.",
    status_loading: "Loading…",
    status_saved: "Saved.",
    status_cleared: "Cleared.",
    status_uploading: "Uploading document…",
    status_docs_loaded: "Documents loaded.",
    status_docs_empty: "No documents uploaded yet.",
    status_blocked: "This VIVE CARD has been blocked or deactivated.",
    status_error: "An error occurred.",
    need_login: "You must be logged in to edit this card.",
    readonly: "This card is shown in public emergency mode.",
    camera: "📸 Take photo",
    upload: "📂 Upload file",
    open: "Open",
    remove: "Remove",
    image: "Image",
    file: "Document / PDF",
    docs_empty: "No documents uploaded yet.",
    docs_notice_single:
      "Attention: 1 additional medical document is available.",
    docs_notice_multi:
      "Attention: {count} additional medical documents are available.",
    emergency_mode_title: "EMERGENCY MODE",
    emergency_mode_sub: "Critical data only – for responders",
    close: "✕ Close",
    call112: "📞 Emergency 112",
    call144: "🚑 Medical 144",
    docs_overlay_title: "📄 Important documents",
    emergency_hint:
      "Tip: 112 works across Europe. In Switzerland, 144 is the medical emergency service.",
    confirm_clear: "Do you really want to clear all fields?",
    no_card_title: "No card found",
    no_card_text:
      "No VIVE CARD was currently found for this account.",
    select_blood: "Select blood group",
    cancel: "Cancel",
    critical_chip: "critical",
    important_chip: "important",
    ok_chip: "ok",
    camera_permission_title: "Camera",
    camera_permission_text: "Please allow camera access.",
  },
};

export default function CardScreen({ navigation }: any) {
  const [lang, setLang] = useState<LangKey>("de");
  const t = useCallback(
    (key: string) => I18N[lang]?.[key] || I18N.en[key] || key,
    [lang]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  const [editable, setEditable] = useState(false);
  const [bloodPickerVisible, setBloodPickerVisible] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  const [statusText, setStatusText] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("");

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [form, setForm] = useState<ProfileFormValues>(initialProfileForm);
  const [documents, setDocuments] = useState<MedicalDocumentViewRow[]>([]);

  const setStatus = useCallback((text: string, kind: StatusKind = "") => {
    setStatusText(text);
    setStatusKind(kind);
  }, []);

  const setField = useCallback((key: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const checkCardBlocked = useCallback(async (publicId?: string | null) => {
    if (!publicId) return false;

    const { data, error } = await supabase
      .from("cards")
      .select("id, public_id, status, blocked_at")
      .eq("public_id", publicId)
      .maybeSingle();

    if (error) {
      throw new Error("Kartenstatus konnte nicht geprüft werden: " + error.message);
    }

    return String(data?.status || "") === "blocked" || !!data?.blocked_at;
  }, []);

  const loadDocuments = useCallback(
    async (publicId?: string | null) => {
      if (!publicId) {
        setDocuments([]);
        return;
      }

      try {
        setDocsLoading(true);
        const docs = await loadMedicalDocuments(publicId);
        setDocuments(docs);
      } catch (e: any) {
        setStatus(e?.message || t("status_error"), "err");
      } finally {
        setDocsLoading(false);
      }
    },
    [setStatus, t]
  );

  const loadData = useCallback(async () => {
    const result = await getCurrentUserCardProfile();

    setUserId(result.user?.id || null);
    setCard(result.card || null);
    setProfile(result.profile || null);
    setForm(mapEmergencyDataToForm(result.profile));

    if (!result.card?.public_id) {
      setDocuments([]);
      return;
    }

    const blocked = await checkCardBlocked(result.card.public_id);

    if (blocked) {
      setEditable(false);
      setStatus(t("status_blocked"), "err");
    } else {
      setStatus(t("status_ready"), "");
    }

    await loadDocuments(result.card.public_id);
  }, [checkCardBlocked, loadDocuments, setStatus, t]);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      setStatus(t("status_loading"), "");
      await loadData();
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    } finally {
      setLoading(false);
    }
  }, [loadData, setStatus, t]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    } finally {
      setRefreshing(false);
    }
  }, [loadData, setStatus, t]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  useCardRealtime({
    publicId: card?.public_id || null,
    ownerUserId: userId,
    enabled: !loading,
    onChange: loadData,
  });

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [documents]);

  const docsNotice = useMemo(() => {
    return sortedDocuments.length === 1
      ? t("docs_notice_single")
      : t("docs_notice_multi").replace("{count}", String(sortedDocuments.length));
  }, [sortedDocuments.length, t]);

  const toggleEdit = async () => {
    if (!card?.public_id) return;

    try {
      const blocked = await checkCardBlocked(card.public_id);

      if (blocked) {
        setEditable(false);
        setStatus(t("status_blocked"), "err");
        return;
      }

      const next = !editable;
      setEditable(next);
      setStatus(next ? t("edit_active") : t("status_ready"), next ? "warn" : "");
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    }
  };

  const saveProfile = async () => {
    try {
      if (!card || !userId) return;

      const blocked = await checkCardBlocked(card.public_id);
      if (blocked) {
        setEditable(false);
        setStatus(t("status_blocked"), "err");
        return;
      }

      setSaving(true);
      await saveCurrentUserCardProfile(card, userId, form);
      setEditable(false);
      await loadData();
      setStatus(t("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    Alert.alert(t("clear"), t("confirm_clear"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clear"),
        style: "destructive",
        onPress: async () => {
          try {
            if (!card || !userId) return;

            const blocked = await checkCardBlocked(card.public_id);
            if (blocked) {
              setEditable(false);
              setStatus(t("status_blocked"), "err");
              return;
            }

            setSaving(true);
            await saveCurrentUserCardProfile(card, userId, initialProfileForm);
            setForm(initialProfileForm);
            setEditable(false);
            await loadData();
            setStatus(t("status_cleared"), "ok");
          } catch (e: any) {
            setStatus(e?.message || t("status_error"), "err");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
  };

  const openDocument = async (doc: MedicalDocumentViewRow) => {
    try {
      const url = await getSignedDocumentUrl(doc.file_path);

      navigation?.navigate?.("DocumentViewer", {
        url,
        fileName: doc.file_name || "Dokument",
        mimeType: doc.mime_type || "",
      });
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    }
  };

  const removeDocument = async (doc: MedicalDocumentViewRow) => {
    Alert.alert(t("remove"), `${doc.file_name || "Dokument"}?`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedicalDocument(doc.id, doc.file_path);
            await loadDocuments(card?.public_id || null);
          } catch (e: any) {
            setStatus(e?.message || t("status_error"), "err");
          }
        },
      },
    ]);
  };

  const handlePickDocument = async () => {
    try {
      if (!editable || !card?.public_id || !userId) {
        setStatus(t("need_login"), "warn");
        return;
      }

      setUploading(true);
      setStatus(t("status_uploading"), "warn");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      await uploadMedicalDocument({
        uri: asset.uri,
        fileName: asset.name || "Dokument",
        mimeType: asset.mimeType || "application/octet-stream",
        fileSize: asset.size || null,
        userId,
        publicId: card.public_id,
      });

      await loadDocuments(card.public_id);
      setStatus(t("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!editable || !card?.public_id || !userId) {
        setStatus(t("need_login"), "warn");
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("camera_permission_title"), t("camera_permission_text"));
        return;
      }

      setUploading(true);
      setStatus(t("status_uploading"), "warn");

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      await uploadMedicalDocument({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize || null,
        userId,
        publicId: card.public_id,
      });

      await loadDocuments(card.public_id);
      setStatus(t("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || t("status_error"), "err");
    } finally {
      setUploading(false);
    }
  };

  const handleCheck = () => {
    const missing: string[] = [];

    if (!String(form.name || "").trim()) missing.push(t("name"));
    if (!String(form.dob || "").trim()) missing.push(t("dob"));
    if (!String(form.blood || "").trim()) missing.push(t("blood"));

    if (missing.length === 0) {
      Alert.alert(t("btn_check"), "OK");
      return;
    }

    Alert.alert(t("btn_check"), `Fehlend:\n${missing.join("\n")}`);
  };

  const callNumber = async (number?: string | null) => {
    const clean = normalizeTel(number);
    if (!clean) return;

    const url = `tel:${clean}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#e10600" />
        <Text style={styles.loadingText}>{t("status_loading")}</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>{t("no_card_title")}</Text>
        <Text style={styles.emptyText}>{t("no_card_text")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />

      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={styles.brandRow}>
            <View style={styles.dot} />
            <Text style={styles.brandText}>{t("brand")}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsRow}
          >
            {LANG_OPTIONS.map((item) => {
              const active = item === lang;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.langChip, active && styles.langChipActive]}
                  onPress={() => setLang(item)}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      active && styles.langChipTextActive,
                    ]}
                  >
                    {item.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnDanger]}
              onPress={() => setEmergencyVisible(true)}
            >
              <Text style={styles.headerBtnDangerText}>{t("btn_emergency")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnSoft]}
              onPress={handleCheck}
            >
              <Text style={styles.headerBtnSoftText}>{t("btn_check")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnWhite]}
              onPress={logout}
            >
              <Text style={styles.headerBtnWhiteText}>{t("btn_logout")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!editable && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{t("readonly")}</Text>
          </View>
        )}

        <View style={styles.cardBox}>
          <View style={styles.headline}>
            <View style={styles.headlineLeft}>
              <Text style={styles.title}>{t("title")}</Text>
              <Text style={styles.subtitle}>{t("subtitle")}</Text>
            </View>

            <View style={styles.pidBox}>
              <Text style={styles.pidLabel}>{t("profile_id")}</Text>
              <Text style={styles.pidValue}>{card.public_id}</Text>
            </View>
          </View>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{t("disclaimer")}</Text>
          </View>

          <SectionTitle title={t("critical_title")} />

          <View style={styles.formRow}>
            <FieldBox half>
              <FieldLabel title={t("name")} chip={t("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.name}
                onChangeText={(value) => setField("name", value)}
                editable={editable}
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>

            <FieldBox half>
              <FieldLabel title={t("dob")} chip={t("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.dob}
                onChangeText={(value) => setField("dob", value)}
                editable={editable}
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>
          </View>

          <FieldBox variant="warn">
            <FieldLabel title={t("blood")} chip={t("prio1")} chipVariant="warn" />
            <TouchableOpacity
              activeOpacity={editable ? 0.8 : 1}
              onPress={() => editable && setBloodPickerVisible(true)}
              style={[styles.selectLike, !editable && styles.inputDisabled]}
            >
              <Text style={styles.selectLikeText}>{lineValue(form.blood)}</Text>
            </TouchableOpacity>
          </FieldBox>

          <View style={styles.formRow}>
            <FieldBox half variant="crit">
              <FieldLabel
                title={t("allergies")}
                chip={t("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.allergies}
                onChangeText={(value) => setField("allergies", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>

            <FieldBox half variant="crit">
              <FieldLabel
                title={t("thinner")}
                chip={t("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.bloodThinner}
                onChangeText={(value) => setField("bloodThinner", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>
          </View>

          <View style={styles.formRow}>
            <FieldBox half variant="warn">
              <FieldLabel
                title={t("meds")}
                chip={t("important_chip")}
                chipVariant="warn"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.meds}
                onChangeText={(value) => setField("meds", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>

            <FieldBox half variant="ok">
              <FieldLabel
                title={t("vaccines")}
                chip={t("ok_chip")}
                chipVariant="ok"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.vaccines}
                onChangeText={(value) => setField("vaccines", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>
          </View>

          <SectionTitle title={t("info_title")} />

          <View style={styles.formRow}>
            <FieldBox half>
              <FieldLabel title={t("chronic")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.chronic}
                onChangeText={(value) => setField("chronic", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>

            <FieldBox half>
              <FieldLabel title={t("organ")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.organ}
                onChangeText={(value) => setField("organ", value)}
                editable={editable}
                multiline
                placeholderTextColor="#95a0b0"
              />
            </FieldBox>
          </View>

          <FieldBox>
            <FieldLabel title={t("notes")} />
            <TextInput
              style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
              value={form.notes}
              onChangeText={(value) => setField("notes", value)}
              editable={editable}
              multiline
              placeholderTextColor="#95a0b0"
            />
          </FieldBox>

          <SectionTitle title={t("contacts_title")} />

          <FieldBox>
            <FieldLabel title={t("ec1")} />
            <TextInput
              style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
              value={form.em1_name}
              onChangeText={(value) => setField("em1_name", value)}
              editable={editable}
              placeholderTextColor="#95a0b0"
            />
            <TextInput
              style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
              value={form.em1}
              onChangeText={(value) => setField("em1", value)}
              editable={editable}
              keyboardType="phone-pad"
              placeholderTextColor="#95a0b0"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={() => callNumber(form.em1)}>
              <Text style={styles.secondaryButtonText}>{t("call")}</Text>
            </TouchableOpacity>
          </FieldBox>

          <FieldBox>
            <FieldLabel title={t("ec2")} />
            <TextInput
              style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
              value={form.em2_name}
              onChangeText={(value) => setField("em2_name", value)}
              editable={editable}
              placeholderTextColor="#95a0b0"
            />
            <TextInput
              style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
              value={form.em2}
              onChangeText={(value) => setField("em2", value)}
              editable={editable}
              keyboardType="phone-pad"
              placeholderTextColor="#95a0b0"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={() => callNumber(form.em2)}>
              <Text style={styles.secondaryButtonText}>{t("call")}</Text>
            </TouchableOpacity>
          </FieldBox>

          <SectionTitle title={t("docs_title")} />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, (!editable || uploading) && styles.buttonDisabled]}
              onPress={handleTakePhoto}
              disabled={!editable || uploading}
            >
              <Text style={styles.primaryButtonText}>{t("camera")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButtonWide, (!editable || uploading) && styles.buttonDisabled]}
              onPress={handlePickDocument}
              disabled={!editable || uploading}
            >
              <Text style={styles.secondaryButtonText}>{t("upload")}</Text>
            </TouchableOpacity>
          </View>

          {docsLoading ? (
            <View style={styles.docsLoading}>
              <ActivityIndicator size="small" color="#e10600" />
            </View>
          ) : sortedDocuments.length === 0 ? (
            <View style={styles.emptyDocsBox}>
              <Text style={styles.emptyDocsText}>{t("docs_empty")}</Text>
            </View>
          ) : (
            sortedDocuments.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docRow}>
                  <TouchableOpacity style={styles.docThumb} onPress={() => openDocument(doc)}>
                    {isImageMime(doc.mime_type) && doc.preview_url ? (
                      <Image
                        source={{ uri: doc.preview_url }}
                        style={styles.docThumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.docThumbFallback}>
                        <Text style={styles.docThumbFallbackText}>{getDocumentEmoji(doc)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.docMeta}>
                    <Text style={styles.docName} numberOfLines={2}>
                      {doc.file_name || t("file")}
                    </Text>
                    <Text style={styles.docInfo}>
                      {isImageMime(doc.mime_type) ? t("image") : t("file")}
                      {doc.file_size ? ` • ${formatFileSize(doc.file_size)}` : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.docButtonRow}>
                  <TouchableOpacity style={styles.secondaryButtonWide} onPress={() => openDocument(doc)}>
                    <Text style={styles.secondaryButtonText}>{t("open")}</Text>
                  </TouchableOpacity>

                  {editable && (
                    <TouchableOpacity
                      style={styles.dangerButton}
                      onPress={() => removeDocument(doc)}
                    >
                      <Text style={styles.dangerButtonText}>{t("remove")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={styles.footerArea}>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButtonWide} onPress={toggleEdit}>
                <Text style={styles.secondaryButtonText}>
                  {editable ? t("edit_active") : t("edit")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, (!editable || saving) && styles.buttonDisabled]}
                onPress={saveProfile}
                disabled={!editable || saving}
              >
                <Text style={styles.primaryButtonText}>{saving ? "..." : t("save")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerButton, (!editable || saving) && styles.buttonDisabled]}
                onPress={clearAll}
                disabled={!editable || saving}
              >
                <Text style={styles.dangerButtonText}>{t("clear")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.statusMeta}>
                {t("last_update")}{" "}
                <Text style={styles.statusMetaStrong}>
                  {profile?.updated_at
                    ? new Date(profile.updated_at).toLocaleString()
                    : "—"}
                </Text>
              </Text>

              <Text
                style={[
                  styles.statusText,
                  statusKind === "ok" && styles.statusOk,
                  statusKind === "warn" && styles.statusWarn,
                  statusKind === "err" && styles.statusErr,
                ]}
              >
                {statusText || t("status_ready")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={bloodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBloodPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("select_blood")}</Text>

            <ScrollView style={styles.modalOptionsWrap}>
              {BLOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option || "empty"}
                  style={styles.modalOption}
                  onPress={() => {
                    setField("blood", option);
                    setBloodPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option || "—"}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.secondaryButtonWide}
              onPress={() => setBloodPickerVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={emergencyVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setEmergencyVisible(false)}
      >
        <SafeAreaView style={styles.emergencyScreen}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyHeaderLeft}>
              <Text style={styles.emergencyTitle}>🆘 {t("emergency_mode_title")}</Text>
              <Text style={styles.emergencySubtitle}>{t("emergency_mode_sub")}</Text>
            </View>

            <View style={styles.emergencyHeaderRight}>
              <Text style={styles.emergencyPidLabel}>{t("profile_id")}</Text>
              <Text style={styles.emergencyPidValue}>{card.public_id}</Text>
              <Text style={[styles.emergencyPidLabel, styles.emergencyPidLabelSpacing]}>
                {t("last_update")}
              </Text>
              <Text style={styles.emergencyPidValue}>
                {profile?.updated_at
                  ? new Date(profile.updated_at).toLocaleString()
                  : "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButtonWide}
            onPress={() => setEmergencyVisible(false)}
          >
            <Text style={styles.secondaryButtonText}>{t("close")}</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, styles.emergencyButton]}
              onPress={() => callNumber("112")}
            >
              <Text style={styles.primaryButtonText}>{t("call112")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButtonWide, styles.emergencyButton]}
              onPress={() => callNumber("144")}
            >
              <Text style={styles.secondaryButtonText}>{t("call144")}</Text>
            </TouchableOpacity>
          </View>

          {sortedDocuments.length > 0 && (
            <View style={styles.emergencyDocsBox}>
              <View style={styles.emergencyDocsHeader}>
                <Text style={styles.sectionTitle}>{t("docs_overlay_title")}</Text>
                <View style={styles.docsBadge}>
                  <Text style={styles.docsBadgeText}>{sortedDocuments.length}</Text>
                </View>
              </View>

              <Text style={styles.emergencyDocsText}>{docsNotice}</Text>

              {sortedDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.emergencyDocRow}
                  onPress={() => openDocument(doc)}
                >
                  <Text style={styles.emergencyDocText}>📂 {doc.file_name || t("file")}</Text>
                  <Text style={styles.emergencyDocOpen}>{t("open")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView contentContainerStyle={styles.emergencyContent}>
            <EmergencyCard title={t("name")} value={form.name} />
            <EmergencyCard title={t("dob")} value={form.dob} />
            <EmergencyCard title={t("blood")} value={form.blood} />
            <EmergencyCard title={t("allergies")} value={form.allergies} critical />
            <EmergencyCard title={t("thinner")} value={form.bloodThinner} critical />
            <EmergencyCard title={t("meds")} value={form.meds} />
            <EmergencyCard title={t("chronic")} value={form.chronic} />
            <EmergencyCard title={t("notes")} value={form.notes} />

            {normalizeTel(form.em1) ? (
              <EmergencyContact
                title={lineValue(form.em1_name, t("ec1"))}
                phone={lineValue(form.em1)}
                onCall={() => callNumber(form.em1)}
                buttonLabel={t("call")}
              />
            ) : null}

            {normalizeTel(form.em2) ? (
              <EmergencyContact
                title={lineValue(form.em2_name, t("ec2"))}
                phone={lineValue(form.em2)}
                onCall={() => callNumber(form.em2)}
                buttonLabel={t("call")}
              />
            ) : null}

            <Text style={styles.emergencyHint}>{t("emergency_hint")}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FieldBox({
  children,
  variant,
  half = false,
}: {
  children: React.ReactNode;
  variant?: "crit" | "warn" | "ok";
  half?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldBox,
        half && styles.fieldBoxHalf,
        variant === "crit" && styles.fieldBoxCrit,
        variant === "warn" && styles.fieldBoxWarn,
        variant === "ok" && styles.fieldBoxOk,
      ]}
    >
      {children}
    </View>
  );
}

function FieldLabel({
  title,
  chip,
  chipVariant,
}: {
  title: string;
  chip?: string;
  chipVariant?: "crit" | "warn" | "ok";
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{title}</Text>
      {chip ? (
        <View
          style={[
            styles.chip,
            chipVariant === "crit" && styles.chipCrit,
            chipVariant === "warn" && styles.chipWarn,
            chipVariant === "ok" && styles.chipOk,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              chipVariant === "crit" && styles.chipTextLight,
              chipVariant === "ok" && styles.chipTextLight,
            ]}
          >
            {chip}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmergencyCard({
  title,
  value,
  critical = false,
}: {
  title: string;
  value?: string | null;
  critical?: boolean;
}) {
  return (
    <View style={[styles.emergencyCard, critical && styles.emergencyCardCritical]}>
      <Text style={styles.emergencyCardTitle}>{title}</Text>
      <Text style={styles.emergencyCardValue}>{lineValue(value)}</Text>
    </View>
  );
}

function EmergencyContact({
  title,
  phone,
  buttonLabel,
  onCall,
}: {
  title: string;
  phone: string;
  buttonLabel: string;
  onCall: () => void;
}) {
  return (
    <View style={styles.emergencyContact}>
      <View style={styles.emergencyContactMeta}>
        <Text style={styles.emergencyContactName}>{title}</Text>
        <Text style={styles.emergencyContactPhone}>{phone}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onCall}>
        <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: "#5b6472",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyWrap: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  emptyTitle: {
    color: "#101318",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  emptyText: {
    color: "#5b6472",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  topbar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "#e7ebf0",
  },

  topbarInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1f6feb",
    marginRight: 10,
  },

  brandText: {
    color: "#101318",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  actionsRow: {
    alignItems: "center",
    paddingRight: 8,
  },

  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e7ebf0",
    backgroundColor: "#ffffff",
    marginRight: 8,
  },

  langChipActive: {
    backgroundColor: "#2a3a57",
    borderColor: "#2a3a57",
  },

  langChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#101318",
  },

  langChipTextActive: {
    color: "#ffffff",
  },

  headerBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },

  headerBtnDanger: {
    backgroundColor: "#e10600",
  },

  headerBtnDangerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  headerBtnSoft: {
    backgroundColor: "#eef2f7",
  },

  headerBtnSoftText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "900",
  },

  headerBtnWhite: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
  },

  headerBtnWhiteText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
  },

  infoBanner: {
    backgroundColor: "rgba(31,111,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,111,235,0.2)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },

  infoBannerText: {
    color: "#1b4f9b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  cardBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 18,
    padding: 16,
  },

  headline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },

  headlineLeft: {
    flex: 1,
  },

  title: {
    color: "#101318",
    fontSize: 24,
    fontWeight: "900",
  },

  subtitle: {
    color: "#5b6472",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  pidBox: {
    alignItems: "flex-end",
  },

  pidLabel: {
    color: "#5b6472",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },

  pidValue: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  disclaimerBox: {
    backgroundColor: "#f8d7da",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,0.2)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  disclaimerText: {
    color: "#7a1212",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#101318",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 12,
  },

  formRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },

  fieldBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  fieldBoxHalf: {
    flex: 1,
    minWidth: 155,
  },

  fieldBoxCrit: {
    backgroundColor: "rgba(255,107,107,0.07)",
    borderColor: "rgba(255,107,107,0.24)",
  },

  fieldBoxWarn: {
    backgroundColor: "rgba(250,173,20,0.08)",
    borderColor: "rgba(250,173,20,0.24)",
  },

  fieldBoxOk: {
    backgroundColor: "rgba(36,194,106,0.07)",
    borderColor: "rgba(36,194,106,0.22)",
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },

  fieldLabel: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    flex: 1,
  },

  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  chipCrit: {
    backgroundColor: "#ff4d4f",
  },

  chipWarn: {
    backgroundColor: "#faad14",
  },

  chipOk: {
    backgroundColor: "#52c41a",
  },

  chipText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#101318",
    textTransform: "uppercase",
  },

  chipTextLight: {
    color: "#ffffff",
  },

  input: {
    width: "100%",
    backgroundColor: "#f4f6f8",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#101318",
  },

  textarea: {
    minHeight: 76,
    textAlignVertical: "top",
  },

  inputDisabled: {
    opacity: 0.65,
  },

  inputSpacing: {
    marginTop: 8,
  },

  selectLike: {
    backgroundColor: "#f4f6f8",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  selectLikeText: {
    color: "#101318",
    fontSize: 15,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: "#e10600",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "#1a2232",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  secondaryButtonWide: {
    backgroundColor: "#1a2232",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  dangerButton: {
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,0.18)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: "center",
  },

  dangerButtonText: {
    color: "#b01818",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  docsLoading: {
    paddingVertical: 20,
    alignItems: "center",
  },

  emptyDocsBox: {
    backgroundColor: "#f4f6f8",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d9dee6",
    borderRadius: 14,
    padding: 14,
  },

  emptyDocsText: {
    color: "#5b6472",
    fontSize: 13,
  },

  docCard: {
    backgroundColor: "#f9fafc",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  docRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  docThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#e7ebf0",
  },

  docThumbImage: {
    width: "100%",
    height: "100%",
  },

  docThumbFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  docThumbFallbackText: {
    fontSize: 28,
  },

  docMeta: {
    flex: 1,
  },

  docName: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  docInfo: {
    color: "#5b6472",
    fontSize: 12,
    lineHeight: 18,
  },

  docButtonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },

  footerArea: {
    marginTop: 18,
  },

  statusBox: {
    marginTop: 14,
  },

  statusMeta: {
    color: "#5b6472",
    fontSize: 12,
    marginBottom: 4,
  },

  statusMetaStrong: {
    color: "#101318",
    fontWeight: "700",
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5b6472",
  },

  statusOk: {
    color: "#24c26a",
  },

  statusWarn: {
    color: "#d48b00",
  },

  statusErr: {
    color: "#ff6b6b",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
  },

  modalTitle: {
    color: "#101318",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  modalOptionsWrap: {
    maxHeight: 320,
  },

  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },

  modalOptionText: {
    color: "#101318",
    fontSize: 16,
    fontWeight: "700",
  },

  emergencyScreen: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  emergencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },

  emergencyHeaderLeft: {
    flex: 1,
  },

  emergencyHeaderRight: {
    alignItems: "flex-end",
  },

  emergencyTitle: {
    color: "#101318",
    fontSize: 22,
    fontWeight: "900",
  },

  emergencySubtitle: {
    color: "#5b6472",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  emergencyPidLabel: {
    color: "#5b6472",
    fontSize: 11,
    fontWeight: "700",
  },

  emergencyPidLabelSpacing: {
    marginTop: 10,
  },

  emergencyPidValue: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
  },

  emergencyButton: {
    flexGrow: 1,
  },

  emergencyDocsBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },

  emergencyDocsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  docsBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e10600",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  docsBadgeText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  emergencyDocsText: {
    color: "#5b6472",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },

  emergencyDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
  },

  emergencyDocText: {
    color: "#101318",
    fontSize: 14,
    flex: 1,
  },

  emergencyDocOpen: {
    color: "#1f6feb",
    fontSize: 13,
    fontWeight: "700",
  },

  emergencyContent: {
    padding: 16,
    paddingBottom: 30,
  },

  emergencyCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  emergencyCardCritical: {
    backgroundColor: "rgba(255,107,107,0.08)",
    borderColor: "rgba(255,107,107,0.24)",
  },

  emergencyCardTitle: {
    color: "#5b6472",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  emergencyCardValue: {
    color: "#101318",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },

  emergencyContact: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },

  emergencyContactMeta: {
    flex: 1,
  },

  emergencyContactName: {
    color: "#101318",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },

  emergencyContactPhone: {
    color: "#5b6472",
    fontSize: 13,
  },

  emergencyHint: {
    color: "#5b6472",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});