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
import {
  CardRow,
  EmergencyCardRow,
  ProfileFormValues,
  getCurrentUserCardProfile,
  initialProfileForm,
  mapEmergencyDataToForm,
  saveCurrentUserCardProfile,
} from "../services/profileService";
import { useCardRealtime } from "../hooks/useCardRealtime";

type MedicalDocumentRow = {
  id: string;
  owner_id?: string | null;
  public_id: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

type MedicalDocumentViewRow = MedicalDocumentRow & {
  preview_url?: string | null;
};

type LangKey = "de" | "it" | "fr" | "es" | "en";

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
    readonly:
      "Diese Karte wird im öffentlichen Notfallmodus angezeigt.",
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
    no_card_text:
      "Aucune VIVE CARD n’a été trouvée pour ce compte.",
    select_blood: "Choisir le groupe sanguin",
    cancel: "Annuler",
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
  },
};

function isImageMime(mimeType?: string | null) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessExtension(fileName?: string | null, mimeType?: string | null) {
  const name = String(fileName || "").toLowerCase();
  if (name.includes(".")) return name.split(".").pop() || "bin";

  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

function normalizeTel(v?: string | null) {
  return String(v || "").trim().replace(/[^0-9+]/g, "");
}

function lineValue(value?: string | null, fallback = "—") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

function getDocumentEmoji(doc: MedicalDocumentRow) {
  if (isImageMime(doc.mime_type)) return "🖼️";
  if (isPdfMime(doc.mime_type, doc.file_name)) return "📄";
  return "📎";
}

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
  const [statusKind, setStatusKind] = useState<"ok" | "warn" | "err" | "">("");

  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [profile, setProfile] = useState<EmergencyCardRow | null>(null);
  const [form, setForm] = useState<ProfileFormValues>(initialProfileForm);
  const [documents, setDocuments] = useState<MedicalDocumentViewRow[]>([]);

  const setStatus = useCallback(
    (text: string, kind: "ok" | "warn" | "err" | "" = "") => {
      setStatusText(text);
      setStatusKind(kind);
    },
    []
  );

  const setField = useCallback((key: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const checkCardBlocked = useCallback(
    async (publicId?: string | null) => {
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
    },
    []
  );

  const loadDocuments = useCallback(
    async (publicId?: string | null) => {
      if (!publicId) {
        setDocuments([]);
        return;
      }

      try {
        setDocsLoading(true);

        const { data, error } = await supabase
          .from("medical_documents")
          .select("id, owner_id, public_id, file_name, file_path, mime_type, file_size, created_at")
          .eq("public_id", publicId)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Dokumente konnten nicht geladen werden: " + error.message);
        }

        const rows = (data || []) as MedicalDocumentRow[];

        const rowsWithPreview = await Promise.all(
          rows.map(async (doc) => {
            if (!isImageMime(doc.mime_type)) {
              return { ...doc, preview_url: null };
            }

            const { data: signedData, error: signedError } = await supabase.storage
              .from("medical-docs")
              .createSignedUrl(doc.file_path, 60 * 10);

            if (signedError || !signedData?.signedUrl) {
              return { ...doc, preview_url: null };
            }

            return {
              ...doc,
              preview_url: signedData.signedUrl,
            };
          })
        );

        setDocuments(rowsWithPreview);
        if (rowsWithPreview.length > 0) {
          setStatus(T("status_docs_loaded"), "ok");
        } else {
          setStatus(T("status_docs_empty"), "");
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
  setStatus(T("status_loading"), "");

  const result = await getCurrentUserCardProfile();

  setUserId(result.user?.id || null);
  setCard(result.card || null);
  setProfile(result.profile || null);

  const mappedForm = mapEmergencyDataToForm(result.profile);
  setForm(mappedForm ?? initialProfileForm);

  if (result.card?.public_id) {
    const blocked = await checkCardBlocked(result.card.public_id);
    if (blocked) {
      setEditable(false);
      setStatus(T("status_blocked"), "err");
    } else {
      setStatus(T("status_ready"), "");
    }

    await loadDocuments(result.card.public_id);
  } else {
    setDocuments([]);
  }
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
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
  }, [documents]);

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
      const { data, error } = await supabase.storage
        .from("medical-docs")
        .createSignedUrl(doc.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        throw new Error("Dokument konnte nicht geöffnet werden");
      }

      navigation?.navigate?.("DocumentViewer", {
        url: data.signedUrl,
        fileName: doc.file_name || "Dokument",
        mimeType: doc.mime_type || "",
      });
    } catch (e: any) {
      setStatus(e?.message || T("status_error"), "err");
    }
  };

  const deleteDocument = async (doc: MedicalDocumentViewRow) => {
    Alert.alert(
      T("remove"),
      `${doc.file_name || "Dokument"}?`,
      [
        { text: T("cancel"), style: "cancel" },
        {
          text: T("remove"),
          style: "destructive",
          onPress: async () => {
            try {
              const { error: storageError } = await supabase.storage
                .from("medical-docs")
                .remove([doc.file_path]);

              if (storageError) {
                throw new Error(storageError.message);
              }

              const { error: dbError } = await supabase
                .from("medical_documents")
                .delete()
                .eq("id", doc.id)
                .eq("public_id", doc.public_id);

              if (dbError) {
                throw new Error(dbError.message);
              }

              await loadDocuments(card?.public_id || null);
            } catch (e: any) {
              setStatus(e?.message || T("status_error"), "err");
            }
          },
        },
      ]
    );
  };

 const uploadFileToSupabase = async (params: {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number | null;
}) => {
  if (!card?.public_id || !userId) {
    throw new Error("User oder Karte fehlt");
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  const mime = String(params.mimeType || "").toLowerCase();

  if (!allowedTypes.includes(mime)) {
    throw new Error("Nur Bilder oder PDF-Dateien sind erlaubt.");
  }

  if ((params.fileSize || 0) > MAX_FILE_SIZE) {
    throw new Error("Datei ist zu groß. Maximum: 10 MB.");
  }

  const ext = guessExtension(params.fileName, params.mimeType);
  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const filePath = `${userId}/${card.public_id}/${uniqueName}`;

  const arrayBuffer = await uriToArrayBuffer(params.uri);

  const { error: uploadError } = await supabase.storage
    .from("medical-docs")
    .upload(filePath, arrayBuffer, {
      contentType: params.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Upload fehlgeschlagen: " + uploadError.message);
  }

  const { error: insertError } = await supabase
    .from("medical_documents")
    .insert({
      owner_id: userId,
      public_id: card.public_id,
      file_name: params.fileName || "Dokument",
      file_path: filePath,
      mime_type: params.mimeType || "application/octet-stream",
      file_size: params.fileSize || null,
    });

  if (insertError) {
    throw new Error("Datei hochgeladen, aber DB-Speicherung fehlgeschlagen: " + insertError.message);
  }

  await loadDocuments(card.public_id);
};
    if (!card?.public_id || !userId) {
      throw new Error("User oder Karte fehlt");
    }

    const ext = guessExtension(params.fileName, params.mimeType);
    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const filePath = `${userId}/${card.public_id}/${uniqueName}`;

    const arrayBuffer = await uriToArrayBuffer(params.uri);

    const { error: uploadError } = await supabase.storage
      .from("medical-docs")
      .upload(filePath, arrayBuffer, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Upload fehlgeschlagen: " + uploadError.message);
    }

    const { error: insertError } = await supabase
      .from("medical_documents")
      .insert({
        owner_id: userId,
        public_id: card.public_id,
        file_name: params.fileName,
        file_path: filePath,
        mime_type: params.mimeType || "application/octet-stream",
        file_size: params.fileSize || null,
      });

    if (insertError) {
      throw new Error("DB-Eintrag fehlgeschlagen: " + insertError.message);
    }

    await loadDocuments(card.public_id);
  };

 const handlePickDocument = async () => {
  try {
    if (!editable) {
      setStatus("Dokumente können nur im Bearbeitungsmodus hochgeladen werden.", "warn");
      return;
    }

    setUploading(true);
    setStatus("Dokument wird hochgeladen…", "warn");

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    await uploadFileToSupabase({
      uri: asset.uri,
      fileName: asset.name || "Dokument",
      mimeType: asset.mimeType || "application/octet-stream",
      fileSize: asset.size || null,
    });

    setStatus("Dokument gespeichert.", "ok");
  } catch (e: any) {
    setStatus(e?.message || "Upload fehlgeschlagen.", "err");
  } finally {
    setUploading(false);
  }
};
  const handleTakePhoto = async () => {
    try {
      if (!editable) {
        setStatus(T("need_login"), "warn");
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Kamera", "Bitte Kamera-Zugriff erlauben.");
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

      await uploadFileToSupabase({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize || null,
      });

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
        <ActivityIndicator size="large" color="#b01818" />
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

  const docsNotice =
    sortedDocuments.length === 1
      ? T("docs_notice_single")
      : T("docs_notice_multi").replace("{count}", String(sortedDocuments.length));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
            {(["de", "it", "fr", "es", "en"] as LangKey[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.langChip, lang === item && styles.langChipActive]}
                onPress={() => setLang(item)}
              >
                <Text
                  style={[
                    styles.langChipText,
                    lang === item && styles.langChipTextActive,
                  ]}
                >
                  {item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!editable ? (
          <View style={styles.readonlyBanner}>
            <Text style={styles.readonlyBannerText}>{T("readonly")}</Text>
          </View>
        ) : null}

        <View style={styles.cardWrap}>
          <View style={styles.headline}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headlineTitle}>{T("title")}</Text>
              <Text style={styles.headlineSub}>{T("subtitle")}</Text>
            </View>

            <View style={styles.pidBox}>
              <Text style={styles.pidLabel}>{T("profile_id")}</Text>
              <Text style={styles.pidValue}>{card.public_id}</Text>
            </View>
          </View>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{T("disclaimer")}</Text>
          </View>

          <View style={styles.row2}>
            <FieldBox>
              <FieldLabel
                title={T("name")}
                chip={T("required")}
              />
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setField("name", v)}
                editable={editable}
                placeholderTextColor="#7e8797"
              />
            </FieldBox>

            <FieldBox>
              <FieldLabel
                title={T("dob")}
                chip={T("required")}
              />
              <TextInput
                style={styles.input}
                value={form.dob}
                onChangeText={(v) => setField("dob", v)}
                editable={editable}
                placeholderTextColor="#7e8797"
              />
            </FieldBox>
          </View>

          <FieldBox style={{ marginTop: 12 }} variant="warn">
            <FieldLabel
              title={T("blood")}
              chip={T("prio1")}
              chipVariant="warn"
            />
            <TouchableOpacity
              activeOpacity={editable ? 0.8 : 1}
              onPress={() => editable && setBloodPickerVisible(true)}
              style={[
                styles.selectLike,
                !editable && styles.inputDisabled,
              ]}
            >
              <Text style={styles.selectLikeText}>{lineValue(form.blood)}</Text>
            </TouchableOpacity>
          </FieldBox>

          <SectionTitle title={T("critical_title")} />

          <View style={styles.grid2}>
            <FieldBox variant="crit">
              <FieldLabel title={T("allergies")} chip="kritisch" chipVariant="crit" />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.allergies}
                onChangeText={(v) => setField("allergies", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>

            <FieldBox variant="crit">
              <FieldLabel title={T("thinner")} chip="kritisch" chipVariant="crit" />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.bloodThinner}
                onChangeText={(v) => setField("bloodThinner", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>

            <FieldBox variant="warn">
              <FieldLabel title={T("meds")} chip="wichtig" chipVariant="warn" />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.meds}
                onChangeText={(v) => setField("meds", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>

            <FieldBox variant="ok">
              <FieldLabel title={T("vaccines")} chip="ok" chipVariant="ok" />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.vaccines}
                onChangeText={(v) => setField("vaccines", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>
          </View>

          <SectionTitle title={T("info_title")} />

          <View style={styles.grid2}>
            <FieldBox>
              <FieldLabel title={T("chronic")} />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.chronic}
                onChangeText={(v) => setField("chronic", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>

            <FieldBox>
              <FieldLabel title={T("organ")} />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.organ}
                onChangeText={(v) => setField("organ", v)}
                editable={editable}
                multiline
                placeholderTextColor="#7e8797"
              />
            </FieldBox>
          </View>

          <FieldBox style={{ marginTop: 12 }}>
            <FieldLabel title={T("notes")} />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.notes}
              onChangeText={(v) => setField("notes", v)}
              editable={editable}
              multiline
              placeholderTextColor="#7e8797"
            />
          </FieldBox>

          <SectionTitle title={T("contacts_title")} />

          <View style={styles.contactsWrap}>
            <FieldBox style={{ marginBottom: 10 }}>
              <FieldLabel title={T("ec1")} />
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                value={form.em1_name}
                onChangeText={(v) => setField("em1_name", v)}
                editable={editable}
                placeholderTextColor="#7e8797"
              />
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                value={form.em1}
                onChangeText={(v) => setField("em1", v)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#7e8797"
              />
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => callNumber(form.em1)}
              >
                <Text style={styles.callBtnText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>

            <FieldBox>
              <FieldLabel title={T("ec2")} />
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                value={form.em2_name}
                onChangeText={(v) => setField("em2_name", v)}
                editable={editable}
                placeholderTextColor="#7e8797"
              />
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                value={form.em2}
                onChangeText={(v) => setField("em2", v)}
                editable={editable}
                keyboardType="phone-pad"
                placeholderTextColor="#7e8797"
              />
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => callNumber(form.em2)}
              >
                <Text style={styles.callBtnText}>{T("call")}</Text>
              </TouchableOpacity>
            </FieldBox>
          </View>

          <SectionTitle title={T("docs_title")} />

          <View style={styles.docsGrid}>
            <View style={styles.docToolbar}>
              <TouchableOpacity
                style={[
                  styles.footerBtnPrimary,
                  !editable && styles.buttonDisabled,
                  uploading && styles.buttonDisabled,
                ]}
                onPress={handleTakePhoto}
                disabled={!editable || uploading}
              >
                <Text style={styles.footerBtnPrimaryText}>{T("camera")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerBtn,
                  !editable && styles.buttonDisabled,
                  uploading && styles.buttonDisabled,
                ]}
                onPress={handlePickDocument}
                disabled={!editable || uploading}
              >
                <Text style={styles.footerBtnText}>{T("upload")}</Text>
              </TouchableOpacity>
            </View>

            {docsLoading ? (
              <View style={styles.docsLoading}>
                <ActivityIndicator color="#2a3340" />
              </View>
            ) : sortedDocuments.length === 0 ? (
              <View style={styles.docEmpty}>
                <Text style={styles.docEmptyText}>{T("docs_empty")}</Text>
              </View>
            ) : (
              sortedDocuments.map((doc) => (
                <View key={doc.id} style={styles.docItem}>
                  <View style={styles.docLeft}>
                    <TouchableOpacity
                      style={styles.docThumb}
                      onPress={() => openDocument(doc)}
                    >
                      {isImageMime(doc.mime_type) && doc.preview_url ? (
                        <Image
                          source={{ uri: doc.preview_url }}
                          style={styles.docThumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.docThumbFallback}>
                          <Text style={styles.docThumbFallbackText}>
                            {getDocumentEmoji(doc)}
                          </Text>
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
                    <TouchableOpacity
                      style={styles.docActionBtn}
                      onPress={() => openDocument(doc)}
                    >
                      <Text style={styles.docActionBtnText}>{T("open")}</Text>
                    </TouchableOpacity>

                    {editable ? (
                      <TouchableOpacity
                        style={styles.docActionBtnDanger}
                        onPress={() => deleteDocument(doc)}
                      >
                        <Text style={styles.docActionBtnDangerText}>
                          {T("remove")}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <TouchableOpacity style={styles.footerBtn} onPress={toggleEdit}>
                <Text style={styles.footerBtnText}>
                  {editable ? T("edit_active") : T("edit")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerBtnPrimary,
                  (!editable || saving) && styles.buttonDisabled,
                ]}
                onPress={saveProfile}
                disabled={!editable || saving}
              >
                <Text style={styles.footerBtnPrimaryText}>
                  {saving ? "..." : T("save")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerBtnDanger,
                  (!editable || saving) && styles.buttonDisabled,
                ]}
                onPress={clearAll}
                disabled={!editable || saving}
              >
                <Text style={styles.footerBtnDangerText}>{T("clear")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerStatusWrap}>
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
              style={[styles.footerBtn, { marginTop: 12 }]}
              onPress={() => setBloodPickerVisible(false)}
            >
              <Text style={styles.footerBtnText}>{T("cancel")}</Text>
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
          <View style={styles.emergencyTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>
                🆘 {T("emergency_mode_title")}
              </Text>
              <Text style={styles.emergencySub}>{T("emergency_mode_sub")}</Text>
            </View>

            <View style={styles.emergencyPidWrap}>
              <Text style={styles.emergencyPidLabel}>{T("profile_id")}</Text>
              <Text style={styles.emergencyPidValue}>{card.public_id}</Text>
              <Text style={[styles.emergencyPidLabel, { marginTop: 10 }]}>
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
            style={styles.emergencyCloseBtn}
            onPress={() => setEmergencyVisible(false)}
          >
            <Text style={styles.emergencyCloseBtnText}>{T("close")}</Text>
          </TouchableOpacity>

          <View style={styles.emergencyActions}>
            <TouchableOpacity
              style={[styles.emergencyActionBtn, styles.emergencyActionBtnPrimary]}
              onPress={() => callNumber("112")}
            >
              <Text style={styles.emergencyActionBtnText}>{T("call112")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emergencyActionBtn}
              onPress={() => callNumber("144")}
            >
              <Text style={styles.emergencyActionBtnText}>{T("call144")}</Text>
            </TouchableOpacity>
          </View>

          {sortedDocuments.length > 0 ? (
            <View style={styles.emergencyDocsAlert}>
              <View style={styles.emergencyDocsHeader}>
                <Text style={styles.emergencyDocsTitle}>
                  {T("docs_overlay_title")}
                </Text>
                <View style={styles.emergencyDocsBadge}>
                  <Text style={styles.emergencyDocsBadgeText}>
                    {sortedDocuments.length}
                  </Text>
                </View>
              </View>

              <Text style={styles.emergencyDocsText}>{docsNotice}</Text>

              <View style={{ marginTop: 14 }}>
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

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyContactName}>
                    {lineValue(form.em1_name, "☎️ Notfallkontakt 1")}
                  </Text>
                  <Text style={styles.emergencyContactPhone}>
                    {lineValue(form.em1)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyContactBtn}
                  onPress={() => callNumber(form.em1)}
                >
                  <Text style={styles.emergencyContactBtnText}>{T("call")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {normalizeTel(form.em2) ? (
              <View style={styles.emergencyContact}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyContactName}>
                    {lineValue(form.em2_name, "☎️ Notfallkontakt 2")}
                  </Text>
                  <Text style={styles.emergencyContactPhone}>
                    {lineValue(form.em2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyContactBtn}
                  onPress={() => callNumber(form.em2)}
                >
                  <Text style={styles.emergencyContactBtnText}>{T("call")}</Text>
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
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

function FieldBox({
  children,
  variant,
  style,
}: {
  children: React.ReactNode;
  variant?: "crit" | "warn" | "ok";
  style?: any;
}) {
  return (
    <View
      style={[
        styles.field,
        variant === "crit" && styles.fieldCrit,
        variant === "warn" && styles.fieldWarn,
        variant === "ok" && styles.fieldOk,
        style,
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
              chipVariant === "crit" && styles.chipTextCrit,
              chipVariant === "warn" && styles.chipTextWarn,
              chipVariant === "ok" && styles.chipTextOk,
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
      <Text style={styles.emergencyCardLabel}>{title}</Text>
      <Text style={styles.emergencyCardValue}>{lineValue(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
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
  brandWrap: {
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
    backgroundColor: "#fff",
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
    color: "#fff",
  },
  headerBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  headerBtnDanger: {
    backgroundColor: "#b01818",
  },
  headerBtnDangerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },
  headerBtnSoft: {
    backgroundColor: "#f0f3f7",
  },
  headerBtnSoftText: {
    color: "#101318",
    fontWeight: "900",
    fontSize: 13,
  },
  headerBtnWhite: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
  },
  headerBtnWhiteText: {
    color: "#101318",
    fontWeight: "800",
    fontSize: 13,
  },

  readonlyBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(31,111,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,111,235,0.20)",
  },
  readonlyBannerText: {
    color: "#1b4f9b",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },

  cardWrap: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#101318",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headline: {
    marginBottom: 10,
  },
  headlineTitle: {
    color: "#101318",
    fontSize: 26,
    fontWeight: "900",
  },
  headlineSub: {
    color: "#5b6472",
    marginTop: 4,
    fontWeight: "600",
    fontSize: 15,
  },
  pidBox: {
    marginTop: 12,
  },
  pidLabel: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "800",
  },
  pidValue: {
    color: "#101318",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },

  disclaimerBox: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(176,24,24,.08)",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.25)",
  },
  disclaimerText: {
    color: "#7a1212",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },

  row2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  field: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  fieldCrit: {
    borderColor: "rgba(176,24,24,.55)",
  },
  fieldWarn: {
    borderColor: "rgba(211,155,34,.60)",
  },
  fieldOk: {
    borderColor: "rgba(30,138,74,.45)",
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    color: "#2a3340",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labelText: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    flex: 1,
    marginRight: 8,
  },

  chip: {
    borderRadius: 999,
    backgroundColor: "#f0f3f7",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipCrit: {
    backgroundColor: "rgba(176,24,24,.08)",
    borderColor: "rgba(176,24,24,.18)",
  },
  chipWarn: {
    backgroundColor: "rgba(211,155,34,.10)",
    borderColor: "rgba(211,155,34,.22)",
  },
  chipOk: {
    backgroundColor: "rgba(30,138,74,.10)",
    borderColor: "rgba(30,138,74,.18)",
  },
  chipText: {
    color: "#5b6472",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chipTextCrit: {
    color: "#b01818",
  },
  chipTextWarn: {
    color: "#7a5400",
  },
  chipTextOk: {
    color: "#1e8a4a",
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(16,19,24,.10)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: "#101318",
    backgroundColor: "#fbfcfe",
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: "#f4f6f8",
    borderColor: "rgba(16,19,24,.06)",
  },
  selectLike: {
    borderWidth: 1,
    borderColor: "rgba(16,19,24,.10)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#fbfcfe",
  },
  selectLikeText: {
    color: "#101318",
    fontSize: 15,
  },

  contactsWrap: {
    width: "100%",
  },
  callBtn: {
    borderRadius: 12,
    backgroundColor: "#1f4fb8",
    paddingVertical: 12,
    alignItems: "center",
  },
  callBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },

  docsGrid: {
    marginTop: 4,
  },
  docToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  docsLoading: {
    paddingVertical: 20,
    alignItems: "center",
  },
  docEmpty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e7ebf0",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    padding: 12,
  },
  docEmptyText: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "700",
  },

  docItem: {
    borderWidth: 1,
    borderColor: "#e7ebf0",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    padding: 12,
    marginBottom: 10,
  },
  docLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  docThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eef2f7",
    marginRight: 12,
  },
  docThumbImage: {
    width: "100%",
    height: "100%",
  },
  docThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "900",
    marginBottom: 4,
  },
  docType: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "700",
  },
  docActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  docActionBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    marginRight: 8,
    marginBottom: 8,
  },
  docActionBtnText: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "900",
  },
  docActionBtnDanger: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.20)",
    marginBottom: 8,
  },
  docActionBtnDangerText: {
    color: "#b01818",
    fontSize: 14,
    fontWeight: "900",
  },

  footer: {
    marginTop: 14,
  },
  footerLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  footerBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebf0",
    marginRight: 8,
    marginBottom: 8,
  },
  footerBtnText: {
    color: "#101318",
    fontSize: 14,
    fontWeight: "900",
  },
  footerBtnPrimary: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#2a3a57",
    marginRight: 8,
    marginBottom: 8,
  },
  footerBtnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  footerBtnDanger: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "rgba(176,24,24,.20)",
    marginBottom: 8,
  },
  footerBtnDangerText: {
    color: "#b01818",
    fontSize: 14,
    fontWeight: "900",
  },
  footerStatusWrap: {},
  lastUpdateText: {
    color: "#5b6472",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  lastUpdateValue: {
    color: "#101318",
    fontWeight: "800",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5b6472",
  },
  statusOk: {
    color: "#1e8a4a",
  },
  statusWarn: {
    color: "#7a5400",
  },
  statusErr: {
    color: "#b01818",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: "#101318",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
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
    backgroundColor: "#8c1414",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emergencyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.16)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  emergencyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  emergencySub: {
    color: "#fff",
    opacity: 0.92,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 240,
  },
  emergencyPidWrap: {
    alignItems: "flex-end",
  },
  emergencyPidLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.9,
  },
  emergencyPidValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  emergencyCloseBtn: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.24)",
    backgroundColor: "rgba(0,0,0,.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  emergencyCloseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  emergencyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  emergencyActionBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.20)",
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  emergencyActionBtnPrimary: {
    backgroundColor: "rgba(255,255,255,.18)",
  },
  emergencyActionBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "950",
  },

  emergencyDocsAlert: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.24)",
    backgroundColor: "rgba(0,0,0,.14)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  emergencyDocsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emergencyDocsTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  emergencyDocsBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  emergencyDocsBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "950",
  },
  emergencyDocsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
    lineHeight: 20,
  },
  emergencyDocRow: {
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.20)",
    padding: 14,
    marginBottom: 10,
  },
  emergencyDocRowText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  emergencyDocRowOpen: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    opacity: 0.9,
  },

  emergencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emergencyCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
    backgroundColor: "rgba(255,255,255,.10)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  emergencyCardCritical: {
    backgroundColor: "rgba(120,0,0,.20)",
    borderColor: "rgba(255,255,255,.28)",
  },
  emergencyCardLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  emergencyCardValue: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },

  emergencyContact: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
    backgroundColor: "rgba(0,0,0,.14)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  emergencyContactName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "950",
    marginBottom: 4,
  },
  emergencyContactPhone: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  emergencyContactBtn: {
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.20)",
    backgroundColor: "rgba(255,255,255,.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emergencyContactBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "950",
  },
  emergencyHint: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.92,
    lineHeight: 18,
    marginTop: 10,
  },
});
