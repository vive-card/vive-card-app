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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { supabase } from "../lib/supabase";
import type { CardRow, EmergencyCardRow, ProfileFormValues } from "../types";
import {
  getCurrentUserCardProfile,
  initialProfileForm,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
} from "../services/profileService";
import {
  type MedicalDocumentViewRow,
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

const LANGS: LangKey[] = ["de", "it", "fr", "es", "en"];

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
    missing_prefix: "Fehlend:",
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
    missing_prefix: "Mancano:",
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
    missing_prefix: "Manquant :",
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
    missing_prefix: "Falta:",
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
    missing_prefix: "Missing:",
  },
};

export default function CardScreen({ navigation }: any) {
  const [lang, setLang] = useState<LangKey>("de");

  const T = useCallback(
    (key: string) => I18N[lang]?.[key] || I18N.en[key] || key,
    [lang]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  const [editable, setEditable] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [bloodPickerVisible, setBloodPickerVisible] = useState(false);

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

  const setField = useCallback(
    (key: keyof ProfileFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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

        if (docs.length > 0) {
          setStatus(T("status_docs_loaded"), "ok");
        } else {
          setStatus(T("status_docs_empty"));
        }
      } catch (e: any) {
        setStatus(e?.message || T("status_error"), "err");
      } finally {
        setDocsLoading(false);
      }
    },
    [T, setStatus]
  );

  const loadData = useCallback(async () => {
    setStatus(T("status_loading"));

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
      setStatus(T("status_blocked"), "err");
    } else {
      setStatus(T("status_ready"));
    }

    await loadDocuments(result.card.public_id);
  }, [T, checkCardBlocked, loadDocuments, setStatus]);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (e: any) {
        setStatus(e?.message || T("status_error"), "err");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData, T, setStatus]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    } finally {
      setRefreshing(false);
    }
  }, [loadData, T, setStatus]);

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

  const docsNotice =
    sortedDocuments.length === 1
      ? T("docs_notice_single")
      : T("docs_notice_multi").replace("{count}", String(sortedDocuments.length));

  const toggleEdit = async () => {
    if (!card?.public_id) return;

    try {
      const blocked = await checkCardBlocked(card.public_id);

      if (blocked) {
        setEditable(false);
        setStatus(T("status_blocked"), "err");
        return;
      }

      setEditable((prev) => !prev);
      setStatus(!editable ? T("edit_active") : T("status_ready"), !editable ? "warn" : "");
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    }
  };

  const saveProfile = async () => {
    try {
      if (!card || !userId) return;

      const blocked = await checkCardBlocked(card.public_id);
      if (blocked) {
        setEditable(false);
        setStatus(T("status_blocked"), "err");
        return;
      }

      setSaving(true);
      await saveCurrentUserCardProfile(card, userId, form);
      setEditable(false);
      await loadData();
      setStatus(T("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    Alert.alert(T("clear"), T("confirm_clear"), [
      { text: T("cancel"), style: "cancel" },
      {
        text: T("clear"),
        style: "destructive",
        onPress: async () => {
          try {
            if (!card || !userId) return;

            const blocked = await checkCardBlocked(card.public_id);
            if (blocked) {
              setEditable(false);
              setStatus(T("status_blocked"), "err");
              return;
            }

            setSaving(true);
            await saveCurrentUserCardProfile(card, userId, initialProfileForm);
            setForm(initialProfileForm);
            setEditable(false);
            await loadData();
            setStatus(T("status_cleared"), "ok");
          } catch (e: any) {
            setStatus(e?.message || T("status_error"), "err");
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
      setStatus(e?.message || T("status_error"), "err");
    }
  };

  const deleteDocumentHandler = async (doc: MedicalDocumentViewRow) => {
    Alert.alert(T("remove"), `${doc.file_name || "Dokument"}?`, [
      { text: T("cancel"), style: "cancel" },
      {
        text: T("remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedicalDocument(doc.id, doc.file_path);
            await loadDocuments(card?.public_id || null);
          } catch (e: any) {
            setStatus(e?.message || T("status_error"), "err");
          }
        },
      },
    ]);
  };

  const handlePickDocument = async () => {
    try {
      if (!editable || !card?.public_id || !userId) {
        setStatus(T("need_login"), "warn");
        return;
      }

      setUploading(true);
      setStatus(T("status_uploading"), "warn");

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
      setStatus(T("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!editable || !card?.public_id || !userId) {
        setStatus(T("need_login"), "warn");
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(T("camera_permission_title"), T("camera_permission_text"));
        return;
      }

      setUploading(true);
      setStatus(T("status_uploading"), "warn");

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
      setStatus(T("status_saved"), "ok");
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    } finally {
      setUploading(false);
    }
  };

  const handleCheck = () => {
    const missing: string[] = [];

    if (!String(form.name || "").trim()) missing.push(T("name"));
    if (!String(form.dob || "").trim()) missing.push(T("dob"));
    if (!String(form.blood || "").trim()) missing.push(T("blood"));

    if (missing.length === 0) {
      Alert.alert(T("btn_check"), "OK");
      return;
    }

    Alert.alert(T("btn_check"), `${T("missing_prefix")}\n${missing.join("\n")}`);
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
        <Text style={styles.loadingText}>{T("status_loading")}</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>{T("no_card_title")}</Text>
        <Text style={styles.emptyText}>{T("no_card_text")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#06080d" />

      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={styles.brandWrap}>
            <View style={styles.dot} />
            <Text style={styles.brandText}>{T("brand")}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsRow}
          >
            {LANGS.map((item) => {
              const active = lang === item;
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
              <Text style={styles.headerBtnDangerText}>{T("btn_emergency")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnSoft]}
              onPress={handleCheck}
            >
              <Text style={styles.headerBtnSoftText}>{T("btn_check")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnWhite]}
              onPress={logout}
            >
              <Text style={styles.headerBtnWhiteText}>{T("btn_logout")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!editable ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{T("readonly")}</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <Text style={styles.panelTitle}>{T("title")}</Text>
              <Text style={styles.panelSubtitle}>{T("subtitle")}</Text>
            </View>

            <View style={styles.pidCard}>
              <Text style={styles.pidLabel}>{T("profile_id")}</Text>
              <Text style={styles.pidValue}>{card.public_id}</Text>
            </View>
          </View>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{T("disclaimer")}</Text>
          </View>

          <SectionTitle title={T("critical_title")} />

          <View style={styles.grid}>
            <FieldBox half>
              <FieldLabel title={T("name")} chip={T("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.name}
                onChangeText={(v) => setField("name", v)}
                editable={editable}
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox half>
              <FieldLabel title={T("dob")} chip={T("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.dob}
                onChangeText={(v) => setField("dob", v)}
                editable={editable}
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox variant="warn">
              <FieldLabel title={T("blood")} chip={T("prio1")} chipVariant="warn" />
              <TouchableOpacity
                activeOpacity={editable ? 0.85 : 1}
                onPress={() => editable && setBloodPickerVisible(true)}
                style={[styles.selectLike, !editable && styles.inputDisabled]}
              >
                <Text style={styles.selectLikeText}>{lineValue(form.blood)}</Text>
              </TouchableOpacity>
            </FieldBox>

            <FieldBox half variant="crit">
              <FieldLabel
                title={T("allergies")}
                chip={T("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.allergies}
                onChangeText={(v) => setField("allergies", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox half variant="crit">
              <FieldLabel
                title={T("thinner")}
                chip={T("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.bloodThinner}
                onChangeText={(v) => setField("bloodThinner", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox half variant="warn">
              <FieldLabel
                title={T("meds")}
                chip={T("important_chip")}
                chipVariant="warn"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.meds}
                onChangeText={(v) => setField("meds", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox half variant="ok">
              <FieldLabel title={T("vaccines")} chip={T("ok_chip")} chipVariant="ok" />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.vaccines}
                onChangeText={(v) => setField("vaccines", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>
          </View>

          <SectionTitle title={T("info_title")} />

          <View style={styles.grid}>
            <FieldBox half>
              <FieldLabel title={T("chronic")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.chronic}
                onChangeText={(v) => setField("chronic", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox half>
              <FieldLabel title={T("organ")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.organ}
                onChangeText={(v) => setField("organ", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>

            <FieldBox>
              <FieldLabel title={T("notes")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.notes}
                onChangeText={(v) => setField("notes", v)}
                editable={editable}
                multiline
                placeholderTextColor="#6f7785"
              />
            </FieldBox>
          </View>

          <SectionTitle title={T("contacts_title")} />

          <View style={styles.stack}>
            <FieldBox>
              <FieldLabel title={T("ec1")} />
              <TextInput
                style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
                value={form.em1_name}
                onChangeText={(v) => setField("em1_name", v)}
                editable={editable}
                placeholderTextColor="#6f7785"
              />
              <TextInput
                style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
                value={form.em1}
                onChangeText={(v) => setField("em1", v)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#6f7785"
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => callNumber(form.em1)}>
                <Text style={styles.secondaryButtonText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>

            <FieldBox>
              <FieldLabel title={T("ec2")} />
              <TextInput
                style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
                value={form.em2_name}
                onChangeText={(v) => setField("em2_name", v)}
                editable={editable}
                placeholderTextColor="#6f7785"
              />
              <TextInput
                style={[styles.input, styles.inputSpacing, !editable && styles.inputDisabled]}
                value={form.em2}
                onChangeText={(v) => setField("em2", v)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#6f7785"
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => callNumber(form.em2)}>
                <Text style={styles.secondaryButtonText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>
          </View>

          <SectionTitle title={T("docs_title")} />

          <View style={styles.docToolbar}>
            <TouchableOpacity
              style={[styles.primaryButton, (!editable || uploading) && styles.buttonDisabled]}
              onPress={handleTakePhoto}
              disabled={!editable || uploading}
            >
              <Text style={styles.primaryButtonText}>{T("camera")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, (!editable || uploading) && styles.buttonDisabled]}
              onPress={handlePickDocument}
              disabled={!editable || uploading}
            >
              <Text style={styles.secondaryButtonText}>{T("upload")}</Text>
            </TouchableOpacity>
          </View>

          {docsLoading ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color="#e10600" />
            </View>
          ) : sortedDocuments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{T("docs_empty")}</Text>
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
                      {doc.file_name || T("file")}
                    </Text>
                    <Text style={styles.docType}>
                      {isImageMime(doc.mime_type) ? T("image") : T("file")}
                      {doc.file_size ? ` • ${formatFileSize(doc.file_size)}` : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.docActions}>
                  <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => openDocument(doc)}>
                    <Text style={styles.secondaryButtonSmallText}>{T("open")}</Text>
                  </TouchableOpacity>

                  {editable ? (
                    <TouchableOpacity
                      style={styles.dangerButtonSmall}
                      onPress={() => deleteDocumentHandler(doc)}
                    >
                      <Text style={styles.dangerButtonSmallText}>{T("remove")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={toggleEdit}>
                <Text style={styles.secondaryButtonText}>
                  {editable ? T("edit_active") : T("edit")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, (!editable || saving) && styles.buttonDisabled]}
                onPress={saveProfile}
                disabled={!editable || saving}
              >
                <Text style={styles.primaryButtonText}>{saving ? "..." : T("save")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerButton, (!editable || saving) && styles.buttonDisabled]}
                onPress={clearAll}
                disabled={!editable || saving}
              >
                <Text style={styles.dangerButtonText}>{T("clear")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>
                {T("last_update")}{" "}
                <Text style={styles.metaValue}>
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : "—"}
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
                {statusText || T("status_ready")}
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
            <Text style={styles.modalTitle}>{T("select_blood")}</Text>

            <ScrollView style={{ maxHeight: 320 }}>
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
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setBloodPickerVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>{T("cancel")}</Text>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>🆘 {T("emergency_mode_title")}</Text>
              <Text style={styles.emergencySubtitle}>{T("emergency_mode_sub")}</Text>
            </View>

            <View style={styles.emergencyPidBox}>
              <Text style={styles.emergencyPidLabel}>{T("profile_id")}</Text>
              <Text style={styles.emergencyPidValue}>{card.public_id}</Text>
              <Text style={[styles.emergencyPidLabel, { marginTop: 10 }]}>
                {T("last_update")}
              </Text>
              <Text style={styles.emergencyPidValue}>
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.emergencyCloseButton}
            onPress={() => setEmergencyVisible(false)}
          >
            <Text style={styles.emergencyCloseButtonText}>{T("close")}</Text>
          </TouchableOpacity>

          <View style={styles.emergencyButtonRow}>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.emergencyActionButtonPrimary]}
              onPress={() => callNumber("112")}
            >
              <Text style={styles.emergencyActionButtonText}>{T("call112")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emergencyActionButton}
              onPress={() => callNumber("144")}
            >
              <Text style={styles.emergencyActionButtonText}>{T("call144")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.emergencyContent}>
            {sortedDocuments.length > 0 ? (
              <View style={styles.emergencyDocsCard}>
                <View style={styles.emergencyDocsHeader}>
                  <Text style={styles.emergencyDocsTitle}>{T("docs_overlay_title")}</Text>
                  <View style={styles.emergencyDocsBadge}>
                    <Text style={styles.emergencyDocsBadgeText}>{sortedDocuments.length}</Text>
                  </View>
                </View>

                <Text style={styles.emergencyDocsText}>{docsNotice}</Text>

                <View style={{ marginTop: 12 }}>
                  {sortedDocuments.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.emergencyDocRow}
                      onPress={() => openDocument(doc)}
                    >
                      <Text style={styles.emergencyDocRowText}>📂 {doc.file_name || T("file")}</Text>
                      <Text style={styles.emergencyDocRowOpen}>{T("open")}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.emergencyGrid}>
              <EmergencyCard title={T("name")} value={form.name} />
              <EmergencyCard title={T("dob")} value={form.dob} />
              <EmergencyCard title={T("blood")} value={form.blood} />
              <EmergencyCard title={T("allergies")} value={form.allergies} critical />
              <EmergencyCard title={T("thinner")} value={form.bloodThinner} critical />
              <EmergencyCard title={T("meds")} value={form.meds} />
              <EmergencyCard title={T("chronic")} value={form.chronic} />
              <EmergencyCard title={T("notes")} value={form.notes} />
            </View>

            {normalizeTel(form.em1) ? (
              <View style={styles.emergencyContactCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyContactName}>{lineValue(form.em1_name, T("ec1"))}</Text>
                  <Text style={styles.emergencyContactPhone}>{lineValue(form.em1)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyContactButton}
                  onPress={() => callNumber(form.em1)}
                >
                  <Text style={styles.emergencyContactButtonText}>{T("call")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {normalizeTel(form.em2) ? (
              <View style={styles.emergencyContactCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyContactName}>{lineValue(form.em2_name, T("ec2"))}</Text>
                  <Text style={styles.emergencyContactPhone}>{lineValue(form.em2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyContactButton}
                  onPress={() => callNumber(form.em2)}
                >
                  <Text style={styles.emergencyContactButtonText}>{T("call")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.emergencyHint}>{T("emergency_hint")}</Text>
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
  half,
}: {
  children: React.ReactNode;
  variant?: "crit" | "warn" | "ok";
  half?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldBox,
        half && styles.fieldHalf,
        variant === "crit" && styles.fieldCrit,
        variant === "warn" && styles.fieldWarn,
        variant === "ok" && styles.fieldOk,
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
    <View style={styles.labelRow}>
      <Text style={styles.labelText}>{title}</Text>

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
              chipVariant === "crit" && styles.chipTextDark,
              chipVariant === "warn" && styles.chipTextDark,
              chipVariant === "ok" && styles.chipTextDark,
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
    <View style={[styles.emergencyInfoCard, critical && styles.emergencyInfoCardCritical]}>
      <Text style={styles.emergencyInfoLabel}>{title}</Text>
      <Text style={styles.emergencyInfoValue}>{lineValue(value)}</Text>
    </View>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#aeb6c4",
    fontSize: 15,
  },

  emptyWrap: {
    flex: 1,
    backgroundColor: "#06080d",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: "#98a2b3",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  topbar: {
    backgroundColor: "#06080d",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  topbarInner: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e10600",
    marginRight: 10,
  },
  brandText: {
    color: "#ffffff",
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
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#10141f",
    marginRight: 8,
  },
  langChipActive: {
    backgroundColor: "#1a2232",
    borderColor: "rgba(255,255,255,0.22)",
  },
  langChipText: {
    color: "#b7bcc4",
    fontSize: 12,
    fontWeight: "800",
  },
  langChipTextActive: {
    color: "#ffffff",
  },

  headerBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  headerBtnDanger: {
    backgroundColor: "#e10600",
    borderColor: "#e10600",
  },
  headerBtnDangerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  headerBtnSoft: {
    backgroundColor: "#1a2232",
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerBtnSoftText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  headerBtnWhite: {
    backgroundColor: "#10141f",
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerBtnWhiteText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  noticeBox: {
    backgroundColor: "rgba(255,193,7,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.28)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    color: "#ffd666",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  panel: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  panelHeaderLeft: {
    flex: 1,
  },
  panelTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  panelSubtitle: {
    color: "#98a2b3",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  pidCard: {
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  pidLabel: {
    color: "#8f98a8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  pidValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  disclaimerBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  disclaimerText: {
    color: "#aeb6c4",
    fontSize: 13,
    lineHeight: 19,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stack: {
    gap: 12,
  },

  fieldBox: {
    width: "100%",
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
  },
  fieldHalf: {
    width: "48.2%",
  },
  fieldCrit: {
    borderColor: "rgba(255,107,107,0.35)",
  },
  fieldWarn: {
    borderColor: "rgba(255,214,102,0.35)",
  },
  fieldOk: {
    borderColor: "rgba(36,194,106,0.35)",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  labelText: {
    color: "#b7bcc4",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipCrit: {
    backgroundColor: "#ff6b6b",
  },
  chipWarn: {
    backgroundColor: "#ffd666",
  },
  chipOk: {
    backgroundColor: "#24c26a",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chipTextDark: {
    color: "#101318",
  },

  input: {
    width: "100%",
    backgroundColor: "#0f141d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#ffffff",
  },
  textarea: {
    minHeight: 78,
    textAlignVertical: "top",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputSpacing: {
    marginTop: 8,
  },

  selectLike: {
    width: "100%",
    backgroundColor: "#0f141d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectLikeText: {
    color: "#ffffff",
    fontSize: 15,
  },

  primaryButton: {
    backgroundColor: "#e10600",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    backgroundColor: "#1a2232",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 140,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  dangerButton: {
    backgroundColor: "rgba(255,107,107,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.28)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  },
  dangerButtonText: {
    color: "#ff9f9f",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  docToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  loadingInline: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
  },
  emptyCardText: {
    color: "#aeb6c4",
    fontSize: 14,
    lineHeight: 20,
  },

  docCard: {
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docThumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#0f141d",
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
    fontSize: 22,
  },
  docMeta: {
    flex: 1,
  },
  docName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  docType: {
    color: "#98a2b3",
    fontSize: 12,
    lineHeight: 18,
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  secondaryButtonSmall: {
    backgroundColor: "#0f141d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButtonSmallText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  dangerButtonSmall: {
    backgroundColor: "rgba(255,107,107,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.28)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dangerButtonSmallText: {
    color: "#ff9f9f",
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    marginTop: 18,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaBox: {
    marginTop: 14,
    backgroundColor: "#0f141d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
  },
  metaLabel: {
    color: "#98a2b3",
    fontSize: 12,
    lineHeight: 18,
  },
  metaValue: {
    color: "#ffffff",
    fontWeight: "800",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  statusOk: {
    color: "#24c26a",
  },
  statusWarn: {
    color: "#ffd666",
  },
  statusErr: {
    color: "#ff6b6b",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  modalOptionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  emergencyScreen: {
    flex: 1,
    backgroundColor: "#06080d",
  },
  emergencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  emergencyTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  emergencySubtitle: {
    color: "#98a2b3",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  emergencyPidBox: {
    alignItems: "flex-end",
  },
  emergencyPidLabel: {
    color: "#8f98a8",
    fontSize: 11,
    fontWeight: "700",
  },
  emergencyPidValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },

  emergencyCloseButton: {
    alignSelf: "flex-end",
    marginTop: 14,
    marginRight: 20,
    marginBottom: 8,
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emergencyCloseButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },

  emergencyButtonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  emergencyActionButton: {
    flex: 1,
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  emergencyActionButtonPrimary: {
    backgroundColor: "#e10600",
    borderColor: "#e10600",
  },
  emergencyActionButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  emergencyContent: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  emergencyDocsCard: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  emergencyDocsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emergencyDocsTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  emergencyDocsBadge: {
    backgroundColor: "#e10600",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emergencyDocsBadgeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },
  emergencyDocsText: {
    color: "#aeb6c4",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  emergencyDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a2232",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  emergencyDocRowText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  emergencyDocRowOpen: {
    color: "#ff3b30",
    fontSize: 13,
    fontWeight: "800",
  },

  emergencyGrid: {
    gap: 10,
    marginBottom: 14,
  },
  emergencyInfoCard: {
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
  },
  emergencyInfoCardCritical: {
    borderColor: "rgba(255,107,107,0.28)",
  },
  emergencyInfoLabel: {
    color: "#8f98a8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emergencyInfoValue: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },

  emergencyContactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10141f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  emergencyContactName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  emergencyContactPhone: {
    color: "#aeb6c4",
    fontSize: 13,
  },
  emergencyContactButton: {
    backgroundColor: "#e10600",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 12,
  },
  emergencyContactButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  emergencyHint: {
    color: "#98a2b3",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});