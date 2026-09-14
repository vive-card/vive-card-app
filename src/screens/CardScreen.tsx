import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
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
import { SafeAreaView } from "react-native-safe-area-context";

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

/* =========================================================
   TYPES
========================================================= */

type LangKey = "de" | "it" | "fr" | "es" | "en";

type EmergencyCountry =
  | "CH"
  | "DE"
  | "AT"
  | "IT"
  | "FR"
  | "ES";

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

type MedicalDocumentViewRow =
  MedicalDocumentRow & {
    preview_url?: string | null;
  };

type AppProfileFormValues =
  ProfileFormValues & {
    profileImagePath?: string;
    emergencyCountry?: string;
  };

type VaccineGroup = {
  title: string;
  items: string[];
};

type StatusKind =
  | ""
  | "ok"
  | "warn"
  | "err";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_EMERGENCY_COUNTRY: EmergencyCountry =
  "CH";

const EMERGENCY_TIMEOUT_MS =
  20 * 60 * 1000;

const MAX_PROFILE_IMAGE_SIZE =
  5 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  10 * 1024 * 1024;

const LANG_OPTIONS: LangKey[] = [
  "de",
  "it",
  "fr",
  "es",
  "en",
];

const COUNTRY_OPTIONS: EmergencyCountry[] = [
  "CH",
  "DE",
  "AT",
  "IT",
  "FR",
  "ES",
];

const EMERGENCY_NUMBERS: Record<
  EmergencyCountry,
  {
    general: string;
    medical: string;
    police: string;
    fire: string;
  }
> = {
  CH: {
    general: "112",
    medical: "144",
    police: "117",
    fire: "118",
  },

  DE: {
    general: "112",
    medical: "112",
    police: "110",
    fire: "112",
  },

  AT: {
    general: "112",
    medical: "144",
    police: "133",
    fire: "122",
  },

  IT: {
    general: "112",
    medical: "118",
    police: "113",
    fire: "115",
  },

  FR: {
    general: "112",
    medical: "15",
    police: "17",
    fire: "18",
  },

  ES: {
    general: "112",
    medical: "112",
    police: "112",
    fire: "112",
  },
};

const VACCINE_GROUPS: VaccineGroup[] = [
  {
    title: "Basisimpfungen",
    items: [
      "Diphtherie",
      "Tetanus",
      "Pertussis / Keuchhusten",
      "Poliomyelitis / Kinderlähmung",
      "Haemophilus influenzae Typ b / Hib",
      "Hepatitis B",
      "Masern",
      "Mumps",
      "Röteln",
      "Masern–Mumps–Röteln / MMR",
      "Varizellen / Windpocken",
      "HPV",
      "Pneumokokken",
    ],
  },

  {
    title: "Weitere Impfungen",
    items: [
      "Rotaviren",
      "Meningokokken B",
      "Meningokokken ACWY",
      "Influenza / Grippe",
      "COVID-19",
      "Herpes Zoster / Gürtelrose",
      "RSV",
      "FSME / Zeckenenzephalitis",
    ],
  },

  {
    title: "Reise- und Risikoimpfungen",
    items: [
      "Hepatitis A",
      "Tollwut",
      "Gelbfieber",
      "Typhus",
      "Cholera",
      "Japanische Enzephalitis",
      "Dengue",
      "Mpox",
      "Tuberkulose / BCG",
    ],
  },
];

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

/* =========================================================
   I18N
========================================================= */

const I18N: Record<
  LangKey,
  Record<string, string>
> = {
  de: {
    brand: "VIVE CARD",

    btn_emergency:
      "🆘 NOTFALL",

    btn_logout:
      "↩︎ Abmelden",

    btn_edit:
      "Bearbeiten",

    btn_edit_active:
      "Bearbeitung aktiv",

    btn_save:
      "Speichern",

    btn_clear:
      "Alles löschen",

    title:
      "Notfallinformation",

    subtitle:
      "Notfall-Speed: alles auf einem Screen – schnell erfassbar für Einsatzkräfte.",

    profile_id:
      "PROFIL-ID",

    required:
      "Pflicht",

    prio1:
      "Priorität 1",

    critical:
      "kritisch",

    important:
      "wichtig",

    ok:
      "ok",

    critical_title:
      "⚠️ Kritische medizinische Information",

    info_title:
      "ℹ️ Weitere medizinische Informationen",

    contacts_title:
      "📞 Notfallkontakte",

    docs_section_title:
      "📄 Notfallpass & Dokumente",

    name_label:
      "👤 Vor- & Nachname",

    dob_label:
      "🎂 Geburtsdatum",

    blood_label:
      "🩸 Blutgruppe",

    allergies_label:
      "🧪 Allergien",

    thinner_label:
      "💊 Blutverdünner",

    meds_label:
      "💉 Medikamente",

    vaccines_label:
      "✅ Impfungen",

    chronic_label:
      "🫀 Chronische Erkrankungen",

    organ_label:
      "🎗 Organspende",

    notes_label:
      "📝 Notizen / Hinweise",

    emergency_country_label:
      "🌍 Land für Notrufnummern",

    emergency_country_help:
      "Dieses Land bestimmt die angezeigten Notrufnummern.",

    country_ch:
      "Schweiz",

    country_de:
      "Deutschland",

    country_at:
      "Österreich",

    country_it:
      "Italien",

    country_fr:
      "Frankreich",

    country_es:
      "Spanien",

    emergency_notice:
      "Diese Informationen wurden vom Karteninhaber selbst erfasst. Keine Garantie auf Vollständigkeit oder Aktualität. Im Zweifel medizinische Standards anwenden.",

    ec1_label:
      "Notfallkontakt 1",

    ec2_label:
      "Notfallkontakt 2",

    ec1_name_ph:
      "z.B. Ehefrau, Bruder, Kontaktperson",

    ec2_name_ph:
      "z.B. Hausarzt",

    call:
      "Anrufen",

    name_ph:
      "Vor- und Nachname",

    dob_ph:
      "TT.MM.JJJJ",

    allergies_ph:
      "z.B. Penicillin, Nickel",

    thinner_ph:
      "z.B. Marcoumar, Eliquis",

    meds_ph:
      "z.B. Insulin",

    chronic_ph:
      "z.B. Asthma",

    organ_ph:
      "Ja / Nein / Unklar",

    notes_ph:
      "z.B. Hinweise für Einsatzkräfte",

    last_update:
      "Letztes Update:",

    status_ready:
      "Bereit.",

    status_loading:
      "Lade…",

    status_saved:
      "Gespeichert.",

    status_synced:
      "Synchronisiert.",

    status_cleared:
      "Geleert.",

    status_blocked:
      "Diese VIVE CARD wurde gesperrt oder deaktiviert.",

    card_blocked_banner:
      "Diese VIVE CARD wurde gesperrt oder deaktiviert und ist nicht mehr bearbeitbar.",

    card_status_check_failed:
      "Kartenstatus konnte nicht geprüft werden:",

    login_banner:
      "Du musst eingeloggt sein um diese Karte zu bearbeiten.",

    readonly_banner:
      "Diese Karte wird im öffentlichen Notfallmodus angezeigt.",

    confirm_clear:
      "Wirklich alle Felder leeren?",

    cancel:
      "Abbrechen",

    save:
      "Speichern",

    remove:
      "Entfernen",

    open:
      "Öffnen",

    select_blood:
      "Blutgruppe auswählen",

    select_country:
      "Land auswählen",

    select_language:
      "Sprache auswählen",

    select_vaccine:
      "Impfung auswählen",

    custom_vaccine:
      "Impfung manuell eingeben",

    add:
      "+ Hinzufügen",

    profile_image:
      "📷 Profilbild",

    profile_image_saved:
      "Profilbild wurde gespeichert.",

    profile_image_failed:
      "Profilbild konnte nicht gespeichert werden.",

    profile_image_max:
      "Das Profilbild darf maximal 5 MB groß sein.",

    library_title:
      "Mediathek",

    library_permission_needed:
      "Bitte Zugriff auf deine Fotos erlauben.",

    camera_title:
      "Kamera",

    camera_permission_needed:
      "Bitte Kamera-Zugriff erlauben.",

    docs_upload_camera:
      "📸 Foto aufnehmen",

    docs_upload_file:
      "📂 Datei hochladen",

    docs_empty:
      "Noch keine Dokumente hinzugefügt.",

    docs_loading:
      "Dokument wird hochgeladen…",

    docs_saved:
      "Dokument gespeichert.",

    docs_deleted:
      "Dokument gelöscht.",

    docs_load_failed:
      "Dokumente konnten nicht geladen werden.",

    docs_open_failed:
      "Dokument konnte nicht geöffnet werden.",

    docs_upload_failed:
      "Upload fehlgeschlagen.",

    docs_invalid_type:
      "Nur Bilder oder PDF-Dateien sind erlaubt.",

    docs_file_too_large:
      "Datei ist zu groß. Maximum: 10 MB.",

    docs_edit_only:
      "Dokumente können nur im Bearbeitungsmodus hochgeladen werden.",

    docs_type_image:
      "Bild",

    docs_type_file:
      "Dokument / PDF",

    docs_notice_single:
      "Achtung: Es ist 1 zusätzliches medizinisches Dokument vorhanden. Bitte Dokument öffnen.",

    docs_notice_multi:
      "Achtung: Es sind {count} zusätzliche medizinische Dokumente vorhanden. Bitte Dokumente öffnen.",

    docs_overlay_title:
      "📄 Wichtige Dokumente",

    docs_default_name:
      "Dokument",

    rename:
      "✏️ Beschriftung ändern",

    rename_title:
      "Neue Beschriftung",

    rename_placeholder:
      "Dokumentbezeichnung",

    rename_saved:
      "Beschriftung wurde geändert.",

    rename_invalid:
      "Die Beschriftung muss 1 bis 120 Zeichen enthalten.",

    emergency_mode_title:
      "NOTFALL-MODUS",

    emergency_mode_sub:
      "Nur kritische Daten – für Einsatzkräfte",

    close:
      "✕ Schließen",

    call_emergency:
      "Allgemeiner Notruf",

    call_medical:
      "Medizinischer Notruf",

    call_police:
      "Polizei",

    call_fire:
      "Feuerwehr",

    emergency_hint:
      "Tipp: 112 funktioniert europaweit. In der Schweiz ist 144 der medizinische Rettungsdienst.",

    selected_country:
      "Ausgewähltes Land",

    general_emergency_number:
      "Allgemeiner Notruf",

    emergency_timeout:
      "Die Notfallansicht wurde aus Datenschutzgründen nach 20 Minuten automatisch geschlossen.",

    vaccines_emergency_title:
      "💉 Impfungen",

    emergency_contact_fallback_1:
      "☎️ Notfallkontakt 1",

    emergency_contact_fallback_2:
      "☎️ Notfallkontakt 2",

    no_card_title:
      "Keine Karte gefunden",

    no_card_text:
      "Für diesen Account wurde aktuell keine VIVE CARD gefunden.",

    status_error:
      "Ein Fehler ist aufgetreten.",

    need_login:
      "Du musst eingeloggt sein um diese Karte zu bearbeiten.",

    error_title:
      "Fehler",

    notice_title:
      "Hinweis",

    no_phone_available:
      "Keine Telefonnummer vorhanden.",

    call_failed:
      "Nummer konnte nicht gewählt werden:",

    clear:
      "Alles löschen",

    logout:
      "Abmelden",
  },

  it: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENZA",
    btn_logout: "↩︎ Esci",
    btn_edit: "Modifica",
    btn_edit_active: "Modifica attiva",
    btn_save: "Salva",
    btn_clear: "Svuota tutto",

    title: "Informazioni d’emergenza",
    subtitle:
      "Tutto su uno schermo – rapido per i soccorritori.",

    profile_id: "ID PROFILO",
    required: "Obbligo",
    prio1: "Priorità 1",
    critical: "critico",
    important: "importante",
    ok: "ok",

    critical_title:
      "⚠️ Informazioni mediche critiche",

    info_title:
      "ℹ️ Informazioni importanti",

    contacts_title:
      "📞 Contatti d’emergenza",

    docs_section_title:
      "📄 Pass d’emergenza e documenti",

    name_label:
      "👤 Nome e cognome",

    dob_label:
      "🎂 Data di nascita",

    blood_label:
      "🩸 Gruppo sanguigno",

    allergies_label:
      "🧪 Allergie",

    thinner_label:
      "💊 Anticoagulanti",

    meds_label:
      "💉 Farmaci",

    vaccines_label:
      "✅ Vaccini",

    chronic_label:
      "🫀 Malattie croniche",

    organ_label:
      "🎗 Donazione organi",

    notes_label:
      "📝 Note / Indicazioni",

    emergency_country_label:
      "🌍 Paese per i numeri di emergenza",

    emergency_country_help:
      "Questo paese determina i numeri di emergenza visualizzati.",

    country_ch: "Svizzera",
    country_de: "Germania",
    country_at: "Austria",
    country_it: "Italia",
    country_fr: "Francia",
    country_es: "Spagna",

    emergency_notice:
      "Le informazioni sono state inserite dal titolare della carta. Nessuna garanzia di completezza o aggiornamento. In caso di dubbio applicare gli standard medici.",

    ec1_label: "Contatto 1",
    ec2_label: "Contatto 2",

    ec1_name_ph:
      "es. moglie, fratello, persona di contatto",

    ec2_name_ph:
      "es. medico di famiglia",

    call: "Chiama",

    name_ph:
      "Nome e cognome",

    dob_ph:
      "GG.MM.AAAA",

    allergies_ph:
      "Es. penicillina, nichel",

    thinner_ph:
      "Es. Eliquis",

    meds_ph:
      "Es. insulina",

    chronic_ph:
      "Es. asma",

    organ_ph:
      "Sì / No / Incerto",

    notes_ph:
      "Note per i soccorritori",

    last_update:
      "Ultimo aggiornamento:",

    status_ready:
      "Pronto.",

    status_loading:
      "Caricamento…",

    status_saved:
      "Salvato.",

    status_synced:
      "Sincronizzato.",

    status_cleared:
      "Svuotato.",

    status_blocked:
      "Questa VIVE CARD è stata bloccata o disattivata.",

    card_blocked_banner:
      "Questa VIVE CARD è stata bloccata o disattivata e non è più modificabile.",

    card_status_check_failed:
      "Impossibile verificare lo stato della carta:",

    login_banner:
      "Devi effettuare l’accesso per modificare questa carta.",

    readonly_banner:
      "Questa carta viene mostrata in modalità emergenza pubblica.",

    confirm_clear:
      "Vuoi davvero svuotare tutto?",

    cancel:
      "Annulla",

    save:
      "Salva",

    remove:
      "Rimuovi",

    open:
      "Apri",

    select_blood:
      "Seleziona gruppo sanguigno",

    select_country:
      "Seleziona paese",

    select_language:
      "Seleziona lingua",

    select_vaccine:
      "Seleziona vaccino",

    custom_vaccine:
      "Inserisci vaccino manualmente",

    add:
      "+ Aggiungi",

    profile_image:
      "📷 Foto profilo",

    profile_image_saved:
      "Foto profilo salvata.",

    profile_image_failed:
      "Impossibile salvare la foto profilo.",

    profile_image_max:
      "La foto profilo può avere una dimensione massima di 5 MB.",

    library_title:
      "Libreria",

    library_permission_needed:
      "Consenti l'accesso alle tue foto.",

    camera_title:
      "Fotocamera",

    camera_permission_needed:
      "Consenti l'accesso alla fotocamera.",

    docs_upload_camera:
      "📸 Scatta con la fotocamera",

    docs_upload_file:
      "📂 Carica file",

    docs_empty:
      "Nessun documento aggiunto.",

    docs_loading:
      "Documento in caricamento…",

    docs_saved:
      "Documento salvato.",

    docs_deleted:
      "Documento eliminato.",

    docs_load_failed:
      "Impossibile caricare i documenti.",

    docs_open_failed:
      "Impossibile aprire il documento.",

    docs_upload_failed:
      "Caricamento non riuscito.",

    docs_invalid_type:
      "Sono consentiti solo immagini o PDF.",

    docs_file_too_large:
      "File troppo grande. Massimo: 10 MB.",

    docs_edit_only:
      "I documenti possono essere caricati solo in modalità modifica.",

    docs_type_image:
      "Immagine",

    docs_type_file:
      "Documento / PDF",

    docs_notice_single:
      "Attenzione: è presente 1 documento medico aggiuntivo. Aprire il documento.",

    docs_notice_multi:
      "Attenzione: sono presenti {count} documenti medici aggiuntivi. Aprire i documenti.",

    docs_overlay_title:
      "📄 Documenti importanti",

    docs_default_name:
      "Documento",

    rename:
      "✏️ Modifica etichetta",

    rename_title:
      "Nuova etichetta",

    rename_placeholder:
      "Nome documento",

    rename_saved:
      "Etichetta modificata.",

    rename_invalid:
      "L’etichetta deve contenere da 1 a 120 caratteri.",

    emergency_mode_title:
      "MODALITÀ EMERGENZA",

    emergency_mode_sub:
      "Solo dati critici – per soccorritori",

    close:
      "✕ Chiudi",

    call_emergency:
      "Emergenza generale",

    call_medical:
      "Emergenza medica",

    call_police:
      "Polizia",

    call_fire:
      "Vigili del fuoco",

    emergency_hint:
      "Suggerimento: 112 funziona in Europa. In Svizzera 144 è il soccorso sanitario.",

    selected_country:
      "Paese selezionato",

    general_emergency_number:
      "Numero generale di emergenza",

    emergency_timeout:
      "La modalità emergenza è stata chiusa automaticamente dopo 20 minuti per motivi di privacy.",

    vaccines_emergency_title:
      "💉 Vaccini",

    emergency_contact_fallback_1:
      "☎️ Contatto d’emergenza 1",

    emergency_contact_fallback_2:
      "☎️ Contatto d’emergenza 2",

    no_card_title:
      "Nessuna carta trovata",

    no_card_text:
      "Per questo account non è stata trovata nessuna VIVE CARD.",

    status_error:
      "Si è verificato un errore.",

    need_login:
      "Devi effettuare l’accesso per modificare questa carta.",

    error_title:
      "Errore",

    notice_title:
      "Avviso",

    no_phone_available:
      "Nessun numero di telefono disponibile.",

    call_failed:
      "Impossibile chiamare il numero:",

    clear:
      "Svuota tutto",

    logout:
      "Esci",
  },

  fr: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 URGENCE",
    btn_logout: "↩︎ Déconnexion",
    btn_edit: "Modifier",
    btn_edit_active: "Modification active",
    btn_save: "Enregistrer",
    btn_clear: "Tout effacer",

    title: "Informations d’urgence",

    subtitle:
      "Tout sur un écran – rapide pour les secours.",

    profile_id:
      "ID PROFIL",

    required:
      "Obligatoire",

    prio1:
      "Priorité 1",

    critical:
      "critique",

    important:
      "important",

    ok:
      "ok",

    critical_title:
      "⚠️ Informations médicales critiques",

    info_title:
      "ℹ️ Informations importantes",

    contacts_title:
      "📞 Contacts d’urgence",

    docs_section_title:
      "📄 Passeport d’urgence et documents",

    name_label:
      "👤 Prénom et nom",

    dob_label:
      "🎂 Date de naissance",

    blood_label:
      "🩸 Groupe sanguin",

    allergies_label:
      "🧪 Allergies",

    thinner_label:
      "💊 Anticoagulants",

    meds_label:
      "💉 Médicaments",

    vaccines_label:
      "✅ Vaccins",

    chronic_label:
      "🫀 Maladies chroniques",

    organ_label:
      "🎗 Don d’organes",

    notes_label:
      "📝 Notes / Indications",

    emergency_country_label:
      "🌍 Pays pour les numéros d’urgence",

    emergency_country_help:
      "Ce pays détermine les numéros d’urgence affichés.",

    country_ch: "Suisse",
    country_de: "Allemagne",
    country_at: "Autriche",
    country_it: "Italie",
    country_fr: "France",
    country_es: "Espagne",

    emergency_notice:
      "Les informations ont été saisies par le titulaire de la carte. Aucune garantie d’exhaustivité ou d’actualité. En cas de doute, appliquer les standards médicaux.",

    ec1_label:
      "Contact 1",

    ec2_label:
      "Contact 2",

    ec1_name_ph:
      "ex. épouse, frère, personne de contact",

    ec2_name_ph:
      "ex. médecin de famille",

    call:
      "Appeler",

    name_ph:
      "Prénom Nom",

    dob_ph:
      "JJ.MM.AAAA",

    allergies_ph:
      "Ex. pénicilline, nickel",

    thinner_ph:
      "Ex. Eliquis",

    meds_ph:
      "Ex. insuline",

    chronic_ph:
      "Ex. asthme",

    organ_ph:
      "Oui / Non / Incertain",

    notes_ph:
      "Notes pour les secours",

    last_update:
      "Dernière mise à jour :",

    status_ready:
      "Prêt.",

    status_loading:
      "Chargement…",

    status_saved:
      "Enregistré.",

    status_synced:
      "Synchronisé.",

    status_cleared:
      "Effacé.",

    status_blocked:
      "Cette VIVE CARD a été bloquée ou désactivée.",

    card_blocked_banner:
      "Cette VIVE CARD a été bloquée ou désactivée et ne peut plus être modifiée.",

    card_status_check_failed:
      "Le statut de la carte n’a pas pu être vérifié :",

    login_banner:
      "Vous devez être connecté pour modifier cette carte.",

    readonly_banner:
      "Cette carte est affichée en mode urgence public.",

    confirm_clear:
      "Vraiment tout effacer ?",

    cancel:
      "Annuler",

    save:
      "Enregistrer",

    remove:
      "Supprimer",

    open:
      "Ouvrir",

    select_blood:
      "Choisir le groupe sanguin",

    select_country:
      "Choisir le pays",

    select_language:
      "Choisir la langue",

    select_vaccine:
      "Choisir un vaccin",

    custom_vaccine:
      "Saisir un vaccin manuellement",

    add:
      "+ Ajouter",

    profile_image:
      "📷 Photo de profil",

    profile_image_saved:
      "Photo de profil enregistrée.",

    profile_image_failed:
      "La photo de profil n’a pas pu être enregistrée.",

    profile_image_max:
      "La photo de profil ne peut pas dépasser 5 Mo.",

    library_title:
      "Photothèque",

    library_permission_needed:
      "Veuillez autoriser l’accès à vos photos.",

    camera_title:
      "Caméra",

    camera_permission_needed:
      "Veuillez autoriser l’accès à la caméra.",

    docs_upload_camera:
      "📸 Prendre avec l’appareil photo",

    docs_upload_file:
      "📂 Téléverser un fichier",

    docs_empty:
      "Aucun document ajouté.",

    docs_loading:
      "Téléversement du document…",

    docs_saved:
      "Document enregistré.",

    docs_deleted:
      "Document supprimé.",

    docs_load_failed:
      "Impossible de charger les documents.",

    docs_open_failed:
      "Impossible d’ouvrir le document.",

    docs_upload_failed:
      "Le téléversement a échoué.",

    docs_invalid_type:
      "Seules les images ou les PDF sont autorisés.",

    docs_file_too_large:
      "Fichier trop volumineux. Maximum : 10 Mo.",

    docs_edit_only:
      "Les documents peuvent être téléversés uniquement en mode modification.",

    docs_type_image:
      "Image",

    docs_type_file:
      "Document / PDF",

    docs_notice_single:
      "Attention : 1 document médical supplémentaire est disponible. Veuillez ouvrir le document.",

    docs_notice_multi:
      "Attention : {count} documents médicaux supplémentaires sont disponibles. Veuillez ouvrir les documents.",

    docs_overlay_title:
      "📄 Documents importants",

    docs_default_name:
      "Document",

    rename:
      "✏️ Modifier le libellé",

    rename_title:
      "Nouveau libellé",

    rename_placeholder:
      "Nom du document",

    rename_saved:
      "Libellé modifié.",

    rename_invalid:
      "Le libellé doit contenir entre 1 et 120 caractères.",

    emergency_mode_title:
      "MODE URGENCE",

    emergency_mode_sub:
      "Données critiques uniquement – pour les secours",

    close:
      "✕ Fermer",

    call_emergency:
      "Urgence générale",

    call_medical:
      "Urgence médicale",

    call_police:
      "Police",

    call_fire:
      "Pompiers",

    emergency_hint:
      "Astuce : 112 fonctionne en Europe. En Suisse, 144 est le service médical d’urgence.",

    selected_country:
      "Pays sélectionné",

    general_emergency_number:
      "Numéro d’urgence général",

    emergency_timeout:
      "La vue d’urgence a été fermée automatiquement après 20 minutes pour des raisons de confidentialité.",

    vaccines_emergency_title:
      "💉 Vaccins",

    emergency_contact_fallback_1:
      "☎️ Contact d’urgence 1",

    emergency_contact_fallback_2:
      "☎️ Contact d’urgence 2",

    no_card_title:
      "Aucune carte trouvée",

    no_card_text:
      "Aucune VIVE CARD n’a été trouvée pour ce compte.",

    status_error:
      "Une erreur est survenue.",

    need_login:
      "Vous devez être connecté pour modifier cette carte.",

    error_title:
      "Erreur",

    notice_title:
      "Information",

    no_phone_available:
      "Aucun numéro de téléphone disponible.",

    call_failed:
      "Le numéro n’a pas pu être appelé :",

    clear:
      "Tout effacer",

    logout:
      "Déconnexion",
  },

  es: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENCIA",
    btn_logout: "↩︎ Cerrar sesión",
    btn_edit: "Editar",
    btn_edit_active: "Edición activa",
    btn_save: "Guardar",
    btn_clear: "Borrar todo",

    title:
      "Información de emergencia",

    subtitle:
      "Todo en una sola pantalla – rápido para el personal de emergencia.",

    profile_id:
      "ID DE PERFIL",

    required:
      "Obligatorio",

    prio1:
      "Prioridad 1",

    critical:
      "crítico",

    important:
      "importante",

    ok:
      "ok",

    critical_title:
      "⚠️ Información médica crítica",

    info_title:
      "ℹ️ Información importante",

    contacts_title:
      "📞 Contactos de emergencia",

    docs_section_title:
      "📄 Pase de emergencia y documentos",

    name_label:
      "👤 Nombre completo",

    dob_label:
      "🎂 Fecha de nacimiento",

    blood_label:
      "🩸 Grupo sanguíneo",

    allergies_label:
      "🧪 Alergias",

    thinner_label:
      "💊 Anticoagulantes",

    meds_label:
      "💉 Medicamentos",

    vaccines_label:
      "✅ Vacunas",

    chronic_label:
      "🫀 Enfermedades crónicas",

    organ_label:
      "🎗 Donación de órganos",

    notes_label:
      "📝 Notas / indicaciones",

    emergency_country_label:
      "🌍 País para los números de emergencia",

    emergency_country_help:
      "Este país determina los números de emergencia mostrados.",

    country_ch: "Suiza",
    country_de: "Alemania",
    country_at: "Austria",
    country_it: "Italia",
    country_fr: "Francia",
    country_es: "España",

    emergency_notice:
      "La información fue introducida por el titular de la tarjeta. No se garantiza su exactitud o actualización. En caso de duda, aplicar los estándares médicos.",

    ec1_label:
      "Contacto 1",

    ec2_label:
      "Contacto 2",

    ec1_name_ph:
      "p. ej. esposa, hermano, persona de contacto",

    ec2_name_ph:
      "p. ej. médico de cabecera",

    call:
      "Llamar",

    name_ph:
      "Nombre completo",

    dob_ph:
      "DD.MM.AAAA",

    allergies_ph:
      "p. ej. penicilina, níquel",

    thinner_ph:
      "p. ej. Eliquis",

    meds_ph:
      "p. ej. insulina",

    chronic_ph:
      "p. ej. asma",

    organ_ph:
      "Sí / No / Desconocido",

    notes_ph:
      "Notas para emergencias",

    last_update:
      "Última actualización:",

    status_ready:
      "Listo.",

    status_loading:
      "Cargando…",

    status_saved:
      "Guardado.",

    status_synced:
      "Sincronizado.",

    status_cleared:
      "Borrado.",

    status_blocked:
      "Esta VIVE CARD ha sido bloqueada o desactivada.",

    card_blocked_banner:
      "Esta VIVE CARD ha sido bloqueada o desactivada y ya no se puede editar.",

    card_status_check_failed:
      "No se pudo comprobar el estado de la tarjeta:",

    login_banner:
      "Debes iniciar sesión para editar esta tarjeta.",

    readonly_banner:
      "Esta tarjeta se muestra en modo público de emergencia.",

    confirm_clear:
      "¿Borrar realmente todos los campos?",

    cancel:
      "Cancelar",

    save:
      "Guardar",

    remove:
      "Eliminar",

    open:
      "Abrir",

    select_blood:
      "Seleccionar grupo sanguíneo",

    select_country:
      "Seleccionar país",

    select_language:
      "Seleccionar idioma",

    select_vaccine:
      "Seleccionar vacuna",

    custom_vaccine:
      "Introducir vacuna manualmente",

    add:
      "+ Añadir",

    profile_image:
      "📷 Foto de perfil",

    profile_image_saved:
      "Foto de perfil guardada.",

    profile_image_failed:
      "No se pudo guardar la foto de perfil.",

    profile_image_max:
      "La foto de perfil puede tener un máximo de 5 MB.",

    library_title:
      "Galería",

    library_permission_needed:
      "Permite el acceso a tus fotos.",

    camera_title:
      "Cámara",

    camera_permission_needed:
      "Permite el acceso a la cámara.",

    docs_upload_camera:
      "📸 Tomar con cámara",

    docs_upload_file:
      "📂 Subir archivo",

    docs_empty:
      "Todavía no se han añadido documentos.",

    docs_loading:
      "Subiendo documento…",

    docs_saved:
      "Documento guardado.",

    docs_deleted:
      "Documento eliminado.",

    docs_load_failed:
      "No se pudieron cargar los documentos.",

    docs_open_failed:
      "No se pudo abrir el documento.",

    docs_upload_failed:
      "La subida falló.",

    docs_invalid_type:
      "Solo se permiten imágenes o archivos PDF.",

    docs_file_too_large:
      "El archivo es demasiado grande. Máximo: 10 MB.",

    docs_edit_only:
      "Los documentos solo se pueden subir en modo edición.",

    docs_type_image:
      "Imagen",

    docs_type_file:
      "Documento / PDF",

    docs_notice_single:
      "Atención: hay 1 documento médico adicional disponible. Abre el documento.",

    docs_notice_multi:
      "Atención: hay {count} documentos médicos adicionales disponibles. Abre los documentos.",

    docs_overlay_title:
      "📄 Documentos importantes",

    docs_default_name:
      "Documento",

    rename:
      "✏️ Cambiar etiqueta",

    rename_title:
      "Nueva etiqueta",

    rename_placeholder:
      "Nombre del documento",

    rename_saved:
      "Etiqueta modificada.",

    rename_invalid:
      "La etiqueta debe tener entre 1 y 120 caracteres.",

    emergency_mode_title:
      "MODO EMERGENCIA",

    emergency_mode_sub:
      "Solo datos críticos – para emergencias",

    close:
      "✕ Cerrar",

    call_emergency:
      "Emergencia general",

    call_medical:
      "Emergencia médica",

    call_police:
      "Policía",

    call_fire:
      "Bomberos",

    emergency_hint:
      "Consejo: 112 funciona en Europa. En Suiza, 144 es el servicio médico de urgencias.",

    selected_country:
      "País seleccionado",

    general_emergency_number:
      "Número general de emergencias",

    emergency_timeout:
      "La vista de emergencia se cerró automáticamente después de 20 minutos por motivos de privacidad.",

    vaccines_emergency_title:
      "💉 Vacunas",

    emergency_contact_fallback_1:
      "☎️ Contacto de emergencia 1",

    emergency_contact_fallback_2:
      "☎️ Contacto de emergencia 2",

    no_card_title:
      "No se encontró ninguna tarjeta",

    no_card_text:
      "Actualmente no se encontró ninguna VIVE CARD para esta cuenta.",

    status_error:
      "Se produjo un error.",

    need_login:
      "Debes iniciar sesión para editar esta tarjeta.",

    error_title:
      "Error",

    notice_title:
      "Aviso",

    no_phone_available:
      "No hay ningún número de teléfono disponible.",

    call_failed:
      "No se pudo marcar el número:",

    clear:
      "Borrar todo",

    logout:
      "Cerrar sesión",
  },

  en: {
    brand: "VIVE CARD",
    btn_emergency: "🆘 EMERGENCY",
    btn_logout: "↩︎ Logout",
    btn_edit: "Edit",
    btn_edit_active: "Editing active",
    btn_save: "Save",
    btn_clear: "Clear all",

    title:
      "Emergency information",

    subtitle:
      "Everything on one screen – fast for responders.",

    profile_id:
      "PROFILE ID",

    required:
      "Required",

    prio1:
      "Priority 1",

    critical:
      "critical",

    important:
      "important",

    ok:
      "ok",

    critical_title:
      "⚠️ Critical medical information",

    info_title:
      "ℹ️ Important information",

    contacts_title:
      "📞 Emergency contacts",

    docs_section_title:
      "📄 Emergency pass & documents",

    name_label:
      "👤 Full name",

    dob_label:
      "🎂 Date of birth",

    blood_label:
      "🩸 Blood group",

    allergies_label:
      "🧪 Allergies",

    thinner_label:
      "💊 Blood thinners",

    meds_label:
      "💉 Medications",

    vaccines_label:
      "✅ Vaccines",

    chronic_label:
      "🫀 Chronic conditions",

    organ_label:
      "🎗 Organ donation",

    notes_label:
      "📝 Notes / hints",

    emergency_country_label:
      "🌍 Country for emergency numbers",

    emergency_country_help:
      "This country determines the displayed emergency numbers.",

    country_ch: "Switzerland",
    country_de: "Germany",
    country_at: "Austria",
    country_it: "Italy",
    country_fr: "France",
    country_es: "Spain",

    emergency_notice:
      "Information entered by the card holder. No guarantee of completeness or accuracy. In case of doubt, follow standard medical procedures.",

    ec1_label:
      "Contact 1",

    ec2_label:
      "Contact 2",

    ec1_name_ph:
      "e.g. wife, brother, contact person",

    ec2_name_ph:
      "e.g. family doctor",

    call:
      "Call",

    name_ph:
      "Full name",

    dob_ph:
      "DD.MM.YYYY",

    allergies_ph:
      "e.g. penicillin, nickel",

    thinner_ph:
      "e.g. Eliquis",

    meds_ph:
      "e.g. insulin",

    chronic_ph:
      "e.g. asthma",

    organ_ph:
      "Yes / No / Unknown",

    notes_ph:
      "Notes for responders",

    last_update:
      "Last update:",

    status_ready:
      "Ready.",

    status_loading:
      "Loading…",

    status_saved:
      "Saved.",

    status_synced:
      "Synced.",

    status_cleared:
      "Cleared.",

    status_blocked:
      "This VIVE CARD has been blocked or disabled.",

    card_blocked_banner:
      "This VIVE CARD has been blocked or disabled and can no longer be edited.",

    card_status_check_failed:
      "Card status could not be checked:",

    login_banner:
      "You must be logged in to edit this card.",

    readonly_banner:
      "This card is shown in public emergency mode.",

    confirm_clear:
      "Really clear everything?",

    cancel:
      "Cancel",

    save:
      "Save",

    remove:
      "Remove",

    open:
      "Open",

    select_blood:
      "Select blood group",

    select_country:
      "Select country",

    select_language:
      "Select language",

    select_vaccine:
      "Select vaccine",

    custom_vaccine:
      "Enter vaccine manually",

    add:
      "+ Add",

    profile_image:
      "📷 Profile photo",

    profile_image_saved:
      "Profile photo saved.",

    profile_image_failed:
      "Profile photo could not be saved.",

    profile_image_max:
      "The profile photo may not exceed 5 MB.",

    library_title:
      "Library",

    library_permission_needed:
      "Please allow access to your photos.",

    camera_title:
      "Camera",

    camera_permission_needed:
      "Please allow camera access.",

    docs_upload_camera:
      "📸 Take photo",

    docs_upload_file:
      "📂 Upload file",

    docs_empty:
      "No documents added yet.",

    docs_loading:
      "Uploading document…",

    docs_saved:
      "Document saved.",

    docs_deleted:
      "Document deleted.",

    docs_load_failed:
      "Could not load documents.",

    docs_open_failed:
      "Could not open document.",

    docs_upload_failed:
      "Upload failed.",

    docs_invalid_type:
      "Only images or PDF files are allowed.",

    docs_file_too_large:
      "File is too large. Maximum: 10 MB.",

    docs_edit_only:
      "Documents can only be uploaded in edit mode.",

    docs_type_image:
      "Image",

    docs_type_file:
      "Document / PDF",

    docs_notice_single:
      "Attention: 1 additional medical document is available. Please open the document.",

    docs_notice_multi:
      "Attention: {count} additional medical documents are available. Please open the documents.",

    docs_overlay_title:
      "📄 Important documents",

    docs_default_name:
      "Document",

    rename:
      "✏️ Change label",

    rename_title:
      "New label",

    rename_placeholder:
      "Document name",

    rename_saved:
      "Label changed.",

    rename_invalid:
      "The label must contain 1 to 120 characters.",

    emergency_mode_title:
      "EMERGENCY MODE",

    emergency_mode_sub:
      "Critical data only – for responders",

    close:
      "✕ Close",

    call_emergency:
      "General emergency",

    call_medical:
      "Medical emergency",

    call_police:
      "Police",

    call_fire:
      "Fire department",

    emergency_hint:
      "Tip: 112 works across Europe. In Switzerland, 144 is the medical emergency service.",

    selected_country:
      "Selected country",

    general_emergency_number:
      "General emergency number",

    emergency_timeout:
      "The emergency view was closed automatically after 20 minutes for privacy reasons.",

    vaccines_emergency_title:
      "💉 Vaccines",

    emergency_contact_fallback_1:
      "☎️ Emergency contact 1",

    emergency_contact_fallback_2:
      "☎️ Emergency contact 2",

    no_card_title:
      "No card found",

    no_card_text:
      "No VIVE CARD was found for this account.",

    status_error:
      "An error occurred.",

    need_login:
      "You must be logged in to edit this card.",

    error_title:
      "Error",

    notice_title:
      "Notice",

    no_phone_available:
      "No phone number available.",

    call_failed:
      "Could not call number:",

    clear:
      "Clear all",

    logout:
      "Logout",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function isImageMime(
  mimeType?: string | null
) {
  return String(mimeType || "")
    .toLowerCase()
    .startsWith("image/");
}

function isPdfMime(
  mimeType?: string | null,
  fileName?: string | null
) {
  const mime = String(
    mimeType || ""
  ).toLowerCase();

  const name = String(
    fileName || ""
  ).toLowerCase();

  return (
    mime === "application/pdf" ||
    name.endsWith(".pdf")
  );
}

function formatFileSize(
  bytes?: number | null
) {
  if (!bytes) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function guessExtension(
  fileName?: string | null,
  mimeType?: string | null
) {
  const name = String(
    fileName || ""
  ).toLowerCase();

  if (name.includes(".")) {
    return (
      name.split(".").pop() ||
      "bin"
    );
  }

  const mime = String(
    mimeType || ""
  ).toLowerCase();

  if (mime === "image/jpeg")
    return "jpg";

  if (mime === "image/png")
    return "png";

  if (mime === "image/webp")
    return "webp";

  if (mime === "application/pdf")
    return "pdf";

  return "bin";
}

function normalizeTel(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .replace(/[^0-9+]/g, "");
}

function lineValue(
  value?: string | null,
  fallback = "—"
) {
  const clean = String(
    value || ""
  ).trim();

  return clean || fallback;
}

async function uriToArrayBuffer(
  uri: string
) {
  const response =
    await fetch(uri);

  return await response.arrayBuffer();
}

function getDocumentEmoji(
  doc: MedicalDocumentRow
) {
  if (isImageMime(doc.mime_type))
    return "🖼️";

  if (
    isPdfMime(
      doc.mime_type,
      doc.file_name
    )
  ) {
    return "📄";
  }

  return "📎";
}

function normalizeCountry(
  value?: string | null
): EmergencyCountry {
  const clean = String(
    value || ""
  )
    .trim()
    .toUpperCase();

  if (
    COUNTRY_OPTIONS.includes(
      clean as EmergencyCountry
    )
  ) {
    return clean as EmergencyCountry;
  }

  return DEFAULT_EMERGENCY_COUNTRY;
}

/* =========================================================
   CARD SCREEN
========================================================= */

export default function CardScreen({
  navigation,
}: any) {
  const [lang, setLang] =
    useState<LangKey>("de");

  const T = useCallback(
    (key: string) =>
      I18N[lang]?.[key] ||
      I18N.en[key] ||
      key,
    [lang]
  );

  /* =====================
     MAIN STATE
  ===================== */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editable, setEditable] =
    useState(false);

  const [blocked, setBlocked] =
    useState(false);

  const [statusText, setStatusText] =
    useState("");

  const [
    statusKind,
    setStatusKind,
  ] = useState<StatusKind>("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [card, setCard] =
    useState<CardRow | null>(null);

  const [profile, setProfile] =
    useState<EmergencyCardRow | null>(
      null
    );

  const [form, setForm] =
    useState<AppProfileFormValues>({
      ...initialProfileForm,
      emergencyCountry:
        DEFAULT_EMERGENCY_COUNTRY,
    });

  /* =====================
     PICKERS / MODALS
  ===================== */

  const [
    langPickerVisible,
    setLangPickerVisible,
  ] = useState(false);

  const [
    bloodPickerVisible,
    setBloodPickerVisible,
  ] = useState(false);

  const [
    countryPickerVisible,
    setCountryPickerVisible,
  ] = useState(false);

  const [
    emergencyCountryPickerVisible,
    setEmergencyCountryPickerVisible,
  ] = useState(false);

  const [
    vaccinePickerVisible,
    setVaccinePickerVisible,
  ] = useState(false);

  const [
    customVaccine,
    setCustomVaccine,
  ] = useState("");

  const [
    vaccinesEmergencyOpen,
    setVaccinesEmergencyOpen,
  ] = useState(false);

  /* =====================
     PROFILE IMAGE
  ===================== */

  const [
    profileImageUploading,
    setProfileImageUploading,
  ] = useState(false);

  const [
    profileImageUrl,
    setProfileImageUrl,
  ] = useState<string | null>(
    null
  );

  /* =====================
     DOCUMENTS
  ===================== */

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    docsLoading,
    setDocsLoading,
  ] = useState(false);

  const [
    documents,
    setDocuments,
  ] = useState<
    MedicalDocumentViewRow[]
  >([]);

  const [
    renameDocumentItem,
    setRenameDocumentItem,
  ] =
    useState<MedicalDocumentViewRow | null>(
      null
    );

  const [
    renameValue,
    setRenameValue,
  ] = useState("");

  const [
    renameSaving,
    setRenameSaving,
  ] = useState(false);

  /* =====================
     EMERGENCY
  ===================== */

  const [
    emergencyVisible,
    setEmergencyVisible,
  ] = useState(false);

  const [
    emergencyCountry,
    setEmergencyCountry,
  ] =
    useState<EmergencyCountry>(
      DEFAULT_EMERGENCY_COUNTRY
    );

  const emergencyTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* =====================================================
     STATUS
  ===================================================== */

  const setStatus = useCallback(
    (
      text: string,
      kind: StatusKind = ""
    ) => {
      setStatusText(text);
      setStatusKind(kind);
    },
    []
  );

  /* =====================================================
     FORM HELPERS
  ===================================================== */

  const setField = useCallback(
    (
      key: keyof AppProfileFormValues,
      value: string
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const selectedVaccines =
    useMemo(() => {
      return String(
        form.vaccines || ""
      )
        .split("\n")
        .map((value) =>
          value.trim()
        )
        .filter(Boolean);
    }, [form.vaccines]);

  const selectedCountry =
    useMemo(
      () =>
        normalizeCountry(
          form.emergencyCountry
        ),
      [form.emergencyCountry]
    );

  const emergencyNumbers =
    useMemo(
      () =>
        EMERGENCY_NUMBERS[
          emergencyCountry
        ],
      [emergencyCountry]
    );

  /* =====================================================
     PROFILE IMAGE
  ===================================================== */

  const loadProfileImage =
    useCallback(
      async (
        filePath?: string | null
      ) => {
        if (!filePath) {
          setProfileImageUrl(null);
          return;
        }

        /*
          Web verwendet getPublicUrl().
          Für die App verwenden wir weiterhin
          eine Signed URL, damit auch private
          Buckets funktionieren.
        */
        const {
          data,
          error,
        } =
          await supabase.storage
            .from("profile-images")
            .createSignedUrl(
              filePath,
              60 * 60
            );

        if (
          error ||
          !data?.signedUrl
        ) {
          setProfileImageUrl(null);
          return;
        }

        setProfileImageUrl(
          data.signedUrl
        );
      },
      []
    );

  /* =====================================================
     CARD BLOCK CHECK
  ===================================================== */

  const checkCardBlocked =
    useCallback(
      async (
        publicId?: string | null
      ) => {
        if (!publicId) {
          return false;
        }

        const {
          data,
          error,
        } = await supabase
          .from("cards")
          .select(
            "id, public_id, status, blocked_at"
          )
          .eq(
            "public_id",
            publicId
          )
          .maybeSingle();

        if (error) {
          throw new Error(
            `${T(
              "card_status_check_failed"
            )} ${error.message}`
          );
        }

        return (
          String(
            data?.status || ""
          ) === "blocked" ||
          !!data?.blocked_at
        );
      },
      [T]
    );

  /* =====================================================
     DOCUMENTS
  ===================================================== */

  const loadDocuments =
    useCallback(
      async (
        publicId?: string | null
      ) => {
        if (!publicId) {
          setDocuments([]);
          return;
        }

        try {
          setDocsLoading(true);

          const {
            data,
            error,
          } = await supabase
            .from(
              "medical_documents"
            )
            .select(
              "id, owner_id, public_id, file_name, file_path, mime_type, file_size, created_at"
            )
            .eq(
              "public_id",
              publicId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

          if (error) {
            throw new Error(
              `${T(
                "docs_load_failed"
              )} ${error.message}`
            );
          }

          const rows =
            (data ||
              []) as MedicalDocumentRow[];

          const withPreview =
            await Promise.all(
              rows.map(
                async (doc) => {
                  if (
                    !isImageMime(
                      doc.mime_type
                    )
                  ) {
                    return {
                      ...doc,
                      preview_url:
                        null,
                    };
                  }

                  const {
                    data:
                      signedData,
                  } =
                    await supabase.storage
                      .from(
                        "medical-docs"
                      )
                      .createSignedUrl(
                        doc.file_path,
                        60 * 10
                      );

                  return {
                    ...doc,
                    preview_url:
                      signedData?.signedUrl ||
                      null,
                  };
                }
              )
            );

          setDocuments(
            withPreview
          );
        } catch (error: any) {
          setStatus(
            error?.message ||
              T("docs_load_failed"),
            "err"
          );
        } finally {
          setDocsLoading(false);
        }
      },
      [T, setStatus]
    );

  /* =====================================================
     DATA LOAD
  ===================================================== */

  const loadData =
    useCallback(async () => {
      setStatus(
        T("status_loading")
      );

      const result =
        await getCurrentUserCardProfile();

      setUserId(
        result.user?.id || null
      );

      setCard(
        result.card || null
      );

      setProfile(
        result.profile || null
      );

      const mapped =
        (mapEmergencyDataToForm(
          result.profile
        ) ??
          initialProfileForm) as AppProfileFormValues;

      const mappedCountry =
        normalizeCountry(
          mapped.emergencyCountry
        );

      const nextForm: AppProfileFormValues =
        {
          ...mapped,
          emergencyCountry:
            mappedCountry,
        };

      setForm(nextForm);

      setEmergencyCountry(
        mappedCountry
      );

      await loadProfileImage(
        nextForm.profileImagePath
      );

      if (
        result.card?.public_id
      ) {
        const isBlocked =
          await checkCardBlocked(
            result.card.public_id
          );

        setBlocked(isBlocked);

        if (isBlocked) {
          setEditable(false);

          setStatus(
            T("status_blocked"),
            "err"
          );
        } else {
          setStatus(
            T("status_ready")
          );
        }

        await loadDocuments(
          result.card.public_id
        );
      } else {
        setDocuments([]);
      }
    }, [
      T,
      checkCardBlocked,
      loadDocuments,
      loadProfileImage,
      setStatus,
    ]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (error: any) {
        setStatus(
          error?.message ||
            T("status_error"),
          "err"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [
    loadData,
    setStatus,
    T,
  ]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const onRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);
        await loadData();
      } catch (error: any) {
        setStatus(
          error?.message ||
            T("status_error"),
          "err"
        );
      } finally {
        setRefreshing(false);
      }
    }, [
      loadData,
      setStatus,
      T,
    ]);

  /* =====================================================
     REALTIME
  ===================================================== */

  useCardRealtime({
    publicId:
      card?.public_id ||
      null,

    ownerUserId:
      userId,

    enabled:
      !loading,

    onChange:
      loadData,
  });

  /* =====================================================
     SORT DOCUMENTS
  ===================================================== */

  const sortedDocuments =
    useMemo(() => {
      return [
        ...documents,
      ].sort((a, b) => {
        const da =
          new Date(
            a.created_at || 0
          ).getTime();

        const db =
          new Date(
            b.created_at || 0
          ).getTime();

        return db - da;
      });
    }, [documents]);

  /* =====================================================
     VACCINES
  ===================================================== */

  const addVaccine =
    useCallback(
      (name: string) => {
        const clean =
          name.trim();

        if (!clean) return;

        const exists =
          selectedVaccines.some(
            (item) =>
              item.toLowerCase() ===
              clean.toLowerCase()
          );

        if (!exists) {
          setField(
            "vaccines",
            [
              ...selectedVaccines,
              clean,
            ].join("\n")
          );
        }

        setCustomVaccine("");
        setVaccinePickerVisible(
          false
        );
      },
      [
        selectedVaccines,
        setField,
      ]
    );

  const removeVaccine =
    useCallback(
      (name: string) => {
        setField(
          "vaccines",
          selectedVaccines
            .filter(
              (item) =>
                item !== name
            )
            .join("\n")
        );
      },
      [
        selectedVaccines,
        setField,
      ]
    );

  /* =====================================================
     PROFILE IMAGE UPLOAD
  ===================================================== */

  const chooseProfileImage =
    async () => {
      if (
        !editable ||
        !card?.public_id ||
        !userId ||
        blocked
      ) {
        return;
      }

      try {
        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            T("library_title"),
            T(
              "library_permission_needed"
            )
          );

          return;
        }

        const result =
          await ImagePicker
            .launchImageLibraryAsync(
              {
                mediaTypes:
                  ImagePicker
                    .MediaTypeOptions
                    .Images,

                allowsEditing: true,

                aspect: [
                  1,
                  1,
                ],

                quality: 0.82,
              }
            );

        if (result.canceled)
          return;

        const asset =
          result.assets?.[0];

        if (!asset?.uri)
          return;

        if (
          asset.fileSize &&
          asset.fileSize >
            MAX_PROFILE_IMAGE_SIZE
        ) {
          throw new Error(
            T("profile_image_max")
          );
        }

        setProfileImageUploading(
          true
        );

        const mimeType =
          asset.mimeType ||
          "image/jpeg";

        const ext =
          guessExtension(
            asset.fileName ||
              "profile.jpg",
            mimeType
          );

        const newPath =
          `${userId}/` +
          `${card.public_id}/` +
          `profile-${Date.now()}.${ext}`;

        const bytes =
          await uriToArrayBuffer(
            asset.uri
          );

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              "profile-images"
            )
            .upload(
              newPath,
              bytes,
              {
                contentType:
                  mimeType,

                upsert: false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const nextForm: AppProfileFormValues =
          {
            ...form,
            profileImagePath:
              newPath,
          };

        try {
          await saveCurrentUserCardProfile(
            card,
            userId,
            nextForm
          );
        } catch (
          saveError
        ) {
          await supabase.storage
            .from(
              "profile-images"
            )
            .remove([
              newPath,
            ]);

          throw saveError;
        }

        const oldPath =
          form.profileImagePath;

        setForm(nextForm);

        await loadProfileImage(
          newPath
        );

        if (
          oldPath &&
          oldPath !== newPath
        ) {
          await supabase.storage
            .from(
              "profile-images"
            )
            .remove([
              oldPath,
            ]);
        }

        setStatus(
          T(
            "profile_image_saved"
          ),
          "ok"
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T(
              "profile_image_failed"
            ),
          "err"
        );
      } finally {
        setProfileImageUploading(
          false
        );
      }
    };

  /* =====================================================
     EDIT MODE
  ===================================================== */

  const toggleEdit =
    async () => {
      if (!card?.public_id)
        return;

      try {
        const isBlocked =
          await checkCardBlocked(
            card.public_id
          );

        if (isBlocked) {
          setBlocked(true);
          setEditable(false);

          setStatus(
            T("status_blocked"),
            "err"
          );

          return;
        }

        const {
          data:
            sessionData,
        } =
          await supabase.auth
            .getSession();

        if (
          !sessionData
            ?.session
        ) {
          setStatus(
            T("need_login"),
            "warn"
          );

          return;
        }

        const next =
          !editable;

        setEditable(next);

        setStatus(
          next
            ? T(
                "btn_edit_active"
              )
            : T(
                "status_ready"
              ),
          next
            ? "warn"
            : ""
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T("status_error"),
          "err"
        );
      }
    };

  /* =====================================================
     SAVE PROFILE
  ===================================================== */

  const saveProfile =
    async () => {
      try {
        if (
          !card ||
          !userId
        ) {
          return;
        }

        const isBlocked =
          await checkCardBlocked(
            card.public_id
          );

        if (isBlocked) {
          setBlocked(true);
          setEditable(false);

          setStatus(
            T("status_blocked"),
            "err"
          );

          return;
        }

        setSaving(true);

        const payload: AppProfileFormValues =
          {
            ...form,

            emergencyCountry:
              normalizeCountry(
                form.emergencyCountry
              ),
          };

        await saveCurrentUserCardProfile(
          card,
          userId,
          payload
        );

        setEditable(false);

        await loadData();

        setStatus(
          T("status_synced"),
          "ok"
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T("status_error"),
          "err"
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     CLEAR PROFILE
  ===================================================== */

  const clearAll =
    async () => {
      Alert.alert(
        T("btn_clear"),
        T("confirm_clear"),
        [
          {
            text:
              T("cancel"),

            style:
              "cancel",
          },

          {
            text:
              T("btn_clear"),

            style:
              "destructive",

            onPress:
              async () => {
                try {
                  if (
                    !card ||
                    !userId
                  ) {
                    return;
                  }

                  const isBlocked =
                    await checkCardBlocked(
                      card.public_id
                    );

                  if (
                    isBlocked
                  ) {
                    setBlocked(
                      true
                    );

                    setEditable(
                      false
                    );

                    setStatus(
                      T(
                        "status_blocked"
                      ),
                      "err"
                    );

                    return;
                  }

                  setSaving(
                    true
                  );

                  const emptyForm: AppProfileFormValues =
                    {
                      ...initialProfileForm,

                      emergencyCountry:
                        DEFAULT_EMERGENCY_COUNTRY,

                      profileImagePath:
                        "",
                    };

                  await saveCurrentUserCardProfile(
                    card,
                    userId,
                    emptyForm
                  );

                  setForm(
                    emptyForm
                  );

                  setProfileImageUrl(
                    null
                  );

                  setEditable(
                    false
                  );

                  await loadData();

                  setStatus(
                    T(
                      "status_cleared"
                    ),
                    "ok"
                  );
                } catch (
                  error: any
                ) {
                  setStatus(
                    error?.message ||
                      T(
                        "status_error"
                      ),
                    "err"
                  );
                } finally {
                  setSaving(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  /* =====================================================
     DOCUMENT RENAME
  ===================================================== */

  const saveDocumentRename =
    async () => {
      const cleanName =
        renameValue.trim();

      if (
        !renameDocumentItem ||
        cleanName.length < 1 ||
        cleanName.length > 120
      ) {
        setStatus(
          T("rename_invalid"),
          "warn"
        );

        return;
      }

      try {
        setRenameSaving(true);

        const {
          error,
        } = await supabase
          .from(
            "medical_documents"
          )
          .update({
            file_name:
              cleanName,
          })
          .eq(
            "id",
            renameDocumentItem.id
          )
          .eq(
            "public_id",
            renameDocumentItem.public_id
          );

        if (error) {
          throw error;
        }

        setRenameDocumentItem(
          null
        );

        setRenameValue("");

        await loadDocuments(
          card?.public_id ||
            null
        );

        setStatus(
          T("rename_saved"),
          "ok"
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T("status_error"),
          "err"
        );
      } finally {
        setRenameSaving(
          false
        );
      }
    };

  /* =====================================================
     DOCUMENT OPEN
  ===================================================== */

  const openDocument =
    async (
      doc: MedicalDocumentViewRow
    ) => {
      try {
        const {
          data,
          error,
        } =
          await supabase.storage
            .from(
              "medical-docs"
            )
            .createSignedUrl(
              doc.file_path,
              60 * 20
            );

        if (
          error ||
          !data?.signedUrl
        ) {
          throw new Error(
            T(
              "docs_open_failed"
            )
          );
        }

        /*
          Vorhandenen DocumentViewer
          weiterhin verwenden.
        */
        if (
          navigation?.navigate
        ) {
          navigation.navigate(
            "DocumentViewer",
            {
              doc: {
                id:
                  doc.id,

                file_name:
                  doc.file_name ||
                  T(
                    "docs_default_name"
                  ),

                file_path:
                  doc.file_path,

                mime_type:
                  doc.mime_type ||
                  "",

                signed_url:
                  data.signedUrl,
              },
            }
          );

          return;
        }

        await Linking.openURL(
          data.signedUrl
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T(
              "docs_open_failed"
            ),
          "err"
        );
      }
    };

  /* =====================================================
     DELETE DOCUMENT
  ===================================================== */

  const deleteDocument =
    async (
      doc: MedicalDocumentViewRow
    ) => {
      Alert.alert(
        T("remove"),

        `${
          doc.file_name ||
          T(
            "docs_default_name"
          )
        }?`,

        [
          {
            text:
              T("cancel"),

            style:
              "cancel",
          },

          {
            text:
              T("remove"),

            style:
              "destructive",

            onPress:
              async () => {
                try {
                  const {
                    error:
                      storageError,
                  } =
                    await supabase.storage
                      .from(
                        "medical-docs"
                      )
                      .remove([
                        doc.file_path,
                      ]);

                  if (
                    storageError
                  ) {
                    throw storageError;
                  }

                  const {
                    error:
                      dbError,
                  } =
                    await supabase
                      .from(
                        "medical_documents"
                      )
                      .delete()
                      .eq(
                        "id",
                        doc.id
                      )
                      .eq(
                        "public_id",
                        doc.public_id
                      );

                  if (
                    dbError
                  ) {
                    throw dbError;
                  }

                  await loadDocuments(
                    card?.public_id ||
                      null
                  );

                  setStatus(
                    T(
                      "docs_deleted"
                    ),
                    "ok"
                  );
                } catch (
                  error: any
                ) {
                  setStatus(
                    error?.message ||
                      T(
                        "status_error"
                      ),
                    "err"
                  );
                }
              },
          },
        ]
      );
    };

  /* =====================================================
     FILE UPLOAD
  ===================================================== */

  const uploadFileToSupabase =
    async (params: {
      uri: string;
      fileName: string;
      mimeType: string;
      fileSize?: number | null;
    }) => {
      if (
        !card?.public_id ||
        !userId
      ) {
        throw new Error(
          T("need_login")
        );
      }

      if (
        params.fileSize &&
        params.fileSize >
          MAX_DOCUMENT_SIZE
      ) {
        throw new Error(
          T(
            "docs_file_too_large"
          )
        );
      }

      const allowed =
        params.mimeType
          .toLowerCase()
          .startsWith(
            "image/"
          ) ||
        params.mimeType ===
          "application/pdf";

      if (!allowed) {
        throw new Error(
          T(
            "docs_invalid_type"
          )
        );
      }

      const ext =
        guessExtension(
          params.fileName,
          params.mimeType
        );

      const uniqueName =
        `${Date.now()}-` +
        `${Math.random()
          .toString(36)
          .slice(2)}.` +
        ext;

      const filePath =
        `${userId}/` +
        `${card.public_id}/` +
        uniqueName;

      const arrayBuffer =
        await uriToArrayBuffer(
          params.uri
        );

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "medical-docs"
          )
          .upload(
            filePath,
            arrayBuffer,
            {
              contentType:
                params.mimeType ||
                "application/octet-stream",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          `${T(
            "docs_upload_failed"
          )} ${uploadError.message}`
        );
      }

      const {
        error:
          insertError,
      } = await supabase
        .from(
          "medical_documents"
        )
        .insert({
          owner_id:
            userId,

          public_id:
            card.public_id,

          file_name:
            params.fileName ||
            T(
              "docs_default_name"
            ),

          file_path:
            filePath,

          mime_type:
            params.mimeType ||
            "application/octet-stream",

          file_size:
            params.fileSize ||
            null,
        });

      if (
        insertError
      ) {
        /*
          Datei wieder löschen,
          wenn DB-Eintrag fehlschlägt.
        */
        await supabase.storage
          .from(
            "medical-docs"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          insertError.message
        );
      }

      await loadDocuments(
        card.public_id
      );
    };

  /* =====================================================
     CAMERA DOCUMENT
  ===================================================== */

  const handleTakePhoto =
    async () => {
      try {
        if (
          !editable ||
          blocked
        ) {
          setStatus(
            T(
              "docs_edit_only"
            ),
            "warn"
          );

          return;
        }

        const permission =
          await ImagePicker
            .requestCameraPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            T("camera_title"),
            T(
              "camera_permission_needed"
            )
          );

          return;
        }

        const result =
          await ImagePicker
            .launchCameraAsync(
              {
                mediaTypes:
                  ImagePicker
                    .MediaTypeOptions
                    .Images,

                quality:
                  0.82,
              }
            );

        if (
          result.canceled
        ) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset?.uri)
          return;

        setUploading(true);

        setStatus(
          T(
            "docs_loading"
          ),
          "warn"
        );

        await uploadFileToSupabase(
          {
            uri:
              asset.uri,

            fileName:
              asset.fileName ||
              `camera-${Date.now()}.jpg`,

            mimeType:
              asset.mimeType ||
              "image/jpeg",

            fileSize:
              asset.fileSize ||
              null,
          }
        );

        setStatus(
          T("docs_saved"),
          "ok"
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T(
              "docs_upload_failed"
            ),
          "err"
        );
      } finally {
        setUploading(false);
      }
    };

  /* =====================================================
     DOCUMENT PICKER
     entspricht "Datei hochladen"
  ===================================================== */

  const handlePickDocument =
    async () => {
      try {
        if (
          !editable ||
          blocked
        ) {
          setStatus(
            T(
              "docs_edit_only"
            ),
            "warn"
          );

          return;
        }

        const result =
          await DocumentPicker
            .getDocumentAsync(
              {
                type: [
                  "image/*",
                  "application/pdf",
                ],

                copyToCacheDirectory:
                  true,

                multiple:
                  false,
              }
            );

        if (
          result.canceled
        ) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset?.uri)
          return;

        const mimeType =
          asset.mimeType ||
          (
            asset.name
              ?.toLowerCase()
              .endsWith(
                ".pdf"
              )
              ? "application/pdf"
              : "application/octet-stream"
          );

        if (
          asset.size &&
          asset.size >
            MAX_DOCUMENT_SIZE
        ) {
          throw new Error(
            T(
              "docs_file_too_large"
            )
          );
        }

        setUploading(true);

        setStatus(
          T(
            "docs_loading"
          ),
          "warn"
        );

        await uploadFileToSupabase(
          {
            uri:
              asset.uri,

            fileName:
              asset.name ||
              T(
                "docs_default_name"
              ),

            mimeType,

            fileSize:
              asset.size ||
              null,
          }
        );

        setStatus(
          T("docs_saved"),
          "ok"
        );
      } catch (error: any) {
        setStatus(
          error?.message ||
            T(
              "docs_upload_failed"
            ),
          "err"
        );
      } finally {
        setUploading(false);
      }
    };

  /* =====================================================
     CALL
  ===================================================== */

  const callNumber =
    async (
      number?: string | null
    ) => {
      const clean =
        normalizeTel(number);

      if (!clean) {
        Alert.alert(
          T("notice_title"),
          T(
            "no_phone_available"
          )
        );

        return;
      }

      try {
        await Linking.openURL(
          `tel:${clean}`
        );
      } catch {
        Alert.alert(
          T("error_title"),
          `${T(
            "call_failed"
          )} ${clean}`
        );
      }
    };

  /* =====================================================
     EMERGENCY MODE
  ===================================================== */

  const clearEmergencyTimer =
    useCallback(() => {
      if (
        emergencyTimerRef.current
      ) {
        clearTimeout(
          emergencyTimerRef.current
        );

        emergencyTimerRef.current =
          null;
      }
    }, []);

  const closeEmergencyMode =
    useCallback(
      (
        automatic = false
      ) => {
        clearEmergencyTimer();

        setEmergencyVisible(
          false
        );

        setVaccinesEmergencyOpen(
          false
        );

        if (
          automatic
        ) {
          Alert.alert(
            T(
              "emergency_mode_title"
            ),
            T(
              "emergency_timeout"
            )
          );
        }
      },
      [
        clearEmergencyTimer,
        T,
      ]
    );

  const openEmergencyMode =
    useCallback(() => {
      const initialCountry =
        normalizeCountry(
          form.emergencyCountry
        );

      setEmergencyCountry(
        initialCountry
      );

      setEmergencyVisible(
        true
      );

      clearEmergencyTimer();

      emergencyTimerRef.current =
        setTimeout(
          () => {
            closeEmergencyMode(
              true
            );
          },
          EMERGENCY_TIMEOUT_MS
        );
    }, [
      form.emergencyCountry,
      clearEmergencyTimer,
      closeEmergencyMode,
    ]);

  useEffect(() => {
    return () => {
      clearEmergencyTimer();
    };
  }, [
    clearEmergencyTimer,
  ]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout =
    async () => {
      try {
        /*
          Web aktualisiert vor Logout
          updated_at.

          Dasselbe übernehmen wir hier.
        */
        if (
          card?.public_id &&
          userId
        ) {
          await supabase
            .from(
              "emergency_cards"
            )
            .update({
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "public_id",
              card.public_id
            )
            .eq(
              "owner_id",
              userId
            );
        }
      } catch {}

      try {
        await supabase.auth
          .signOut();
      } catch {}

      /*
        Falls dein Navigator Auth automatisch
        überwacht, reicht signOut().
        Ansonsten:
      */
      try {
        navigation?.reset?.({
          index: 0,
          routes: [
            {
              name:
                "Login",
            },
          ],
        });
      } catch {}
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <View
        style={
          styles.loadingWrap
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.danger
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          {T(
            "status_loading"
          )}
        </Text>
      </View>
    );
  }

  /* =====================================================
     NO CARD
  ===================================================== */

  if (!card) {
    return (
      <View
        style={
          styles.emptyWrap
        }
      >
        <Text
          style={
            styles.emptyTitle
          }
        >
          {T(
            "no_card_title"
          )}
        </Text>

        <Text
          style={
            styles.emptyText
          }
        >
          {T(
            "no_card_text"
          )}
        </Text>
      </View>
    );
  }

  /* =====================================================
     DOCUMENT NOTICE
  ===================================================== */

  const docsNotice =
    sortedDocuments.length === 1
      ? T(
          "docs_notice_single"
        )
      : T(
          "docs_notice_multi"
        ).replace(
          "{count}",
          String(
            sortedDocuments.length
          )
        );

  /* =====================================================
     COUNTRY DISPLAY
  ===================================================== */

  const countryName =
    T(
      `country_${selectedCountry.toLowerCase()}`
    );

  const emergencyCountryName =
    T(
      `country_${emergencyCountry.toLowerCase()}`
    );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <SafeAreaView
      style={styles.safe}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      {/* =================================================
          TOPBAR
      ================================================= */}

      <View
        style={
          styles.topbar
        }
      >
        <View
          style={
            styles.topbarTopRow
          }
        >
          <View
            style={
              styles.brandWrap
            }
          >
            <View
              style={
                styles.brandMark
              }
            >
              <Text
                style={
                  styles.brandMarkText
                }
              >
                V
              </Text>
            </View>

            <Text
              style={
                styles.brandText
              }
            >
              VIVE CARD
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.langSelect
            }
            onPress={() =>
              setLangPickerVisible(
                true
              )
            }
          >
            <Text
              style={
                styles.langSelectText
              }
            >
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.topButtonsRow
          }
        >
          <TouchableOpacity
            style={[
              styles.topBtn,
              styles.topBtnSoft,
              blocked &&
                styles.buttonDisabled,
            ]}
            disabled={blocked}
            onPress={
              toggleEdit
            }
          >
            <Text
              style={
                styles.topBtnDarkText
              }
              numberOfLines={1}
            >
              {editable
                ? T(
                    "btn_edit_active"
                  )
                : T(
                    "btn_edit"
                  )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.topBtn,
              styles.topBtnSave,
              (!editable ||
                saving ||
                blocked) &&
                styles.buttonDisabled,
            ]}
            disabled={
              !editable ||
              saving ||
              blocked
            }
            onPress={
              saveProfile
            }
          >
            <Text
              style={
                styles.topBtnWhiteText
              }
              numberOfLines={1}
            >
              {saving
                ? "…"
                : T(
                    "btn_save"
                  )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.topBtn,
              styles.topBtnEmergency,
              blocked &&
                styles.buttonDisabled,
            ]}
            disabled={blocked}
            onPress={
              openEmergencyMode
            }
          >
            <Text
              style={
                styles.topBtnWhiteText
              }
              numberOfLines={1}
            >
              {T(
                "btn_emergency"
              )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.topBtn,
              styles.topBtnWhite,
            ]}
            onPress={
              logout
            }
          >
            <Text
              style={
                styles.topBtnDarkText
              }
              numberOfLines={1}
            >
              {T(
                "btn_logout"
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          MAIN SCROLL
      ================================================= */}

      <ScrollView
        style={
          styles.screen
        }
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
          />
        }
      >
        {blocked ? (
          <View
            style={
              styles.blockedBanner
            }
          >
            <Text
              style={
                styles.blockedBannerText
              }
            >
              {T(
                "card_blocked_banner"
              )}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.cardWrap
          }
        >
          {/* =============================================
              HEADLINE
          ============================================= */}

          <View
            style={
              styles.headline
            }
          >
            <View
              style={
                styles.profileHead
              }
            >
              <View
                style={
                  styles.profileImageWrap
                }
              >
                <View
                  style={
                    styles.profileImageCircle
                  }
                >
                  {profileImageUrl ? (
                    <Image
                      source={{
                        uri:
                          profileImageUrl,
                      }}
                      style={
                        styles.profileImage
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.profileImagePlaceholder
                      }
                    >
                      👤
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.profileImageButton,

                    (!editable ||
                      profileImageUploading ||
                      blocked) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={
                    chooseProfileImage
                  }
                  disabled={
                    !editable ||
                    profileImageUploading ||
                    blocked
                  }
                >
                  <Text
                    style={
                      styles.profileImageButtonText
                    }
                  >
                    {profileImageUploading
                      ? "…"
                      : T(
                          "profile_image"
                        )}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Text
                  style={
                    styles.headlineTitle
                  }
                >
                  {T(
                    "title"
                  )}
                </Text>

                <Text
                  style={
                    styles.headlineSub
                  }
                >
                  {T(
                    "subtitle"
                  )}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.pidBox
              }
            >
              <Text
                style={
                  styles.pidLabel
                }
              >
                {T(
                  "profile_id"
                )}
              </Text>

              <Text
                style={
                  styles.pidValue
                }
              >
                {
                  card.public_id
                }
              </Text>
            </View>
          </View>

          {/* =============================================
              NAME + DOB
          ============================================= */}

          <View
            style={
              styles.twoColumnRow
            }
          >
            <FieldBox
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "name_label"
                  )
                }
                chip={
                  T(
                    "required"
                  )
                }
              />

              <TextInput
                style={[
                  styles.input,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.name
                }
                editable={
                  editable &&
                  !blocked
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "name",
                    value
                  )
                }
                placeholder={
                  T(
                    "name_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>

            <FieldBox
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "dob_label"
                  )
                }
                chip={
                  T(
                    "required"
                  )
                }
              />

              <TextInput
                style={[
                  styles.input,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.dob
                }
                editable={
                  editable &&
                  !blocked
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "dob",
                    value
                  )
                }
                placeholder={
                  T(
                    "dob_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>
          </View>

          {/* =============================================
              BLOOD GROUP
          ============================================= */}

          <FieldBox>
            <FieldLabel
              title={
                T(
                  "blood_label"
                )
              }
              chip={
                T(
                  "prio1"
                )
              }
              chipVariant="warn"
            />

            <TouchableOpacity
              activeOpacity={
                editable
                  ? 0.75
                  : 1
              }
              style={[
                styles.selectLike,

                !editable &&
                  styles.inputDisabled,
              ]}
              disabled={
                !editable ||
                blocked
              }
              onPress={() =>
                setBloodPickerVisible(
                  true
                )
              }
            >
              <Text
                style={
                  styles.selectLikeText
                }
              >
                {lineValue(
                  form.blood
                )}
              </Text>

              <Text
                style={
                  styles.selectArrow
                }
              >
                ▼
              </Text>
            </TouchableOpacity>
          </FieldBox>

          {/* =============================================
              EMERGENCY COUNTRY
          ============================================= */}

          <FieldBox>
            <FieldLabel
              title={
                T(
                  "emergency_country_label"
                )
              }
              chip={
                T(
                  "important"
                )
              }
              chipVariant="warn"
            />

            <TouchableOpacity
              style={[
                styles.selectLike,

                !editable &&
                  styles.inputDisabled,
              ]}
              disabled={
                !editable ||
                blocked
              }
              onPress={() =>
                setCountryPickerVisible(
                  true
                )
              }
            >
              <Text
                style={
                  styles.selectLikeText
                }
              >
                {countryName}
              </Text>

              <Text
                style={
                  styles.selectArrow
                }
              >
                ▼
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.fieldHelp
              }
            >
              {T(
                "emergency_country_help"
              )}
            </Text>
          </FieldBox>

          {/* =============================================
              CRITICAL
          ============================================= */}

          <SectionTitle
            title={
              T(
                "critical_title"
              )
            }
          />

          <View
            style={
              styles.twoColumnRow
            }
          >
            <FieldBox
              variant="crit"
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "allergies_label"
                  )
                }
                chip={
                  T(
                    "critical"
                  )
                }
                chipVariant="crit"
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textarea,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.allergies
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "allergies",
                    value
                  )
                }
                editable={
                  editable &&
                  !blocked
                }
                multiline
                placeholder={
                  T(
                    "allergies_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>

            <FieldBox
              variant="crit"
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "thinner_label"
                  )
                }
                chip={
                  T(
                    "critical"
                  )
                }
                chipVariant="crit"
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textarea,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.bloodThinner
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "bloodThinner",
                    value
                  )
                }
                editable={
                  editable &&
                  !blocked
                }
                multiline
                placeholder={
                  T(
                    "thinner_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>
          </View>

          <View
            style={
              styles.twoColumnRow
            }
          >
            <FieldBox
              variant="warn"
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "meds_label"
                  )
                }
                chip={
                  T(
                    "important"
                  )
                }
                chipVariant="warn"
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textarea,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.meds
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "meds",
                    value
                  )
                }
                editable={
                  editable &&
                  !blocked
                }
                multiline
                placeholder={
                  T(
                    "meds_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>

            {/* =========================================
                VACCINES
            ========================================= */}

            <FieldBox
              variant="ok"
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "vaccines_label"
                  )
                }
                chip={
                  T("ok")
                }
                chipVariant="ok"
              />

              <TouchableOpacity
                style={[
                  styles.selectLike,

                  !editable &&
                    styles.inputDisabled,
                ]}
                disabled={
                  !editable ||
                  blocked
                }
                onPress={() =>
                  setVaccinePickerVisible(
                    true
                  )
                }
              >
                <Text
                  style={
                    styles.selectLikeText
                  }
                >
                  {T(
                    "select_vaccine"
                  )}
                </Text>

                <Text
                  style={
                    styles.selectArrow
                  }
                >
                  ▼
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles.vaccineInputRow
                }
              >
                <TextInput
                  style={[
                    styles.input,
                    styles.vaccineInput,

                    !editable &&
                      styles.inputDisabled,
                  ]}
                  value={
                    customVaccine
                  }
                  onChangeText={
                    setCustomVaccine
                  }
                  editable={
                    editable &&
                    !blocked
                  }
                  placeholder={
                    T(
                      "custom_vaccine"
                    )
                  }
                  placeholderTextColor={
                    "#8a8f93"
                  }
                  returnKeyType="done"
                  onSubmitEditing={() =>
                    addVaccine(
                      customVaccine
                    )
                  }
                />

                <TouchableOpacity
                  style={[
                    styles.vaccineAddButton,

                    (!editable ||
                      blocked) &&
                      styles.buttonDisabled,
                  ]}
                  disabled={
                    !editable ||
                    blocked
                  }
                  onPress={() =>
                    addVaccine(
                      customVaccine
                    )
                  }
                >
                  <Text
                    style={
                      styles.vaccineAddButtonText
                    }
                  >
                    {T("add")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.vaccinesList
                }
              >
                {selectedVaccines.map(
                  (
                    vaccine
                  ) => (
                    <View
                      key={
                        vaccine
                      }
                      style={
                        styles.vaccineItem
                      }
                    >
                      <Text
                        style={
                          styles.vaccineItemText
                        }
                      >
                        {
                          vaccine
                        }
                      </Text>

                      {editable &&
                      !blocked ? (
                        <TouchableOpacity
                          style={
                            styles.vaccineRemove
                          }
                          onPress={() =>
                            removeVaccine(
                              vaccine
                            )
                          }
                        >
                          <Text
                            style={
                              styles.vaccineRemoveText
                            }
                          >
                            ×
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )
                )}
              </View>
            </FieldBox>
          </View>

          {/* =============================================
              MORE INFO
          ============================================= */}

          <SectionTitle
            title={
              T(
                "info_title"
              )
            }
          />

          <View
            style={
              styles.twoColumnRow
            }
          >
            <FieldBox
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "chronic_label"
                  )
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textarea,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.chronic
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "chronic",
                    value
                  )
                }
                editable={
                  editable &&
                  !blocked
                }
                multiline
                placeholder={
                  T(
                    "chronic_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>

            <FieldBox
              style={
                styles.flexField
              }
            >
              <FieldLabel
                title={
                  T(
                    "organ_label"
                  )
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textarea,

                  !editable &&
                    styles.inputDisabled,
                ]}
                value={
                  form.organ
                }
                onChangeText={(
                  value
                ) =>
                  setField(
                    "organ",
                    value
                  )
                }
                editable={
                  editable &&
                  !blocked
                }
                multiline
                placeholder={
                  T(
                    "organ_ph"
                  )
                }
                placeholderTextColor={
                  "#8a8f93"
                }
              />
            </FieldBox>
          </View>

          <FieldBox>
            <FieldLabel
              title={
                T(
                  "notes_label"
                )
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.textarea,

                !editable &&
                  styles.inputDisabled,
              ]}
              value={
                form.notes
              }
              onChangeText={(
                value
              ) =>
                setField(
                  "notes",
                  value
                )
              }
              editable={
                editable &&
                !blocked
              }
              multiline
              placeholder={
                T(
                  "notes_ph"
                )
              }
              placeholderTextColor={
                "#8a8f93"
              }
            />
          </FieldBox>

          {/* =============================================
              CONTACTS
          ============================================= */}

          <SectionTitle
            title={
              T(
                "contacts_title"
              )
            }
          />

          <FieldBox>
            <FieldLabel
              title={
                T(
                  "ec1_label"
                )
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.contactInput,

                !editable &&
                  styles.inputDisabled,
              ]}
              value={
                form.em1_name
              }
              onChangeText={(
                value
              ) =>
                setField(
                  "em1_name",
                  value
                )
              }
              editable={
                editable &&
                !blocked
              }
              placeholder={
                T(
                  "ec1_name_ph"
                )
              }
              placeholderTextColor={
                "#8a8f93"
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.contactInput,

                !editable &&
                  styles.inputDisabled,
              ]}
              value={
                form.em1
              }
              onChangeText={(
                value
              ) =>
                setField(
                  "em1",
                  value
                )
              }
              editable={
                editable &&
                !blocked
              }
              keyboardType="phone-pad"
              placeholder="+41..."
              placeholderTextColor={
                "#8a8f93"
              }
            />

            <TouchableOpacity
              style={[
                styles.callButton,

                !normalizeTel(
                  form.em1
                ) &&
                  styles.buttonDisabled,
              ]}
              onPress={() =>
                callNumber(
                  form.em1
                )
              }
            >
              <Text
                style={
                  styles.callButtonText
                }
              >
                {normalizeTel(
                  form.em1
                ) ||
                  T("call")}
              </Text>
            </TouchableOpacity>
          </FieldBox>

          <FieldBox>
            <FieldLabel
              title={
                T(
                  "ec2_label"
                )
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.contactInput,

                !editable &&
                  styles.inputDisabled,
              ]}
              value={
                form.em2_name
              }
              onChangeText={(
                value
              ) =>
                setField(
                  "em2_name",
                  value
                )
              }
              editable={
                editable &&
                !blocked
              }
              placeholder={
                T(
                  "ec2_name_ph"
                )
              }
              placeholderTextColor={
                "#8a8f93"
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.contactInput,

                !editable &&
                  styles.inputDisabled,
              ]}
              value={
                form.em2
              }
              onChangeText={(
                value
              ) =>
                setField(
                  "em2",
                  value
                )
              }
              editable={
                editable &&
                !blocked
              }
              keyboardType="phone-pad"
              placeholder="+41..."
              placeholderTextColor={
                "#8a8f93"
              }
            />

            <TouchableOpacity
              style={[
                styles.callButton,

                !normalizeTel(
                  form.em2
                ) &&
                  styles.buttonDisabled,
              ]}
              onPress={() =>
                callNumber(
                  form.em2
                )
              }
            >
              <Text
                style={
                  styles.callButtonText
                }
              >
                {normalizeTel(
                  form.em2
                ) ||
                  T("call")}
              </Text>
            </TouchableOpacity>
          </FieldBox>

          {/* =============================================
              DOCUMENTS
          ============================================= */}

          <SectionTitle
            title={
              T(
                "docs_section_title"
              )
            }
          />

          <View
            style={
              styles.documentToolbar
            }
          >
            <TouchableOpacity
              style={[
                styles.actionButtonPrimary,

                (!editable ||
                  blocked ||
                  uploading) &&
                  styles.buttonDisabled,
              ]}
              disabled={
                !editable ||
                blocked ||
                uploading
              }
              onPress={
                handleTakePhoto
              }
            >
              <Text
                style={
                  styles.actionButtonPrimaryText
                }
              >
                {T(
                  "docs_upload_camera"
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,

                (!editable ||
                  blocked ||
                  uploading) &&
                  styles.buttonDisabled,
              ]}
              disabled={
                !editable ||
                blocked ||
                uploading
              }
              onPress={
                handlePickDocument
              }
            >
              <Text
                style={
                  styles.actionButtonText
                }
              >
                {T(
                  "docs_upload_file"
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {docsLoading ? (
            <View
              style={
                styles.loadingSmall
              }
            >
              <ActivityIndicator
                color={
                  COLORS.textMuted
                }
              />
            </View>
          ) : sortedDocuments.length ===
            0 ? (
            <View
              style={
                styles.docEmpty
              }
            >
              <Text
                style={
                  styles.docEmptyText
                }
              >
                {T(
                  "docs_empty"
                )}
              </Text>
            </View>
          ) : (
            sortedDocuments.map(
              (doc) => (
                <View
                  key={
                    doc.id
                  }
                  style={
                    styles.docItem
                  }
                >
                  <View
                    style={
                      styles.docMain
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.docThumb
                      }
                      onPress={() =>
                        openDocument(
                          doc
                        )
                      }
                    >
                      {isImageMime(
                        doc.mime_type
                      ) &&
                      doc.preview_url ? (
                        <Image
                          source={{
                            uri:
                              doc.preview_url,
                          }}
                          style={
                            styles.docThumbImage
                          }
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={
                            styles.docThumbFallback
                          }
                        >
                          <Text
                            style={
                              styles.docThumbFallbackText
                            }
                          >
                            {getDocumentEmoji(
                              doc
                            )}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View
                      style={
                        styles.docMeta
                      }
                    >
                      <Text
                        style={
                          styles.docName
                        }
                        numberOfLines={
                          3
                        }
                      >
                        {doc.file_name ||
                          T(
                            "docs_default_name"
                          )}
                      </Text>

                      {editable &&
                      !blocked ? (
                        <TouchableOpacity
                          style={
                            styles.docRenameButton
                          }
                          onPress={() => {
                            setRenameDocumentItem(
                              doc
                            );

                            setRenameValue(
                              doc.file_name ||
                                T(
                                  "docs_default_name"
                                )
                            );
                          }}
                        >
                          <Text
                            style={
                              styles.docRenameButtonText
                            }
                          >
                            {T(
                              "rename"
                            )}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <Text
                        style={
                          styles.docType
                        }
                      >
                        {isImageMime(
                          doc.mime_type
                        )
                          ? T(
                              "docs_type_image"
                            )
                          : T(
                              "docs_type_file"
                            )}

                        {doc.file_size
                          ? ` • ${formatFileSize(
                              doc.file_size
                            )}`
                          : ""}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.docActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.docActionButton
                      }
                      onPress={() =>
                        openDocument(
                          doc
                        )
                      }
                    >
                      <Text
                        style={
                          styles.docActionButtonText
                        }
                      >
                        {T(
                          "open"
                        )}
                      </Text>
                    </TouchableOpacity>

                    {editable &&
                    !blocked ? (
                      <TouchableOpacity
                        style={
                          styles.docDeleteButton
                        }
                        onPress={() =>
                          deleteDocument(
                            doc
                          )
                        }
                      >
                        <Text
                          style={
                            styles.docDeleteButtonText
                          }
                        >
                          {T(
                            "remove"
                          )}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )
            )
          )}

          {/* =============================================
              FOOTER CONTROLS
          ============================================= */}

          <View
            style={
              styles.footer
            }
          >
            <View
              style={
                styles.footerButtons
              }
            >
              <TouchableOpacity
                style={[
                  styles.footerButton,

                  blocked &&
                    styles.buttonDisabled,
                ]}
                onPress={
                  toggleEdit
                }
                disabled={
                  blocked
                }
              >
                <Text
                  style={
                    styles.footerButtonText
                  }
                >
                  {editable
                    ? T(
                        "btn_edit_active"
                      )
                    : T(
                        "btn_edit"
                      )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerButtonPrimary,

                  (!editable ||
                    saving ||
                    blocked) &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  !editable ||
                  saving ||
                  blocked
                }
                onPress={
                  saveProfile
                }
              >
                <Text
                  style={
                    styles.footerButtonPrimaryText
                  }
                >
                  {saving
                    ? "…"
                    : T(
                        "btn_save"
                      )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerButtonDanger,

                  (!editable ||
                    saving ||
                    blocked) &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  !editable ||
                  saving ||
                  blocked
                }
                onPress={
                  clearAll
                }
              >
                <Text
                  style={
                    styles.footerButtonDangerText
                  }
                >
                  {T(
                    "btn_clear"
                  )}
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text
                style={
                  styles.lastUpdate
                }
              >
                {T(
                  "last_update"
                )}{" "}
                <Text
                  style={
                    styles.lastUpdateValue
                  }
                >
                  {profile?.updated_at
                    ? new Date(
                        profile.updated_at
                      ).toLocaleString()
                    : "—"}
                </Text>
              </Text>

              <Text
                style={[
                  styles.statusText,

                  statusKind ===
                    "ok" &&
                    styles.statusOk,

                  statusKind ===
                    "warn" &&
                    styles.statusWarn,

                  statusKind ===
                    "err" &&
                    styles.statusErr,
                ]}
              >
                {statusText ||
                  T(
                    "status_ready"
                  )}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* =================================================
          LANGUAGE PICKER
      ================================================= */}

      <SelectionModal
        visible={
          langPickerVisible
        }
        title={
          T(
            "select_language"
          )
        }
        onClose={() =>
          setLangPickerVisible(
            false
          )
        }
      >
        {LANG_OPTIONS.map(
          (item) => (
            <SelectionOption
              key={
                item
              }
              label={
                item.toUpperCase()
              }
              active={
                item === lang
              }
              onPress={() => {
                setLang(
                  item
                );

                setLangPickerVisible(
                  false
                );
              }}
            />
          )
        )}
      </SelectionModal>

      {/* =================================================
          BLOOD PICKER
      ================================================= */}

      <SelectionModal
        visible={
          bloodPickerVisible
        }
        title={
          T(
            "select_blood"
          )
        }
        onClose={() =>
          setBloodPickerVisible(
            false
          )
        }
      >
        {BLOOD_OPTIONS.map(
          (
            option
          ) => (
            <SelectionOption
              key={
                option ||
                "empty"
              }
              label={
                option ||
                "—"
              }
              active={
                form.blood ===
                option
              }
              onPress={() => {
                setField(
                  "blood",
                  option
                );

                setBloodPickerVisible(
                  false
                );
              }}
            />
          )
        )}
      </SelectionModal>

      {/* =================================================
          COUNTRY PICKER
      ================================================= */}

      <SelectionModal
        visible={
          countryPickerVisible
        }
        title={
          T(
            "select_country"
          )
        }
        onClose={() =>
          setCountryPickerVisible(
            false
          )
        }
      >
        {COUNTRY_OPTIONS.map(
          (
            country
          ) => (
            <SelectionOption
              key={
                country
              }
              label={`${getCountryFlag(
                country
              )} ${T(
                `country_${country.toLowerCase()}`
              )}`}
              active={
                selectedCountry ===
                country
              }
              onPress={() => {
                setField(
                  "emergencyCountry",
                  country
                );

                setCountryPickerVisible(
                  false
                );
              }}
            />
          )
        )}
      </SelectionModal>

      {/* =================================================
          VACCINE PICKER
      ================================================= */}

      <Modal
        visible={
          vaccinePickerVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVaccinePickerVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCardLarge
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {T(
                "select_vaccine"
              )}
            </Text>

            <ScrollView
              style={{
                maxHeight:
                  500,
              }}
            >
              {VACCINE_GROUPS.map(
                (
                  group
                ) => (
                  <View
                    key={
                      group.title
                    }
                  >
                    <Text
                      style={
                        styles.vaccineGroupTitle
                      }
                    >
                      {
                        group.title
                      }
                    </Text>

                    {group.items.map(
                      (
                        item
                      ) => (
                        <SelectionOption
                          key={
                            item
                          }
                          label={
                            item
                          }
                          active={selectedVaccines.includes(
                            item
                          )}
                          onPress={() =>
                            addVaccine(
                              item
                            )
                          }
                        />
                      )
                    )}
                  </View>
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={
                styles.modalCancelButton
              }
              onPress={() =>
                setVaccinePickerVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.modalCancelButtonText
                }
              >
                {T(
                  "cancel"
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =================================================
          RENAME DOCUMENT
      ================================================= */}

      <Modal
        visible={
          !!renameDocumentItem
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setRenameDocumentItem(
            null
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {T(
                "rename_title"
              )}
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                renameValue
              }
              onChangeText={
                setRenameValue
              }
              placeholder={
                T(
                  "rename_placeholder"
                )
              }
              placeholderTextColor={
                "#8a8f93"
              }
              maxLength={
                120
              }
              autoFocus
            />

            <View
              style={
                styles.modalButtonRow
              }
            >
              <TouchableOpacity
                style={
                  styles.modalCancelButtonHalf
                }
                disabled={
                  renameSaving
                }
                onPress={() =>
                  setRenameDocumentItem(
                    null
                  )
                }
              >
                <Text
                  style={
                    styles.modalCancelButtonText
                  }
                >
                  {T(
                    "cancel"
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveButtonHalf,

                  renameSaving &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  renameSaving
                }
                onPress={
                  saveDocumentRename
                }
              >
                <Text
                  style={
                    styles.modalSaveButtonText
                  }
                >
                  {renameSaving
                    ? "…"
                    : T(
                        "save"
                      )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================
          EMERGENCY COUNTRY PICKER
      ================================================= */}

      <SelectionModal
        visible={
          emergencyCountryPickerVisible
        }
        title={
          T(
            "select_country"
          )
        }
        onClose={() =>
          setEmergencyCountryPickerVisible(
            false
          )
        }
      >
        {COUNTRY_OPTIONS.map(
          (
            country
          ) => (
            <SelectionOption
              key={
                `emergency-${country}`
              }
              label={`${getCountryFlag(
                country
              )} ${T(
                `country_${country.toLowerCase()}`
              )}`}
              active={
                emergencyCountry ===
                country
              }
              onPress={() => {
                setEmergencyCountry(
                  country
                );

                setEmergencyCountryPickerVisible(
                  false
                );
              }}
            />
          )
        )}
      </SelectionModal>

      {/* =================================================
          EMERGENCY FULLSCREEN
      ================================================= */}

      <Modal
        visible={
          emergencyVisible
        }
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() =>
          closeEmergencyMode(
            false
          )
        }
      >
        <SafeAreaView
          style={
            styles.emergencyScreen
          }
        >
          <StatusBar
            barStyle="light-content"
            backgroundColor={
              "#8c1414"
            }
          />

          <ScrollView
            style={
              styles.emergencyScroll
            }
            contentContainerStyle={
              styles.emergencyContent
            }
          >
            {/* =========================================
                EMERGENCY TOP
            ========================================= */}

            <View
              style={
                styles.emergencyHeader
              }
            >
              <View
                style={
                  styles.emergencyHeading
                }
              >
                <Text
                  style={
                    styles.emergencyTitle
                  }
                >
                  🆘{" "}
                  {T(
                    "emergency_mode_title"
                  )}
                </Text>

                <Text
                  style={
                    styles.emergencySub
                  }
                >
                  {T(
                    "emergency_mode_sub"
                  )}
                </Text>

                <View
                  style={
                    styles.emergencyDisclaimer
                  }
                >
                  <Text
                    style={
                      styles.emergencyDisclaimerText
                    }
                  >
                    {T(
                      "emergency_notice"
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.emergencyMetaRow
                }
              >
                <View
                  style={
                    styles.emergencyProfileMeta
                  }
                >
                  {profileImageUrl ? (
                    <Image
                      source={{
                        uri:
                          profileImageUrl,
                      }}
                      style={
                        styles.emergencyProfileImage
                      }
                    />
                  ) : null}

                  <View
                    style={
                      styles.emergencyProfileText
                    }
                  >
                    <Text
                      style={
                        styles.emergencyMetaLabel
                      }
                    >
                      {T(
                        "profile_id"
                      )}
                    </Text>

                    <Text
                      style={
                        styles.emergencyMetaValue
                      }
                    >
                      {
                        card.public_id
                      }
                    </Text>

                    <Text
                      style={[
                        styles.emergencyMetaLabel,
                        {
                          marginTop:
                            5,
                        },
                      ]}
                    >
                      {T(
                        "last_update"
                      )}
                    </Text>

                    <Text
                      style={
                        styles.emergencyMetaValue
                      }
                    >
                      {profile?.updated_at
                        ? new Date(
                            profile.updated_at
                          ).toLocaleString()
                        : "—"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={
                    styles.emergencyLanguageButton
                  }
                  onPress={() =>
                    setLangPickerVisible(
                      true
                    )
                  }
                >
                  <Text
                    style={
                      styles.emergencyLanguageButtonText
                    }
                  >
                    🌐{" "}
                    {lang.toUpperCase()}{" "}
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={
                  styles.emergencyCloseButton
                }
                onPress={() =>
                  closeEmergencyMode(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.emergencyCloseButtonText
                  }
                >
                  {T(
                    "close"
                  )}
                </Text>
              </TouchableOpacity>
            </View>

            {/* =========================================
                EMERGENCY NUMBERS
            ========================================= */}

            <View
              style={
                styles.emergencyCallGrid
              }
            >
              <EmergencyCallButton
                icon="🆘"
                label={
                  T(
                    "call_emergency"
                  )
                }
                number={
                  emergencyNumbers.general
                }
                primary
                onPress={() =>
                  callNumber(
                    emergencyNumbers.general
                  )
                }
              />

              <EmergencyCallButton
                icon="🚑"
                label={
                  T(
                    "call_medical"
                  )
                }
                number={
                  emergencyNumbers.medical
                }
                onPress={() =>
                  callNumber(
                    emergencyNumbers.medical
                  )
                }
              />

              <EmergencyCallButton
                icon="👮"
                label={
                  T(
                    "call_police"
                  )
                }
                number={
                  emergencyNumbers.police
                }
                onPress={() =>
                  callNumber(
                    emergencyNumbers.police
                  )
                }
              />

              <EmergencyCallButton
                icon="🚒"
                label={
                  T(
                    "call_fire"
                  )
                }
                number={
                  emergencyNumbers.fire
                }
                onPress={() =>
                  callNumber(
                    emergencyNumbers.fire
                  )
                }
              />
            </View>

            {/* =========================================
                DOCUMENT ALERT
            ========================================= */}

            {sortedDocuments.length >
            0 ? (
              <View
                style={
                  styles.emergencyDocuments
                }
              >
                <View
                  style={
                    styles.emergencyDocumentsHeader
                  }
                >
                  <Text
                    style={
                      styles.emergencyDocumentsTitle
                    }
                  >
                    {T(
                      "docs_overlay_title"
                    )}
                  </Text>

                  <View
                    style={
                      styles.emergencyDocumentsBadge
                    }
                  >
                    <Text
                      style={
                        styles.emergencyDocumentsBadgeText
                      }
                    >
                      {
                        sortedDocuments.length
                      }
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.emergencyDocumentsText
                  }
                >
                  {
                    docsNotice
                  }
                </Text>

                <View
                  style={{
                    marginTop:
                      8,
                  }}
                >
                  {sortedDocuments.map(
                    (
                      doc
                    ) => (
                      <TouchableOpacity
                        key={
                          `emergency-doc-${doc.id}`
                        }
                        style={
                          styles.emergencyDocumentButton
                        }
                        onPress={() =>
                          openDocument(
                            doc
                          )
                        }
                      >
                        <Text
                          style={
                            styles.emergencyDocumentName
                          }
                          numberOfLines={
                            2
                          }
                        >
                          📂{" "}
                          {doc.file_name ||
                            T(
                              "docs_default_name"
                            )}
                        </Text>

                        <Text
                          style={
                            styles.emergencyDocumentOpen
                          }
                        >
                          {T(
                            "open"
                          )}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            ) : null}

            {/* =========================================
                EMERGENCY MEDICAL GRID
            ========================================= */}

            <View
              style={
                styles.emergencyGrid
              }
            >
              <EmergencyCard
                title={
                  T(
                    "name_label"
                  )
                }
                value={
                  form.name
                }
              />

              <EmergencyCard
                title={
                  T(
                    "dob_label"
                  )
                }
                value={
                  form.dob
                }
              />

              <EmergencyCard
                title={
                  T(
                    "blood_label"
                  )
                }
                value={
                  form.blood
                }
              />

              <EmergencyCard
                title={
                  T(
                    "allergies_label"
                  )
                }
                value={
                  form.allergies
                }
                critical={
                  !!String(
                    form.allergies ||
                      ""
                  ).trim()
                }
              />

              <EmergencyCard
                title={
                  T(
                    "thinner_label"
                  )
                }
                value={
                  form.bloodThinner
                }
                critical={
                  !!String(
                    form.bloodThinner ||
                      ""
                  ).trim()
                }
              />

              <EmergencyCard
                title={
                  T(
                    "meds_label"
                  )
                }
                value={
                  form.meds
                }
              />

              <EmergencyCard
                title={
                  T(
                    "chronic_label"
                  )
                }
                value={
                  form.chronic
                }
                fullOnMobile
              />

              <EmergencyCard
                title={
                  T(
                    "notes_label"
                  )
                }
                value={
                  form.notes
                }
                fullOnMobile
              />
            </View>

            {/* =========================================
                CONTACT 1
            ========================================= */}

            {normalizeTel(
              form.em1
            ) ? (
              <EmergencyContact
                name={lineValue(
                  form.em1_name,
                  T(
                    "emergency_contact_fallback_1"
                  )
                )}
                phone={lineValue(
                  form.em1
                )}
                callText={
                  T(
                    "call"
                  )
                }
                onPress={() =>
                  callNumber(
                    form.em1
                  )
                }
              />
            ) : null}

            {/* =========================================
                CONTACT 2
            ========================================= */}

            {normalizeTel(
              form.em2
            ) ? (
              <EmergencyContact
                name={lineValue(
                  form.em2_name,
                  T(
                    "emergency_contact_fallback_2"
                  )
                )}
                phone={lineValue(
                  form.em2
                )}
                callText={
                  T(
                    "call"
                  )
                }
                onPress={() =>
                  callNumber(
                    form.em2
                  )
                }
              />
            ) : null}

            <Text
              style={
                styles.emergencyHint
              }
            >
              {T(
                "emergency_hint"
              )}
            </Text>

            {/* =========================================
                EMERGENCY COUNTRY SWITCH
            ========================================= */}

            <View
              style={
                styles.emergencyCountryBox
              }
            >
              <Text
                style={
                  styles.emergencyCountryLabel
                }
              >
                🌍{" "}
                {T(
                  "emergency_country_label"
                )}
              </Text>

              <TouchableOpacity
                style={
                  styles.emergencyCountrySelect
                }
                onPress={() =>
                  setEmergencyCountryPickerVisible(
                    true
                  )
                }
              >
                <Text
                  style={
                    styles.emergencyCountrySelectText
                  }
                >
                  {getCountryFlag(
                    emergencyCountry
                  )}{" "}
                  {
                    emergencyCountryName
                  }
                </Text>

                <Text
                  style={
                    styles.emergencyCountrySelectText
                  }
                >
                  ▼
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={
                styles.emergencyCountryHint
              }
            >
              {T(
                "selected_country"
              )}
              :{" "}
              {
                emergencyCountryName
              }
              .{" "}
              {T(
                "general_emergency_number"
              )}
              :{" "}
              {
                emergencyNumbers.general
              }
              .
            </Text>

            {/* =========================================
                VACCINES COLLAPSIBLE
            ========================================= */}

            {selectedVaccines.length >
            0 ? (
              <View
                style={
                  styles.emergencyVaccines
                }
              >
                <TouchableOpacity
                  style={
                    styles.emergencyVaccinesHeader
                  }
                  onPress={() =>
                    setVaccinesEmergencyOpen(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                >
                  <Text
                    style={
                      styles.emergencyVaccinesTitle
                    }
                  >
                    {T(
                      "vaccines_emergency_title"
                    )}
                  </Text>

                  <Text
                    style={
                      styles.emergencyVaccinesToggle
                    }
                  >
                    {vaccinesEmergencyOpen
                      ? "−"
                      : "+"}
                  </Text>
                </TouchableOpacity>

                {vaccinesEmergencyOpen ? (
                  <Text
                    style={
                      styles.emergencyVaccinesText
                    }
                  >
                    {selectedVaccines.join(
                      " • "
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   HELPER COMPONENTS
========================================================= */

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text
      style={
        styles.sectionTitle
      }
    >
      {title}
    </Text>
  );
}

function FieldBox({
  children,
  variant,
  style,
}: {
  children:
    React.ReactNode;

  variant?:
    | "crit"
    | "warn"
    | "ok";

  style?: any;
}) {
  return (
    <View
      style={[
        styles.field,

        variant ===
          "crit" &&
          styles.fieldCrit,

        variant ===
          "warn" &&
          styles.fieldWarn,

        variant ===
          "ok" &&
          styles.fieldOk,

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

  chipVariant?:
    | "crit"
    | "warn"
    | "ok";
}) {
  return (
    <View
      style={
        styles.labelRow
      }
    >
      <Text
        style={
          styles.labelText
        }
      >
        {title}
      </Text>

      {chip ? (
        <View
          style={[
            styles.chip,

            chipVariant ===
              "crit" &&
              styles.chipCrit,

            chipVariant ===
              "warn" &&
              styles.chipWarn,

            chipVariant ===
              "ok" &&
              styles.chipOk,
          ]}
        >
          <Text
            style={[
              styles.chipText,

              chipVariant ===
                "crit" &&
                styles.chipTextCrit,

              chipVariant ===
                "warn" &&
                styles.chipTextWarn,

              chipVariant ===
                "ok" &&
                styles.chipTextOk,
            ]}
          >
            {chip}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.modalOverlay
        }
      >
        <View
          style={
            styles.modalCard
          }
        >
          <Text
            style={
              styles.modalTitle
            }
          >
            {title}
          </Text>

          <ScrollView
            style={{
              maxHeight:
                430,
            }}
          >
            {children}
          </ScrollView>

          <TouchableOpacity
            style={
              styles.modalCancelButton
            }
            onPress={
              onClose
            }
          >
            <Text
              style={
                styles.modalCancelButtonText
              }
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SelectionOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modalOption,

        active &&
          styles.modalOptionActive,
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.modalOptionText,

          active &&
            styles.modalOptionTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmergencyCard({
  title,
  value,
  critical,
  fullOnMobile,
}: {
  title: string;
  value?: string | null;
  critical?: boolean;
  fullOnMobile?: boolean;
}) {
  return (
    <View
      style={[
        styles.emergencyCard,

        critical &&
          styles.emergencyCardCritical,

        fullOnMobile &&
          styles.emergencyCardFull,
      ]}
    >
      <Text
        style={
          styles.emergencyCardLabel
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emergencyCardValue
        }
      >
        {lineValue(
          value
        )}
      </Text>
    </View>
  );
}

function EmergencyCallButton({
  icon,
  label,
  number,
  primary,
  onPress,
}: {
  icon: string;
  label: string;
  number: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.emergencyCallButton,

        primary &&
          styles.emergencyCallButtonPrimary,
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={
          styles.emergencyCallIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.emergencyCallLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.emergencyCallNumber
        }
      >
        {number}
      </Text>
    </TouchableOpacity>
  );
}

function EmergencyContact({
  name,
  phone,
  callText,
  onPress,
}: {
  name: string;
  phone: string;
  callText: string;
  onPress: () => void;
}) {
  return (
    <View
      style={
        styles.emergencyContact
      }
    >
      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={
            styles.emergencyContactName
          }
        >
          {name}
        </Text>

        <Text
          style={
            styles.emergencyContactPhone
          }
        >
          {phone}
        </Text>
      </View>

      <TouchableOpacity
        style={
          styles.emergencyContactButton
        }
        onPress={
          onPress
        }
      >
        <Text
          style={
            styles.emergencyContactButtonText
          }
        >
          📞 {callText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getCountryFlag(
  country:
    EmergencyCountry
) {
  const flags: Record<
    EmergencyCountry,
    string
  > = {
    CH: "🇨🇭",
    DE: "🇩🇪",
    AT: "🇦🇹",
    IT: "🇮🇹",
    FR: "🇫🇷",
    ES: "🇪🇸",
  };

  return flags[country];
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  bg: "#f4f6f8",

  panel: "#ffffff",

  text: "#000000",

  textSoft: "#222222",

  textMuted: "#4b5563",

  line: "#e7ebf0",

  chip: "#f0f3f7",

  danger: "#b01818",

  warn: "#d39b22",

  ok: "#1e8a4a",

  blue: "#1f6feb",

  darkButton:
    "#2a3a57",

  inputBg:
    "#fbfcfe",

  inputDisabled:
    "#f4f6f8",
};

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================
       BASE
    ===================== */

    safe: {
      flex: 1,
      backgroundColor:
        COLORS.bg,
    },

    screen: {
      flex: 1,
      backgroundColor:
        COLORS.bg,
    },

    content: {
      width: "100%",
      maxWidth: 1012,
      alignSelf: "center",
      paddingHorizontal:
        16,
      paddingTop:
        16,
      paddingBottom:
        48,
    },

    loadingWrap: {
      flex: 1,
      backgroundColor:
        COLORS.bg,
      justifyContent:
        "center",
      alignItems:
        "center",
      padding:
        24,
    },

    loadingText: {
      marginTop:
        12,
      color:
        COLORS.textSoft,
      fontWeight:
        "700",
      fontSize:
        15,
    },

    loadingSmall: {
      paddingVertical:
        20,
      alignItems:
        "center",
    },

    emptyWrap: {
      flex: 1,
      backgroundColor:
        COLORS.bg,
      justifyContent:
        "center",
      alignItems:
        "center",
      padding:
        28,
    },

    emptyTitle: {
      fontSize:
        26,
      fontWeight:
        "900",
      color:
        COLORS.text,
      marginBottom:
        8,
      textAlign:
        "center",
    },

    emptyText: {
      fontSize:
        15,
      color:
        COLORS.textSoft,
      textAlign:
        "center",
      lineHeight:
        22,
    },

    buttonDisabled: {
      opacity:
        0.45,
    },

    /* =====================
       TOPBAR
       Web mobile:
       Zeile 1 Logo + Sprache
       Zeile 2 Edit/Save/Emergency/Logout
    ===================== */

    topbar: {
      backgroundColor:
        "rgba(255,255,255,0.98)",

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.line,

      paddingHorizontal:
        10,

      paddingTop:
        8,

      paddingBottom:
        8,

      shadowColor:
        "#101318",

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        10,

      elevation:
        4,
    },

    topbarTopRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom:
        8,
    },

    brandWrap: {
      flexDirection:
        "row",

      alignItems:
        "center",

      minWidth:
        0,

      flex:
        1,
    },

    /*
      Da wir den exakten Asset-Pfad deines
      Logo-Files hier nicht sicher kennen,
      verwenden wir ein kompaktes V-Markenfeld.

      Falls dein Logo z.B. unter
      ../../assets/logo-vivecard.png.jpeg liegt,
      kannst du diesen Block durch <Image /> ersetzen.
    */
    brandMark: {
      width:
        34,

      height:
        34,

      borderRadius:
        8,

      backgroundColor:
        "#ffffff",

      borderWidth:
        2,

      borderColor:
        COLORS.danger,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight:
        8,
    },

    brandMarkText: {
      color:
        COLORS.danger,

      fontSize:
        21,

      fontWeight:
        "950",
    },

    brandText: {
      color:
        COLORS.text,

      fontSize:
        17,

      fontWeight:
        "950",

      letterSpacing:
        1.2,
    },

    langSelect: {
      width:
        58,

      minWidth:
        58,

      height:
        38,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        10,

      backgroundColor:
        "#ffffff",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    langSelectText: {
      color:
        COLORS.text,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    topButtonsRow: {
      flexDirection:
        "row",

      alignItems:
        "stretch",

      justifyContent:
        "space-between",

      width:
        "100%",
    },

    topBtn: {
      flex:
        1,

      minHeight:
        38,

      borderRadius:
        10,

      paddingHorizontal:
        4,

      paddingVertical:
        8,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginHorizontal:
        3,
    },

    topBtnSoft: {
      backgroundColor:
        COLORS.chip,

      borderWidth:
        1,

      borderColor:
        COLORS.line,
    },

    topBtnSave: {
      backgroundColor:
        COLORS.darkButton,

      borderWidth:
        1,

      borderColor:
        COLORS.darkButton,
    },

    topBtnEmergency: {
      flex:
        1.15,

      backgroundColor:
        COLORS.danger,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,
    },

    topBtnWhite: {
      backgroundColor:
        "#ffffff",

      borderWidth:
        1,

      borderColor:
        COLORS.line,
    },

    topBtnDarkText: {
      color:
        COLORS.text,

      fontSize:
        10.5,

      fontWeight:
        "900",

      textAlign:
        "center",
    },

    topBtnWhiteText: {
      color:
        "#ffffff",

      fontSize:
        10.5,

      fontWeight:
        "900",

      textAlign:
        "center",
    },

    /* =====================
       BLOCKED BANNER
    ===================== */

    blockedBanner: {
      marginBottom:
        12,

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      borderRadius:
        12,

      backgroundColor:
        "rgba(176,24,24,0.08)",

      borderWidth:
        1,

      borderColor:
        "rgba(176,24,24,0.25)",
    },

    blockedBannerText: {
      color:
        "#7a1212",

      fontSize:
        13,

      lineHeight:
        19,

      fontWeight:
        "800",
    },

    /* =====================
       MAIN CARD
    ===================== */

    cardWrap: {
      backgroundColor:
        COLORS.panel,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        14,

      padding:
        16,

      shadowColor:
        "#101318",

      shadowOffset: {
        width: 0,
        height: 10,
      },

      shadowOpacity:
        0.10,

      shadowRadius:
        20,

      elevation:
        5,
    },

    /* =====================
       HEADLINE
    ===================== */

    headline: {
      marginBottom:
        10,
    },

    profileHead: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    profileImageWrap: {
      alignItems:
        "center",

      marginRight:
        14,
    },

    profileImageCircle: {
      width:
        68,

      height:
        68,

      borderRadius:
        34,

      overflow:
        "hidden",

      backgroundColor:
        "#f0f3f7",

      borderWidth:
        3,

      borderColor:
        "#ffffff",

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        "#101318",

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity:
        0.14,

      shadowRadius:
        10,

      elevation:
        4,
    },

    profileImage: {
      width:
        "100%",

      height:
        "100%",
    },

    profileImagePlaceholder: {
      fontSize:
        30,
    },

    profileImageButton: {
      marginTop:
        7,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        "#ffffff",

      borderRadius:
        999,

      paddingHorizontal:
        8,

      paddingVertical:
        6,
    },

    profileImageButtonText: {
      fontSize:
        10.5,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    headlineTitle: {
      marginTop:
        3,

      color:
        COLORS.text,

      fontSize:
        24,

      fontWeight:
        "950",

      letterSpacing:
        -0.4,
    },

    headlineSub: {
      marginTop:
        4,

      color:
        COLORS.textSoft,

      fontSize:
        13,

      fontWeight:
        "600",

      lineHeight:
        18,
    },

    pidBox: {
      marginTop:
        12,
    },

    pidLabel: {
      color:
        COLORS.textSoft,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    pidValue: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        14,

      fontWeight:
        "900",
    },

    /* =====================
       GRID
    ===================== */

    twoColumnRow: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",
    },

    flexField: {
      width:
        Platform.OS ===
        "web"
          ? "49%"
          : "100%",
    },

    /* =====================
       FIELD
    ===================== */

    field: {
      width:
        "100%",

      backgroundColor:
        "#ffffff",

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        12,

      padding:
        10,

      marginBottom:
        12,
    },

    fieldCrit: {
      borderColor:
        "rgba(176,24,24,0.55)",
    },

    fieldWarn: {
      borderColor:
        "rgba(211,155,34,0.60)",
    },

    fieldOk: {
      borderColor:
        "rgba(30,138,74,0.45)",
    },

    labelRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom:
        8,
    },

    labelText: {
      flex:
        1,

      marginRight:
        8,

      color:
        COLORS.textSoft,

      fontSize:
        11.5,

      fontWeight:
        "900",

      textTransform:
        "uppercase",

      letterSpacing:
        0.3,
    },

    chip: {
      borderRadius:
        999,

      backgroundColor:
        COLORS.chip,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      paddingHorizontal:
        9,

      paddingVertical:
        4,
    },

    chipText: {
      color:
        COLORS.textSoft,

      fontSize:
        10,

      fontWeight:
        "900",

      textTransform:
        "uppercase",
    },

    chipCrit: {
      backgroundColor:
        "rgba(176,24,24,0.08)",

      borderColor:
        "rgba(176,24,24,0.18)",
    },

    chipTextCrit: {
      color:
        COLORS.danger,
    },

    chipWarn: {
      backgroundColor:
        "rgba(211,155,34,0.10)",

      borderColor:
        "rgba(211,155,34,0.22)",
    },

    chipTextWarn: {
      color:
        "#7a5400",
    },

    chipOk: {
      backgroundColor:
        "rgba(30,138,74,0.10)",

      borderColor:
        "rgba(30,138,74,0.18)",
    },

    chipTextOk: {
      color:
        COLORS.ok,
    },

    /* =====================
       INPUTS
    ===================== */

    input: {
      width:
        "100%",

      borderWidth:
        1,

      borderColor:
        "rgba(16,19,24,0.10)",

      borderRadius:
        10,

      paddingHorizontal:
        10,

      paddingVertical:
        Platform.OS ===
        "ios"
          ? 11
          : 9,

      backgroundColor:
        COLORS.inputBg,

      color:
        "#111111",

      fontSize:
        15,

      fontWeight:
        "700",
    },

    inputDisabled: {
      backgroundColor:
        COLORS.inputDisabled,

      borderColor:
        "rgba(16,19,24,0.06)",

      color:
        "#111111",

      opacity:
        1,
    },

    textarea: {
      minHeight:
        70,

      textAlignVertical:
        "top",
    },

    selectLike: {
      width:
        "100%",

      minHeight:
        44,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      borderWidth:
        1,

      borderColor:
        "rgba(16,19,24,0.10)",

      borderRadius:
        10,

      backgroundColor:
        COLORS.inputBg,

      paddingHorizontal:
        10,

      paddingVertical:
        10,
    },

    selectLikeText: {
      flex:
        1,

      color:
        "#111111",

      fontSize:
        15,

      fontWeight:
        "700",
    },

    selectArrow: {
      marginLeft:
        10,

      color:
        COLORS.textMuted,

      fontSize:
        11,

      fontWeight:
        "900",
    },

    fieldHelp: {
      marginTop:
        7,

      color:
        COLORS.textSoft,

      fontSize:
        12,

      fontWeight:
        "700",

      lineHeight:
        17,
    },

    sectionTitle: {
      marginTop:
        14,

      marginBottom:
        8,

      color:
        "#2a3340",

      fontSize:
        12,

      fontWeight:
        "900",

      letterSpacing:
        0.3,

      textTransform:
        "uppercase",
    },

    /* =====================
       VACCINES
    ===================== */

    vaccineInputRow: {
      flexDirection:
        "row",

      alignItems:
        "stretch",

      marginTop:
        8,
    },

    vaccineInput: {
      flex:
        1,

      marginRight:
        8,
    },

    vaccineAddButton: {
      minWidth:
        95,

      minHeight:
        44,

      borderRadius:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        "#ffffff",

      paddingHorizontal:
        10,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    vaccineAddButtonText: {
      color:
        COLORS.text,

      fontSize:
        11,

      fontWeight:
        "900",
    },

    vaccinesList: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      marginTop:
        10,
    },

    vaccineItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginRight:
        8,

      marginBottom:
        8,

      paddingLeft:
        10,

      paddingRight:
        5,

      paddingVertical:
        6,

      borderRadius:
        999,

      backgroundColor:
        "rgba(30,138,74,0.10)",

      borderWidth:
        1,

      borderColor:
        "rgba(30,138,74,0.25)",
    },

    vaccineItemText: {
      color:
        "#176c3a",

      fontSize:
        12,

      fontWeight:
        "800",
    },

    vaccineRemove: {
      width:
        22,

      height:
        22,

      marginLeft:
        8,

      borderRadius:
        11,

      backgroundColor:
        "rgba(176,24,24,0.12)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    vaccineRemoveText: {
      color:
        COLORS.danger,

      fontSize:
        15,

      fontWeight:
        "900",

      lineHeight:
        18,
    },

    vaccineGroupTitle: {
      marginTop:
        10,

      marginBottom:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        12,

      fontWeight:
        "900",

      textTransform:
        "uppercase",
    },

    /* =====================
       CONTACTS
    ===================== */

    contactInput: {
      marginBottom:
        10,
    },

    callButton: {
      width:
        "100%",

      borderRadius:
        12,

      backgroundColor:
        "#1f4fb8",

      paddingVertical:
        12,

      paddingHorizontal:
        14,

      alignItems:
        "center",
    },

    callButtonText: {
      color:
        "#ffffff",

      fontSize:
        14,

      fontWeight:
        "900",
    },

    /* =====================
       DOCUMENTS
    ===================== */

    documentToolbar: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      marginBottom:
        12,
    },

    actionButton: {
      flex:
        1,

      minWidth:
        145,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        12,

      backgroundColor:
        "#ffffff",

      paddingVertical:
        11,

      paddingHorizontal:
        12,

      alignItems:
        "center",

      marginRight:
        8,

      marginBottom:
        8,
    },

    actionButtonText: {
      color:
        COLORS.text,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    actionButtonPrimary: {
      flex:
        1,

      minWidth:
        145,

      borderRadius:
        12,

      backgroundColor:
        COLORS.darkButton,

      paddingVertical:
        11,

      paddingHorizontal:
        12,

      alignItems:
        "center",

      marginRight:
        8,

      marginBottom:
        8,
    },

    actionButtonPrimaryText: {
      color:
        "#ffffff",

      fontSize:
        12,

      fontWeight:
        "900",
    },

    docEmpty: {
      borderWidth:
        1,

      borderStyle:
        "dashed",

      borderColor:
        COLORS.line,

      borderRadius:
        12,

      backgroundColor:
        COLORS.inputBg,

      padding:
        12,
    },

    docEmptyText: {
      color:
        COLORS.textSoft,

      fontSize:
        12,

      fontWeight:
        "700",
    },

    docItem: {
      padding:
        12,

      marginBottom:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        12,

      backgroundColor:
        COLORS.inputBg,
    },

    docMain: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    docThumb: {
      width:
        62,

      height:
        62,

      marginRight:
        10,

      borderRadius:
        10,

      overflow:
        "hidden",

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        COLORS.chip,
    },

    docThumbImage: {
      width:
        "100%",

      height:
        "100%",
    },

    docThumbFallback: {
      flex:
        1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    docThumbFallbackText: {
      fontSize:
        26,
    },

    docMeta: {
      flex:
        1,

      minWidth:
        0,
    },

    docName: {
      color:
        COLORS.text,

      fontSize:
        14,

      fontWeight:
        "900",

      lineHeight:
        18,
    },

    docRenameButton: {
      alignSelf:
        "flex-start",

      marginTop:
        6,

      marginBottom:
        6,

      paddingHorizontal:
        8,

      paddingVertical:
        5,

      borderRadius:
        9,

      backgroundColor:
        "#ffffff",

      borderWidth:
        1,

      borderColor:
        COLORS.line,
    },

    docRenameButtonText: {
      color:
        COLORS.text,

      fontSize:
        10.5,

      fontWeight:
        "900",
    },

    docType: {
      color:
        COLORS.textSoft,

      fontSize:
        11.5,

      fontWeight:
        "700",
    },

    docActions: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      marginTop:
        10,
    },

    docActionButton: {
      paddingVertical:
        9,

      paddingHorizontal:
        13,

      marginRight:
        8,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        11,

      backgroundColor:
        "#ffffff",
    },

    docActionButtonText: {
      color:
        COLORS.text,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    docDeleteButton: {
      paddingVertical:
        9,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        "rgba(176,24,24,0.20)",

      borderRadius:
        11,

      backgroundColor:
        "#fff0f0",
    },

    docDeleteButtonText: {
      color:
        COLORS.danger,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    /* =====================
       FOOTER
    ===================== */

    footer: {
      marginTop:
        14,
    },

    footerButtons: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      marginBottom:
        8,
    },

    footerButton: {
      marginRight:
        8,

      marginBottom:
        8,

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      borderRadius:
        12,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        "#ffffff",
    },

    footerButtonText: {
      color:
        COLORS.text,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    footerButtonPrimary: {
      marginRight:
        8,

      marginBottom:
        8,

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      borderRadius:
        12,

      backgroundColor:
        COLORS.darkButton,
    },

    footerButtonPrimaryText: {
      color:
        "#ffffff",

      fontSize:
        12,

      fontWeight:
        "900",
    },

    footerButtonDanger: {
      marginBottom:
        8,

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      borderRadius:
        12,

      borderWidth:
        1,

      borderColor:
        "rgba(176,24,24,0.20)",

      backgroundColor:
        "#fff0f0",
    },

    footerButtonDangerText: {
      color:
        COLORS.danger,

      fontSize:
        12,

      fontWeight:
        "900",
    },

    lastUpdate: {
      color:
        COLORS.textSoft,

      fontSize:
        12,

      fontWeight:
        "700",
    },

    lastUpdateValue: {
      color:
        COLORS.text,

      fontWeight:
        "800",
    },

    statusText: {
      marginTop:
        4,

      color:
        COLORS.textSoft,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    statusOk: {
      color:
        COLORS.ok,
    },

    statusWarn: {
      color:
        "#7a5400",
    },

    statusErr: {
      color:
        COLORS.danger,
    },

    /* =====================
       MODALS
    ===================== */

    modalOverlay: {
      flex:
        1,

      justifyContent:
        "center",

      padding:
        20,

      backgroundColor:
        "rgba(16,19,24,0.55)",
    },

    modalCard: {
      width:
        "100%",

      maxWidth:
        520,

      alignSelf:
        "center",

      padding:
        16,

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        "#ffffff",

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 10,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        22,

      elevation:
        8,
    },

    modalCardLarge: {
      width:
        "100%",

      maxWidth:
        540,

      maxHeight:
        "88%",

      alignSelf:
        "center",

      padding:
        16,

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      backgroundColor:
        "#ffffff",
    },

    modalTitle: {
      marginBottom:
        10,

      color:
        COLORS.text,

      fontSize:
        18,

      fontWeight:
        "900",
    },

    modalOption: {
      minHeight:
        48,

      justifyContent:
        "center",

      paddingHorizontal:
        10,

      paddingVertical:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.line,
    },

    modalOptionActive: {
      backgroundColor:
        "rgba(31,111,235,0.07)",
    },

    modalOptionText: {
      color:
        COLORS.text,

      fontSize:
        15,

      fontWeight:
        "700",
    },

    modalOptionTextActive: {
      color:
        COLORS.blue,

      fontWeight:
        "900",
    },

    modalCancelButton: {
      marginTop:
        12,

      minHeight:
        44,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        11,

      backgroundColor:
        "#ffffff",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    modalCancelButtonText: {
      color:
        COLORS.text,

      fontSize:
        13,

      fontWeight:
        "900",
    },

    modalButtonRow: {
      flexDirection:
        "row",

      marginTop:
        12,
    },

    modalCancelButtonHalf: {
      flex:
        1,

      marginRight:
        6,

      minHeight:
        44,

      borderWidth:
        1,

      borderColor:
        COLORS.line,

      borderRadius:
        11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#ffffff",
    },

    modalSaveButtonHalf: {
      flex:
        1,

      marginLeft:
        6,

      minHeight:
        44,

      borderRadius:
        11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.darkButton,
    },

    modalSaveButtonText: {
      color:
        "#ffffff",

      fontSize:
        13,

      fontWeight:
        "900",
    },

    /* =================================================
       EMERGENCY MODE
    ================================================= */

    emergencyScreen: {
      flex:
        1,

      backgroundColor:
        "#8e1212",
    },

    emergencyScroll: {
      flex:
        1,

      backgroundColor:
        "#8e1212",
    },

    emergencyContent: {
      width:
        "100%",

      maxWidth:
        860,

      alignSelf:
        "center",

      paddingHorizontal:
        8,

      paddingTop:
        8,

      paddingBottom:
        30,
    },

    emergencyHeader: {
      paddingBottom:
        8,

      marginBottom:
        6,

      borderBottomWidth:
        1,

      borderBottomColor:
        "rgba(255,255,255,0.14)",
    },

    emergencyHeading: {
      width:
        "100%",
    },

    emergencyTitle: {
      color:
        "#ffffff",

      fontSize:
        18,

      fontWeight:
        "950",

      letterSpacing:
        -0.2,
    },

    emergencySub: {
      marginTop:
        2,

      color:
        "#ffffff",

      fontSize:
        10,

      lineHeight:
        14,

      fontWeight:
        "800",

      opacity:
        0.92,
    },

    emergencyDisclaimer: {
      marginTop:
        6,

      paddingHorizontal:
        8,

      paddingVertical:
        7,

      borderWidth:
        1,

      borderColor:
        "rgba(255,193,7,0.65)",

      borderRadius:
        10,

      backgroundColor:
        "rgba(255,193,7,0.12)",
    },

    emergencyDisclaimerText: {
      color:
        "#ffffff",

      fontSize:
        10,

      lineHeight:
        14,

      fontWeight:
        "700",
    },

    emergencyMetaRow: {
      marginTop:
        8,

      flexDirection:
        "row",

      alignItems:
        "flex-end",

      justifyContent:
        "space-between",
    },

    emergencyProfileMeta: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginRight:
        8,
    },

    emergencyProfileImage: {
      width:
        62,

      height:
        62,

      borderRadius:
        31,

      marginRight:
        10,

      borderWidth:
        3,

      borderColor:
        "rgba(255,255,255,0.8)",
    },

    emergencyProfileText: {
      flex:
        1,

      minWidth:
        0,
    },

    emergencyMetaLabel: {
      color:
        "#ffffff",

      fontSize:
        9.5,

      fontWeight:
        "900",

      opacity:
        0.92,
    },

    emergencyMetaValue: {
      marginTop:
        1,

      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "900",
    },

    emergencyLanguageButton: {
      width:
        145,

      minWidth:
        145,

      height:
        52,

      paddingHorizontal:
        12,

      borderRadius:
        14,

      borderWidth:
        2,

      borderColor:
        "rgba(255,255,255,0.48)",

      backgroundColor:
        "rgba(0,0,0,0.24)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emergencyLanguageButtonText: {
      color:
        "#ffffff",

      fontSize:
        14,

      fontWeight:
        "900",
    },

    emergencyCloseButton: {
      alignSelf:
        "flex-end",

      marginTop:
        8,

      paddingHorizontal:
        12,

      paddingVertical:
        9,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.22)",

      borderRadius:
        999,

      backgroundColor:
        "rgba(0,0,0,0.18)",
    },

    emergencyCloseButtonText: {
      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "900",
    },

    /* =====================
       CALL GRID
    ===================== */

    emergencyCallGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      marginTop:
        5,

      marginBottom:
        2,
    },

    emergencyCallButton: {
      width:
        "49%",

      minHeight:
        58,

      marginBottom:
        5,

      paddingHorizontal:
        5,

      paddingVertical:
        6,

      borderRadius:
        9,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.20)",

      backgroundColor:
        "rgba(0,0,0,0.18)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emergencyCallButtonPrimary: {
      backgroundColor:
        "rgba(255,255,255,0.19)",
    },

    emergencyCallIcon: {
      color:
        "#ffffff",

      fontSize:
        13,

      marginBottom:
        1,
    },

    emergencyCallLabel: {
      color:
        "#ffffff",

      fontSize:
        9,

      lineHeight:
        11,

      textAlign:
        "center",

      fontWeight:
        "800",
    },

    emergencyCallNumber: {
      marginTop:
        2,

      color:
        "#ffffff",

      fontSize:
        15,

      lineHeight:
        17,

      fontWeight:
        "950",
    },

    /* =====================
       EMERGENCY DOCS
    ===================== */

    emergencyDocuments: {
      marginTop:
        5,

      padding:
        8,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.24)",

      borderRadius:
        11,

      backgroundColor:
        "rgba(0,0,0,0.14)",
    },

    emergencyDocumentsHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    emergencyDocumentsTitle: {
      flex:
        1,

      color:
        "#ffffff",

      fontSize:
        10,

      fontWeight:
        "900",

      textTransform:
        "uppercase",
    },

    emergencyDocumentsBadge: {
      minWidth:
        27,

      height:
        27,

      borderRadius:
        14,

      paddingHorizontal:
        7,

      backgroundColor:
        "rgba(255,255,255,0.16)",

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.24)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emergencyDocumentsBadgeText: {
      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "950",
    },

    emergencyDocumentsText: {
      marginTop:
        4,

      color:
        "#ffffff",

      fontSize:
        11,

      lineHeight:
        14,

      fontWeight:
        "800",
    },

    emergencyDocumentButton: {
      minHeight:
        38,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        8,

      paddingVertical:
        6,

      marginBottom:
        5,

      borderRadius:
        9,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.20)",

      backgroundColor:
        "rgba(0,0,0,0.18)",
    },

    emergencyDocumentName: {
      flex:
        1,

      marginRight:
        8,

      color:
        "#ffffff",

      fontSize:
        10.5,

      fontWeight:
        "900",
    },

    emergencyDocumentOpen: {
      color:
        "#ffffff",

      fontSize:
        10,

      fontWeight:
        "950",
    },

    /* =====================
       EMERGENCY DATA GRID
    ===================== */

    emergencyGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      marginTop:
        7,
    },

    emergencyCard: {
      width:
        "49%",

      minHeight:
        68,

      marginBottom:
        7,

      paddingHorizontal:
        10,

      paddingVertical:
        9,

      borderRadius:
        11,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.18)",

      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    emergencyCardFull: {
      /*
        Native kann :has() aus CSS nicht
        exakt nachbilden; wir halten die
        Karten dennoch kompakt zweispaltig.
      */
    },

    emergencyCardCritical: {
      borderColor:
        "rgba(255,255,255,0.28)",

      backgroundColor:
        "rgba(110,0,0,0.22)",
    },

    emergencyCardLabel: {
      marginBottom:
        5,

      color:
        "#ffffff",

      fontSize:
        9,

      fontWeight:
        "900",

      letterSpacing:
        0.25,

      textTransform:
        "uppercase",
    },

    emergencyCardValue: {
      color:
        "#ffffff",

      fontSize:
        14,

      lineHeight:
        18,

      fontWeight:
        "900",
    },

    /* =====================
       EMERGENCY CONTACT
    ===================== */

    emergencyContact: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom:
        7,

      padding:
        8,

      borderRadius:
        11,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.18)",

      backgroundColor:
        "rgba(0,0,0,0.14)",
    },

    emergencyContactName: {
      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "950",
    },

    emergencyContactPhone: {
      marginTop:
        2,

      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "900",
    },

    emergencyContactButton: {
      marginLeft:
        7,

      paddingHorizontal:
        8,

      paddingVertical:
        7,

      borderRadius:
        9,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.20)",

      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    emergencyContactButtonText: {
      color:
        "#ffffff",

      fontSize:
        10,

      fontWeight:
        "950",
    },

    emergencyHint: {
      marginTop:
        7,

      color:
        "#ffffff",

      fontSize:
        10,

      lineHeight:
        14,

      fontWeight:
        "800",

      opacity:
        0.92,
    },

    /* =====================
       EMERGENCY COUNTRY
    ===================== */

    emergencyCountryBox: {
      marginTop:
        8,

      padding:
        9,

      borderRadius:
        12,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.18)",

      backgroundColor:
        "rgba(0,0,0,0.14)",
    },

    emergencyCountryLabel: {
      marginBottom:
        6,

      color:
        "#ffffff",

      fontSize:
        9,

      fontWeight:
        "900",

      letterSpacing:
        0.3,

      textTransform:
        "uppercase",
    },

    emergencyCountrySelect: {
      minHeight:
        40,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        10,

      paddingVertical:
        7,

      borderRadius:
        10,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.28)",

      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    emergencyCountrySelectText: {
      color:
        "#ffffff",

      fontSize:
        12,

      fontWeight:
        "900",
    },

    emergencyCountryHint: {
      marginTop:
        7,

      color:
        "#ffffff",

      fontSize:
        10,

      lineHeight:
        14,

      fontWeight:
        "800",
    },

    /* =====================
       EMERGENCY VACCINES
    ===================== */

    emergencyVaccines: {
      marginTop:
        8,

      borderWidth:
        1,

      borderColor:
        "rgba(255,255,255,0.18)",

      borderRadius:
        12,

      backgroundColor:
        "rgba(0,0,0,0.14)",

      overflow:
        "hidden",
    },

    emergencyVaccinesHeader: {
      minHeight:
        40,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        12,

      paddingVertical:
        9,
    },

    emergencyVaccinesTitle: {
      color:
        "#ffffff",

      fontSize:
        11,

      fontWeight:
        "900",

      textTransform:
        "uppercase",
    },

    emergencyVaccinesToggle: {
      color:
        "#ffffff",

      fontSize:
        18,

      fontWeight:
        "900",
    },

    emergencyVaccinesText: {
      paddingHorizontal:
        12,

      paddingBottom:
        10,

      color:
        "#ffffff",

      fontSize:
        12,

      lineHeight:
        17,

      fontWeight:
        "800",
    },
  });