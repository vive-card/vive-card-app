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
import {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
  getCurrentUserCardProfile,
  initialProfileForm,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
} from "../services/profileService";
import {
  MedicalDocumentViewRow,
  deleteMedicalDocument,
  getSignedDocumentUrl,
  loadMedicalDocuments,
  uploadMedicalDocument,
} from "../services/medicalDocumentsService";
import { useCardRealtime } from "../hooks/useCardRealtime";
import { formatFileSize, lineValue, normalizeTel } from "../utils/formatters";
import { getDocumentEmoji, isImageMime } from "../utils/medicalDocuments";

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

  const T = useCallback(
    (key: string) => I18N[lang]?.[key] || I18N.en[key] || key,
    [lang]
  );

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
      .select("status, blocked_at")
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
        const nextDocuments = await loadMedicalDocuments(publicId);
        setDocuments(nextDocuments);

        if (nextDocuments.length > 0) {
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
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [documents]);

  const docsNotice = useMemo(() => {
    return sortedDocuments.length === 1
      ? T("docs_notice_single")
      : T("docs_notice_multi").replace("{count}", String(sortedDocuments.length));
  }, [sortedDocuments.length, T]);

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

  const clearAll = () => {
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

  const deleteDocumentHandler = (doc: MedicalDocumentViewRow) => {
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

    Alert.alert(T("btn_check"), `Fehlend:\n${missing.join("\n")}`);
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
    <SafeAreaView style={styles.screenSafe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandWrap}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>{T("brand")}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.headerActions}
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
                  style={[styles.langChipText, active && styles.langChipTextActive]}
                >
                  {item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonDanger]}
            onPress={() => setEmergencyVisible(true)}
          >
            <Text style={styles.headerButtonDangerText}>{T("btn_emergency")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonSoft]}
            onPress={handleCheck}
          >
            <Text style={styles.headerButtonSoftText}>{T("btn_check")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonWhite]}
            onPress={logout}
          >
            <Text style={styles.headerButtonWhiteText}>{T("btn_logout")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!editable ? (
          <View style={styles.readonlyBanner}>
            <Text style={styles.readonlyBannerText}>{T("readonly")}</Text>
          </View>
        ) : null}

        <View style={styles.cardBox}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderContent}>
              <Text style={styles.title}>{T("title")}</Text>
              <Text style={styles.subtitle}>{T("subtitle")}</Text>
            </View>

            <View style={styles.pidBox}>
              <Text style={styles.pidLabel}>{T("profile_id")}</Text>
              <Text style={styles.pidValue}>{card.public_id}</Text>
            </View>
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{T("disclaimer")}</Text>
          </View>

          <View style={styles.twoColRow}>
            <FieldBox half>
              <FieldLabel title={T("name")} chip={T("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.name}
                onChangeText={(value) => setField("name", value)}
                editable={editable}
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>

            <FieldBox half lastHalf>
              <FieldLabel title={T("dob")} chip={T("required")} />
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={form.dob}
                onChangeText={(value) => setField("dob", value)}
                editable={editable}
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>
          </View>

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

          <SectionTitle title={T("critical_title")} />

          <View style={styles.twoColGrid}>
            <FieldBox half variant="crit">
              <FieldLabel
                title={T("allergies")}
                chip={T("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.allergies}
                onChangeText={(value) => setField("allergies", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>

            <FieldBox half lastHalf variant="crit">
              <FieldLabel
                title={T("thinner")}
                chip={T("critical_chip")}
                chipVariant="crit"
              />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.bloodThinner}
                onChangeText={(value) => setField("bloodThinner", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
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
                onChangeText={(value) => setField("meds", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>

            <FieldBox half lastHalf variant="ok">
              <FieldLabel title={T("vaccines")} chip={T("ok_chip")} chipVariant="ok" />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.vaccines}
                onChangeText={(value) => setField("vaccines", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>
          </View>

          <SectionTitle title={T("info_title")} />

          <View style={styles.twoColGrid}>
            <FieldBox half>
              <FieldLabel title={T("chronic")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.chronic}
                onChangeText={(value) => setField("chronic", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>

            <FieldBox half lastHalf>
              <FieldLabel title={T("organ")} />
              <TextInput
                style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
                value={form.organ}
                onChangeText={(value) => setField("organ", value)}
                editable={editable}
                multiline
                placeholderTextColor="#8b96a8"
              />
            </FieldBox>
          </View>

          <FieldBox>
            <FieldLabel title={T("notes")} />
            <TextInput
              style={[styles.input, styles.textarea, !editable && styles.inputDisabled]}
              value={form.notes}
              onChangeText={(value) => setField("notes", value)}
              editable={editable}
              multiline
              placeholderTextColor="#8b96a8"
            />
          </FieldBox>

          <SectionTitle title={T("contacts_title")} />

          <View style={styles.contactSection}>
            <FieldBox>
              <FieldLabel title={T("ec1")} />
              <TextInput
                style={[styles.input, styles.inputSpaced, !editable && styles.inputDisabled]}
                value={form.em1_name}
                onChangeText={(value) => setField("em1_name", value)}
                editable={editable}
                placeholderTextColor="#8b96a8"
              />
              <TextInput
                style={[styles.input, styles.inputSpaced, !editable && styles.inputDisabled]}
                value={form.em1}
                onChangeText={(value) => setField("em1", value)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#8b96a8"
              />
              <TouchableOpacity style={styles.callButton} onPress={() => callNumber(form.em1)}>
                <Text style={styles.callButtonText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>

            <FieldBox>
              <FieldLabel title={T("ec2")} />
              <TextInput
                style={[styles.input, styles.inputSpaced, !editable && styles.inputDisabled]}
                value={form.em2_name}
                onChangeText={(value) => setField("em2_name", value)}
                editable={editable}
                placeholderTextColor="#8b96a8"
              />
              <TextInput
                style={[styles.input, styles.inputSpaced, !editable && styles.inputDisabled]}
                value={form.em2}
                onChangeText={(value) => setField("em2", value)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#8b96a8"
              />
              <TouchableOpacity style={styles.callButton} onPress={() => callNumber(form.em2)}>
                <Text style={styles.callButtonText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>
          </View>

          <SectionTitle title={T("docs_title")} />

          <View style={styles.documentsSection}>
            <View style={styles.documentToolbar}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!editable || uploading) && styles.buttonDisabled,
                ]}
                onPress={handleTakePhoto}
                disabled={!editable || uploading}
              >
                <Text style={styles.primaryActionButtonText}>{T("camera")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionButton,
                  (!editable || uploading) && styles.buttonDisabled,
                ]}
                onPress={handlePickDocument}
                disabled={!editable || uploading}
              >
                <Text style={styles.secondaryActionButtonText}>{T("upload")}</Text>
              </TouchableOpacity>
            </View>

            {docsLoading ? (
              <View style={styles.docsLoading}>
                <ActivityIndicator color="#e10600" />
              </View>
            ) : sortedDocuments.length === 0 ? (
              <View style={styles.emptyDocumentBox}>
                <Text style={styles.emptyDocumentText}>{T("docs_empty")}</Text>
              </View>
            ) : (
              sortedDocuments.map((doc) => (
                <View key={doc.id} style={styles.documentItem}>
                  <View style={styles.documentRow}>
                    <View style={styles.documentLeft}>
                      <TouchableOpacity
                        style={styles.documentThumb}
                        onPress={() => openDocument(doc)}
                      >
                        {isImageMime(doc.mime_type) && doc.preview_url ? (
                          <Image
                            source={{ uri: doc.preview_url }}
                            style={styles.documentThumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.documentThumbFallback}>
                            <Text style={styles.documentThumbFallbackText}>
                              {getDocumentEmoji(doc)}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.documentMeta}>
                        <Text style={styles.documentName} numberOfLines={2}>
                          {doc.file_name || T("file")}
                        </Text>
                        <Text style={styles.documentType}>
                          {isImageMime(doc.mime_type) ? T("image") : T("file")}
                          {doc.file_size ? ` • ${formatFileSize(doc.file_size)}` : ""}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.documentActions}>
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => openDocument(doc)}
                      >
                        <Text style={styles.linkButtonText}>{T("open")}</Text>
                      </TouchableOpacity>

                      {editable ? (
                        <TouchableOpacity
                          style={styles.linkDangerButton}
                          onPress={() => deleteDocumentHandler(doc)}
                        >
                          <Text style={styles.linkDangerButtonText}>{T("remove")}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerButtonRow}>
              <TouchableOpacity style={styles.secondaryActionButton} onPress={toggleEdit}>
                <Text style={styles.secondaryActionButtonText}>
                  {editable ? T("edit_active") : T("edit")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!editable || saving) && styles.buttonDisabled,
                ]}
                onPress={saveProfile}
                disabled={!editable || saving}
              >
                <Text style={styles.primaryActionButtonText}>
                  {saving ? "..." : T("save")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dangerActionButton,
                  (!editable || saving) && styles.buttonDisabled,
                ]}
                onPress={clearAll}
                disabled={!editable || saving}
              >
                <Text style={styles.dangerActionButtonText}>{T("clear")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.lastUpdateText}>
                {T("last_update")}{" "}
                <Text style={styles.lastUpdateValue}>
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

            <ScrollView style={styles.modalScroll}>
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
              style={styles.secondaryActionButton}
              onPress={() => setBloodPickerVisible(false)}
            >
              <Text style={styles.secondaryActionButtonText}>{T("cancel")}</Text>
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
              <Text style={styles.emergencyTitle}>🆘 {T("emergency_mode_title")}</Text>
              <Text style={styles.emergencySubtitle}>{T("emergency_mode_sub")}</Text>
            </View>

            <View style={styles.emergencyHeaderRight}>
              <Text style={styles.emergencyPidLabel}>{T("profile_id")}</Text>
              <Text style={styles.emergencyPidValue}>{card.public_id}</Text>
              <Text style={[styles.emergencyPidLabel, styles.emergencyPidLabelSpaced]}>
                {T("last_update")}
              </Text>
              <Text style={styles.emergencyPidValue}>
                {profile?.updated_at
                  ? new Date(profile.updated_at).toLocaleString()
                  : "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.emergencyCloseButton}
            onPress={() => setEmergencyVisible(false)}
          >
            <Text style={styles.emergencyCloseButtonText}>{T("close")}</Text>
          </TouchableOpacity>

          <View style={styles.emergencyActionRow}>
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

          {sortedDocuments.length > 0 ? (
            <View style={styles.emergencyDocsBox}>
              <View style={styles.emergencyDocsHeader}>
                <Text style={styles.emergencyDocsTitle}>{T("docs_overlay_title")}</Text>
                <View style={styles.emergencyDocsBadge}>
                  <Text style={styles.emergencyDocsBadgeText}>
                    {sortedDocuments.length}
                  </Text>
                </View>
              </View>

              <Text style={styles.emergencyDocsText}>{docsNotice}</Text>

              <View style={styles.emergencyDocsList}>
                {sortedDocuments.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.emergencyDocRow}
                    onPress={() => openDocument(doc)}
                  >
                    <Text style={styles.emergencyDocRowText}>
                      📂 {doc.file_name || T("file")}
                    </Text>
                    <Text style={styles.emergencyDocRowOpen}>{T("open")}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.emergencyContent}>
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
              <View style={styles.emergencyContact}>
                <View style={styles.emergencyContactMeta}>
                  <Text style={styles.emergencyContactName}>
                    {lineValue(form.em1_name, T("ec1"))}
                  </Text>
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
              <View style={styles.emergencyContact}>
                <View style={styles.emergencyContactMeta}>
                  <Text style={styles.emergencyContactName}>
                    {lineValue(form.em2_name, T("ec2"))}
                  </Text>
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
  lastHalf,
}: {
  children: React.ReactNode;
  variant?: "crit" | "warn" | "ok";
  half?: boolean;
  lastHalf?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldBox,
        half && styles.fieldBoxHalf,
        half && lastHalf && styles.fieldBoxHalfLast,
        variant === "crit" && styles.fieldBoxCritical,
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
      <Text style={styles.fieldLabelText}>{title}</Text>
      {chip ? (
        <View
          style={[
            styles.fieldChip,
            chipVariant === "crit" && styles.fieldChipCritical,
            chipVariant === "warn" && styles.fieldChipWarn,
            chipVariant === "ok" && styles.fieldChipOk,
          ]}
        >
          <Text
            style={[
              styles.fieldChipText,
              chipVariant === "crit" && styles.fieldChipTextCritical,
              chipVariant === "warn" && styles.fieldChipTextWarn,
              chipVariant === "ok" && styles.fieldChipTextOk,
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
      <Text style={styles.emergencyInfoCardLabel}>{title}</Text>
      <Text style={styles.emergencyInfoCardValue}>{lineValue(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenSafe: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  screen: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#f6f8fb",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7483",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyWrap: {
    flex: 1,
    backgroundColor: "#f6f8fb",
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
    color: "#6b7483",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16,19,24,0.08)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerTop: {
    marginBottom: 12,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1f6feb",
    marginRight: 10,
  },
  brandText: {
    color: "#101318",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerActions: {
    alignItems: "center",
    paddingRight: 8,
  },

  langChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dde3ec",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  langChipActive: {
    backgroundColor: "#23324d",
    borderColor: "#23324d",
  },
  langChipText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
  },
  langChipTextActive: {
    color: "#ffffff",
  },

  headerButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  headerButtonDanger: {
    backgroundColor: "#b01818",
  },
  headerButtonDangerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  headerButtonSoft: {
    backgroundColor: "#eef2f7",
  },
  headerButtonSoftText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "900",
  },
  headerButtonWhite: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dde3ec",
  },
  headerButtonWhiteText: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
  },

  readonlyBanner: {
    backgroundColor: "rgba(31,111,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,111,235,0.18)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  readonlyBannerText: {
    color: "#1d5aa8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },

  cardBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,0.06)",
    borderRadius: 20,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardHeaderContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#101318",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6b7483",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  pidBox: {
    alignItems: "flex-end",
  },
  pidLabel: {
    color: "#6b7483",
    fontSize: 11,
    fontWeight: "800",
  },
  pidValue: {
    color: "#101318",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },

  noticeBox: {
    backgroundColor: "#f2f5f9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: "#5f6775",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  sectionTitle: {
    color: "#101318",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 10,
  },

  twoColRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  twoColGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  fieldBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  fieldBoxHalf: {
    width: "48.5%",
    marginRight: "3%",
  },
  fieldBoxHalfLast: {
    marginRight: 0,
  },
  fieldBoxCritical: {
    backgroundColor: "rgba(255,77,79,0.06)",
    borderRadius: 14,
    padding: 10,
  },
  fieldBoxWarn: {
    backgroundColor: "rgba(250,173,20,0.09)",
    borderRadius: 14,
    padding: 10,
  },
  fieldBoxOk: {
    backgroundColor: "rgba(82,196,26,0.08)",
    borderRadius: 14,
    padding: 10,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabelText: {
    color: "#101318",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 8,
  },

  fieldChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fieldChipText: {
    fontSize: 10,
    fontWeight: "900",
  },
  fieldChipCritical: {
    backgroundColor: "#ff4d4f",
  },
  fieldChipWarn: {
    backgroundColor: "#faad14",
  },
  fieldChipOk: {
    backgroundColor: "#52c41a",
  },
  fieldChipTextCritical: {
    color: "#ffffff",
  },
  fieldChipTextWarn: {
    color: "#101318",
  },
  fieldChipTextOk: {
    color: "#ffffff",
  },

  input: {
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#101318",
  },
  textarea: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputSpaced: {
    marginTop: 8,
  },

  selectLike: {
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectLikeText: {
    color: "#101318",
    fontSize: 14,
  },

  contactSection: {
    marginTop: 4,
  },
  callButton: {
    backgroundColor: "#23324d",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  callButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  documentsSection: {
    marginTop: 4,
  },
  documentToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  docsLoading: {
    paddingVertical: 22,
    alignItems: "center",
  },
  emptyDocumentBox: {
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,0.06)",
    borderRadius: 14,
    padding: 12,
  },
  emptyDocumentText: {
    color: "#6b7483",
    fontSize: 12,
    fontWeight: "700",
  },

  documentItem: {
    backgroundColor: "#f9fbfd",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,0.06)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  documentLeft: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 10,
  },
  documentThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
    backgroundColor: "#e8edf4",
  },
  documentThumbImage: {
    width: "100%",
    height: "100%",
  },
  documentThumbFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  documentThumbFallbackText: {
    fontSize: 24,
  },
  documentMeta: {
    flex: 1,
    justifyContent: "center",
  },
  documentName: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  documentType: {
    color: "#6b7483",
    fontSize: 11,
    lineHeight: 16,
  },
  documentActions: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  linkButton: {
    paddingVertical: 6,
  },
  linkButtonText: {
    color: "#1f6feb",
    fontSize: 13,
    fontWeight: "800",
  },
  linkDangerButton: {
    paddingVertical: 6,
    marginTop: 2,
  },
  linkDangerButtonText: {
    color: "#b01818",
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    marginTop: 18,
  },
  footerButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  statusBox: {
    marginTop: 2,
  },
  lastUpdateText: {
    color: "#6b7483",
    fontSize: 12,
    marginBottom: 4,
  },
  lastUpdateValue: {
    color: "#101318",
    fontWeight: "800",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusOk: {
    color: "#20a45c",
  },
  statusWarn: {
    color: "#b77900",
  },
  statusErr: {
    color: "#d63638",
  },

  primaryActionButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  primaryActionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryActionButton: {
    backgroundColor: "#eef2f7",
    borderWidth: 1,
    borderColor: "#dde3ec",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  secondaryActionButtonText: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "800",
  },
  dangerActionButton: {
    backgroundColor: "#b01818",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  dangerActionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
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
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 320,
  },
  modalOption: {
    paddingVertical: 12,
  },
  modalOptionText: {
    color: "#101318",
    fontSize: 15,
    fontWeight: "700",
  },

  emergencyScreen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  emergencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  emergencyHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  emergencyHeaderRight: {
    alignItems: "flex-end",
  },
  emergencyTitle: {
    color: "#101318",
    fontSize: 20,
    fontWeight: "900",
  },
  emergencySubtitle: {
    color: "#6b7483",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  emergencyPidLabel: {
    color: "#6b7483",
    fontSize: 11,
    fontWeight: "800",
  },
  emergencyPidLabelSpaced: {
    marginTop: 8,
  },
  emergencyPidValue: {
    color: "#101318",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },

  emergencyCloseButton: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emergencyCloseButtonText: {
    color: "#1f6feb",
    fontSize: 14,
    fontWeight: "900",
  },

  emergencyActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emergencyActionButton: {
    backgroundColor: "#eef2f7",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  emergencyActionButtonPrimary: {
    backgroundColor: "#b01818",
  },
  emergencyActionButtonText: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "900",
  },

  emergencyDocsBox: {
    backgroundColor: "#fff7df",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  emergencyDocsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emergencyDocsTitle: {
    color: "#101318",
    fontSize: 13,
    fontWeight: "900",
  },
  emergencyDocsBadge: {
    backgroundColor: "#b01818",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emergencyDocsBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  emergencyDocsText: {
    color: "#5f6775",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  emergencyDocsList: {
    marginTop: 10,
  },
  emergencyDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  emergencyDocRowText: {
    color: "#101318",
    fontSize: 13,
    flex: 1,
    paddingRight: 10,
  },
  emergencyDocRowOpen: {
    color: "#1f6feb",
    fontSize: 13,
    fontWeight: "800",
  },

  emergencyContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emergencyGrid: {
    marginBottom: 8,
  },
  emergencyInfoCard: {
    backgroundColor: "#f7f9fc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  emergencyInfoCardCritical: {
    backgroundColor: "rgba(255,77,79,0.08)",
  },
  emergencyInfoCardLabel: {
    color: "#6b7483",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  emergencyInfoCardValue: {
    color: "#101318",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },

  emergencyContact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  emergencyContactMeta: {
    flex: 1,
    paddingRight: 10,
  },
  emergencyContactName: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  emergencyContactPhone: {
    color: "#6b7483",
    fontSize: 13,
  },
  emergencyContactButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emergencyContactButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  emergencyHint: {
    color: "#6b7483",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});