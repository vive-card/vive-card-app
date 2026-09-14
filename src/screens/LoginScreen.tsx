import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const SUPABASE_URL = "https://uyrvuekhvczbjvpbequv.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cnZ1ZWtodmN6Ymp2cGJlcXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjA1OTAsImV4cCI6MjA4NjkzNjU5MH0.-6Fia8CGlMxKf6xPGAZK-kFfUXtCtqXH7etfFtMJ1OU";

const LANG_OPTIONS = ["de", "it", "fr", "es", "en"] as const;

type Lang = (typeof LANG_OPTIONS)[number];

type MessageState = {
  text: string;
  type: "" | "ok" | "err";
};

const LANGUAGE_NAMES: Record<Lang, string> = {
  de: "Deutsch 🇩🇪",
  it: "Italiano 🇮🇹",
  fr: "Français 🇫🇷",
  es: "Español 🇪🇸",
  en: "English 🇬🇧",
};

const I18N: Record<Lang, Record<string, string>> = {
  de: {
    pill: "🔒 Login / VIVE CARD",
    email_label: "E-Mail",
    pw_label: "Passwort",
    pw_toggle: "ANZEIGEN",
    pw_hide: "VERBERGEN",
    forgot_pw: "Passwort vergessen?",

    reset_title: "Passwort zurücksetzen",
    new_pw_label: "Neues Passwort",
    new_pw2_label: "Neues Passwort wiederholen",
    btn_reset_pw: "Passwort ändern",
    reset_hint:
      "Hinweis: Nach dem Ändern kannst du dich direkt einloggen.",

    btn_login: "Login",
    btn_signup: "Konto erstellen",
    btn_order: "VIVE CARD bestellen",
    btn_about: "Was ist VIVE CARD?",
    btn_block: "Karte sperren / deaktivieren",

    terms_prefix: "Ich akzeptiere die",
    terms_and: "und die",
    terms_agb: "AGB",
    terms_usage: "Nutzungsvereinbarung",
    btn_accept: "Akzeptieren & weiter",

    pid_label: "Karte (PUBLIC_ID)",
    public_id_label: "PUBLIC_ID",
    claim_hint:
      "Sobald du eingeloggt bist, kann deine Karte mit deinem Konto verbunden werden.",
    btn_claim: "Karte aktivieren",
    claim_already: "Bereits aktiviert",

    link_impressum: "Impressum",
    link_privacy: "Datenschutz",
    link_agb: "AGB",
    link_usage: "Nutzungsvereinbarung",

    err_enter: "Bitte E-Mail und Passwort eingeben.",
    err_enter_email: "Bitte E-Mail eingeben.",
    err_login: "Login fehlgeschlagen: ",
    err_signup: "Konto erstellen fehlgeschlagen: ",
    err_user_missing: "Login ok, aber User fehlt. Bitte neu einloggen.",
    err_profile: "Profil konnte nicht geladen werden: ",
    err_save: "Speichern fehlgeschlagen: ",
    err_relogin: "Bitte neu einloggen.",

    need_terms: "Bitte AGB & Nutzungsvereinbarung akzeptieren.",
    need_privacy_claim:
      "Bitte bestätige zuerst den Datenschutzhinweis zur Kartenaktivierung.",
    need_pid:
      "Bitte PUBLIC_ID eingeben und anschließend die Karte aktivieren.",

    err_pid: "Bitte PUBLIC_ID eingeben.",
    err_login_first: "Bitte zuerst einloggen.",
    err_claim: "Aktivierung fehlgeschlagen: ",
    err_claim_rpc: "Aktivierungsfehler: RPC nicht verfügbar.",

    terms_ok: "AGB akzeptiert.",
    privacy_claim_ok: "Datenschutzhinweis akzeptiert.",

    signup_ok:
      "Konto erstellt. Bitte bestätige jetzt deine E-Mail über den Link in deinem Postfach.",

    err_reset: "Reset fehlgeschlagen: ",
    reset_sent:
      "E-Mail zum Zurücksetzen wurde versendet. Bitte Postfach prüfen.",
    err_pw_short: "Passwort zu kurz (mind. 6 Zeichen).",
    err_pw_match: "Passwörter stimmen nicht überein.",
    err_reset_apply: "Passwort-Änderung fehlgeschlagen: ",
    reset_ok:
      "Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.",

    pid_detected_login:
      "PUBLIC_ID erkannt. Bitte einloggen und anschließend die Karte aktivieren.",
    pid_detected: "PUBLIC_ID erkannt.",
    claim_ok: "VIVE CARD erfolgreich aktiviert.",

    err_pid_save: "PUBLIC_ID konnte nicht gespeichert werden: ",
    err_privacy_save:
      "Datenschutzzustimmung konnte nicht gespeichert werden: ",

    terms_intro:
      "Bevor du deine VIVE CARD aktivieren kannst, bestätige bitte die AGB und Nutzungsvereinbarung.",

    privacy_claim_title: "Datenschutzhinweis zur Kartenaktivierung",

    privacy_claim_body:
      "Mit der Aktivierung deiner VIVE CARD können freiwillig persönliche Informationen gespeichert werden, einschliesslich möglicher Gesundheitsdaten wie z. B. Allergien, Medikamente, Blutgruppe oder Notfallhinweise.\n\nDiese Angaben werden ausschliesslich von dir bereitgestellt und verwaltet.\n\nBitte speichere nur Daten, deren Verarbeitung du ausdrücklich wünschst.",

    privacy_claim_checkbox:
      "Ich habe den Datenschutzhinweis zur Kartenaktivierung gelesen und bin damit einverstanden, dass von mir freiwillig eingegebene persönliche Daten – einschliesslich möglicher Gesundheitsdaten – im Rahmen meiner VIVE CARD gespeichert werden.",

    btn_accept_privacy_claim: "Datenschutzhinweis akzeptieren",

    claim_notice_title: "VIVE CARD erkannt",
    claim_notice_text:
      "Bitte prüfe deine PUBLIC_ID und aktiviere anschliessend deine VIVE CARD.",

    claim_success_title:
      "✅ Deine VIVE CARD wurde erfolgreich aktiviert",

    claim_success_text:
      "Deine Karte ist jetzt mit deinem Konto verbunden. Du kannst nun dein Profil und deine Notfallinformationen ausfüllen.\n\nFalls du weitere Karten bestellt hast, öffne einfach den nächsten Aktivierungslink aus deiner E-Mail und wiederhole den Vorgang.",

    btn_go_profile: "Profil ausfüllen",

    signup_title: "Konto erstellen",
    signup_password_ph: "Mindestens 6 Zeichen",
    signup_password2_ph: "Passwort wiederholen",
    signup_pw2_label: "Passwort wiederholen",
    btn_signup_start: "Registrierung starten",

    signup_hint:
      "Nach dem Klick erhältst du eine Bestätigungs-E-Mail. Danach kannst du dein Konto aktivieren und deine VIVE CARD zuordnen.",

    block_card_title: "Karte sperren / deaktivieren",

    block_card_intro:
      "Wenn deine Karte verloren wurde oder deaktiviert werden soll, sende hier eine Sperranfrage. Bitte gib die E-Mail-Adresse und die PUBLIC_ID an, die mit der Karte verknüpft sind.",

    block_reason_label: "Grund (optional)",

    block_reason_ph:
      "z. B. Karte verloren, falsche Zuordnung, Konto löschen",

    btn_block_card_submit: "Sperranfrage senden",

    block_card_hint:
      "Die Anfrage wird an den Support weitergeleitet. Danach wird die Karte manuell geprüft und gesperrt bzw. deaktiviert.",

    err_valid_email: "Bitte eine gültige E-Mail eingeben.",

    err_accept_terms_first:
      "Bitte akzeptiere zuerst die AGB und die Nutzungsvereinbarung.",

    err_signup_failed_generic: "Registrierung fehlgeschlagen.",

    err_block_card_request:
      "Sperranfrage konnte nicht gesendet werden.",

    block_card_success:
      "Deine Sperranfrage wurde erfolgreich übermittelt. Die Karte wurde sofort gesperrt und unser Support prüft den Fall schnellstmöglich.",

    err_confirm_email_first:
      "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.",

    card_status_check_failed:
      "Kartenstatus konnte nicht geprüft werden: ",

    card_blocked:
      "Diese VIVE CARD wurde gesperrt oder deaktiviert.",

    alert_error_title: "Fehler",
    alert_open_link_failed: "Link konnte nicht geöffnet werden",

    alert_card_activated_title: "VIVE CARD aktiviert",

    alert_card_activated_text:
      "Deine Karte wurde aktiviert. Durch die aktive Session wechselst du nun in die App.",

    pid_ph: "z. B. PVJ2AT5B6Y",

    activation_guide_title:
      "So aktivieren Sie Ihre VIVE CARD",

    activation_guide_step_1:
      "Bestellen Sie Ihre VIVE CARD.",

    activation_guide_step_2:
      "Sie erhalten eine E-Mail mit Ihrer PUBLIC_ID.",

    activation_guide_step_3:
      "Erstellen Sie über „Konto erstellen“ ein Konto.",

    activation_guide_step_4:
      "Sie erhalten eine E-Mail zur Bestätigung Ihres Kontos.",

    activation_guide_step_5:
      "Bestätigen Sie Ihre E-Mail-Adresse. Anschliessend können Sie sich anmelden.",

    activation_guide_step_6:
      "Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.",

    activation_guide_step_7:
      "Akzeptieren Sie den Datenschutzhinweis zur Kartenaktivierung.",

    activation_guide_step_8:
      "Geben Sie Ihre PUBLIC_ID ein und wählen Sie „Karte aktivieren“.",

    activation_guide_step_9:
      "Füllen Sie anschliessend Ihr persönliches Profil aus.",
  },

  it: {
    pill: "🔒 Login / VIVE CARD",
    email_label: "E-mail",
    pw_label: "Password",
    pw_toggle: "MOSTRA",
    pw_hide: "NASCONDI",
    forgot_pw: "Password dimenticata?",

    reset_title: "Reimposta password",
    new_pw_label: "Nuova password",
    new_pw2_label: "Ripeti nuova password",
    btn_reset_pw: "Cambia password",
    reset_hint:
      "Dopo la modifica puoi accedere direttamente.",

    btn_login: "Login",
    btn_signup: "Crea account",
    btn_order: "Ordina VIVE CARD",
    btn_about: "Cos'è VIVE CARD?",
    btn_block: "Blocca / disattiva carta",

    terms_prefix: "Accetto i",
    terms_and: "e le",
    terms_agb: "Termini e condizioni",
    terms_usage: "Condizioni d'uso",
    btn_accept: "Accetta e continua",

    pid_label: "Carta (PUBLIC_ID)",
    public_id_label: "PUBLIC_ID",

    claim_hint:
      "Dopo il login puoi collegare la carta al tuo account.",

    btn_claim: "Attiva carta",
    claim_already: "Già attivata",

    link_impressum: "Note legali",
    link_privacy: "Privacy",
    link_agb: "Termini",
    link_usage: "Condizioni d'uso",

    err_enter: "Inserisci e-mail e password.",
    err_enter_email: "Inserisci un'e-mail.",
    err_login: "Login fallito: ",
    err_signup: "Registrazione fallita: ",
    err_user_missing: "Utente mancante.",
    err_profile: "Errore caricamento profilo: ",
    err_save: "Salvataggio fallito: ",
    err_relogin: "Effettua nuovamente il login.",

    need_terms: "Accetta prima i termini.",
    need_privacy_claim:
      "Accetta prima l'informativa privacy.",
    need_pid: "Inserisci la PUBLIC_ID.",

    err_pid: "Inserisci la PUBLIC_ID.",
    err_login_first: "Effettua prima il login.",
    err_claim: "Attivazione fallita: ",
    err_claim_rpc: "Errore RPC.",

    terms_ok: "Termini accettati.",
    privacy_claim_ok: "Privacy accettata.",

    signup_ok:
      "Account creato. Controlla la tua e-mail per confermare il tuo account.",

    err_reset: "Reset fallito: ",
    reset_sent: "E-mail di reset inviata.",
    err_pw_short: "Password troppo corta.",
    err_pw_match: "Le password non coincidono.",
    err_reset_apply: "Errore cambio password: ",
    reset_ok: "Password aggiornata.",

    pid_detected_login:
      "PUBLIC_ID rilevata. Effettua il login.",
    pid_detected: "PUBLIC_ID rilevata.",
    claim_ok: "Carta attivata.",

    err_pid_save: "Errore salvataggio PUBLIC_ID: ",
    err_privacy_save: "Errore salvataggio privacy: ",

    terms_intro:
      "Accetta i termini prima di attivare la carta.",

    privacy_claim_title:
      "Informativa sulla privacy per l’attivazione della carta",

    privacy_claim_body:
      "Con l’attivazione della tua VIVE CARD puoi salvare volontariamente informazioni personali, compresi eventuali dati sanitari come allergie, farmaci, gruppo sanguigno o indicazioni di emergenza.\n\nQuesti dati vengono forniti e gestiti esclusivamente da te.\n\nSalva solamente i dati di cui desideri espressamente il trattamento.",

    privacy_claim_checkbox:
      "Ho letto l’informativa sulla privacy relativa all’attivazione della carta e acconsento che i dati personali inseriti volontariamente da me – compresi eventuali dati sanitari – vengano salvati nell’ambito della mia VIVE CARD.",

    btn_accept_privacy_claim:
      "Accetta l’informativa sulla privacy",

    claim_notice_title: "VIVE CARD riconosciuta",

    claim_notice_text:
      "Controlla la tua PUBLIC_ID e attiva successivamente la tua VIVE CARD.",

    claim_success_title:
      "✅ La tua VIVE CARD è stata attivata",

    claim_success_text:
      "La tua carta è ora collegata al tuo account. Puoi compilare il tuo profilo e le informazioni di emergenza.",

    btn_go_profile: "Completa profilo",

    signup_title: "Crea account",
    signup_password_ph: "Almeno 6 caratteri",
    signup_password2_ph: "Ripeti password",
    signup_pw2_label: "Ripeti password",
    btn_signup_start: "Avvia registrazione",

    signup_hint:
      "Riceverai un'e-mail di conferma.",

    block_card_title: "Blocca / disattiva carta",

    block_card_intro:
      "Invia una richiesta se la tua carta deve essere bloccata o disattivata.",

    block_reason_label: "Motivo (opzionale)",
    block_reason_ph: "es. carta smarrita",
    btn_block_card_submit: "Invia richiesta",

    block_card_hint:
      "Il supporto esaminerà la richiesta.",

    err_valid_email: "Inserisci un'e-mail valida.",

    err_accept_terms_first:
      "Accetta prima i termini.",

    err_signup_failed_generic: "Registrazione fallita.",

    err_block_card_request:
      "Errore richiesta blocco.",

    block_card_success:
      "Richiesta inviata con successo.",

    err_confirm_email_first:
      "Conferma prima la tua e-mail.",

    card_status_check_failed:
      "Errore controllo carta: ",

    card_blocked:
      "Questa carta è bloccata.",

    alert_error_title: "Errore",

    alert_open_link_failed:
      "Impossibile aprire il link",

    alert_card_activated_title:
      "VIVE CARD attivata",

    alert_card_activated_text:
      "La carta è stata attivata.",

    pid_ph: "es. PVJ2AT5B6Y",

    activation_guide_title:
      "Come attivare la tua VIVE CARD",

    activation_guide_step_1:
      "Ordina la tua VIVE CARD.",

    activation_guide_step_2:
      "Riceverai un'e-mail con la tua PUBLIC_ID.",

    activation_guide_step_3:
      "Crea un account.",

    activation_guide_step_4:
      "Conferma il tuo account tramite e-mail.",

    activation_guide_step_5:
      "Conferma il tuo indirizzo e-mail.",

    activation_guide_step_6:
      "Accedi con e-mail e password.",

    activation_guide_step_7:
      "Accetta l'informativa privacy.",

    activation_guide_step_8:
      "Inserisci la PUBLIC_ID e attiva la carta.",

    activation_guide_step_9:
      "Completa il tuo profilo.",
  },

  fr: {
    pill: "🔒 Connexion / VIVE CARD",
    email_label: "E-mail",
    pw_label: "Mot de passe",
    pw_toggle: "AFFICHER",
    pw_hide: "MASQUER",
    forgot_pw: "Mot de passe oublié ?",

    reset_title: "Réinitialiser le mot de passe",
    new_pw_label: "Nouveau mot de passe",
    new_pw2_label: "Confirmer le mot de passe",
    btn_reset_pw: "Modifier le mot de passe",
    reset_hint:
      "Vous pouvez ensuite vous reconnecter.",

    btn_login: "Connexion",
    btn_signup: "Créer un compte",
    btn_order: "Commander VIVE CARD",
    btn_about: "Qu’est-ce que VIVE CARD ?",
    btn_block: "Bloquer / désactiver la carte",

    terms_prefix: "J’accepte les",
    terms_and: "et les",
    terms_agb: "Conditions générales",
    terms_usage: "Conditions d’utilisation",
    btn_accept: "Accepter et continuer",

    pid_label: "Carte (PUBLIC_ID)",
    public_id_label: "PUBLIC_ID",

    claim_hint:
      "Une fois connecté, vous pouvez associer votre carte à votre compte.",

    btn_claim: "Activer la carte",
    claim_already: "Déjà activée",

    link_impressum: "Mentions légales",
    link_privacy: "Confidentialité",
    link_agb: "Conditions",
    link_usage: "Utilisation",

    err_enter:
      "Veuillez saisir votre e-mail et votre mot de passe.",

    err_enter_email:
      "Veuillez saisir une adresse e-mail.",

    err_login: "Échec de la connexion : ",
    err_signup: "Échec de l’inscription : ",
    err_user_missing: "Utilisateur introuvable.",
    err_profile: "Erreur de chargement : ",
    err_save: "Erreur lors de l’enregistrement : ",
    err_relogin: "Veuillez vous reconnecter.",

    need_terms:
      "Veuillez accepter les conditions.",

    need_privacy_claim:
      "Veuillez accepter la politique de confidentialité.",

    need_pid:
      "Veuillez saisir la PUBLIC_ID.",

    err_pid:
      "Veuillez saisir la PUBLIC_ID.",

    err_login_first:
      "Veuillez d’abord vous connecter.",

    err_claim:
      "Échec de l’activation : ",

    err_claim_rpc:
      "Erreur RPC.",

    terms_ok:
      "Conditions acceptées.",

    privacy_claim_ok:
      "Confidentialité acceptée.",

    signup_ok:
      "Compte créé. Veuillez confirmer votre e-mail.",

    err_reset:
      "Échec de la réinitialisation : ",

    reset_sent:
      "E-mail de réinitialisation envoyé.",

    err_pw_short:
      "Mot de passe trop court.",

    err_pw_match:
      "Les mots de passe ne correspondent pas.",

    err_reset_apply:
      "Erreur de modification : ",

    reset_ok:
      "Mot de passe mis à jour.",

    pid_detected_login:
      "PUBLIC_ID détectée. Veuillez vous connecter.",

    pid_detected:
      "PUBLIC_ID détectée.",

    claim_ok:
      "Carte activée.",

    err_pid_save:
      "Erreur PUBLIC_ID : ",

    err_privacy_save:
      "Erreur de confidentialité : ",

    terms_intro:
      "Veuillez accepter les conditions avant d’activer votre carte.",

    privacy_claim_title:
      "Avis de confidentialité relatif à l’activation de la carte",

    privacy_claim_body:
      "Lors de l’activation de votre VIVE CARD, vous pouvez enregistrer volontairement des informations personnelles, y compris d’éventuelles données de santé telles que des allergies, des médicaments, votre groupe sanguin ou des indications d’urgence.\n\nCes informations sont exclusivement fournies et gérées par vous.",

    privacy_claim_checkbox:
      "J’ai lu l’avis de confidentialité et j’accepte que les données personnelles que je saisis volontairement soient enregistrées dans le cadre de ma VIVE CARD.",

    btn_accept_privacy_claim:
      "Accepter l’avis de confidentialité",

    claim_notice_title:
      "VIVE CARD reconnue",

    claim_notice_text:
      "Veuillez vérifier votre PUBLIC_ID puis activer votre VIVE CARD.",

    claim_success_title:
      "✅ Votre VIVE CARD a été activée",

    claim_success_text:
      "Votre carte est maintenant liée à votre compte.",

    btn_go_profile:
      "Compléter le profil",

    signup_title:
      "Créer un compte",

    signup_password_ph:
      "Au moins 6 caractères",

    signup_password2_ph:
      "Répéter le mot de passe",

    signup_pw2_label:
      "Confirmer le mot de passe",

    btn_signup_start:
      "Démarrer l’inscription",

    signup_hint:
      "Vous recevrez un e-mail de confirmation.",

    block_card_title:
      "Bloquer / désactiver la carte",

    block_card_intro:
      "Envoyez une demande pour bloquer ou désactiver votre carte.",

    block_reason_label:
      "Motif (optionnel)",

    block_reason_ph:
      "ex. carte perdue",

    btn_block_card_submit:
      "Envoyer la demande",

    block_card_hint:
      "Le support examinera votre demande.",

    err_valid_email:
      "Veuillez saisir une adresse e-mail valide.",

    err_accept_terms_first:
      "Veuillez accepter les conditions.",

    err_signup_failed_generic:
      "Échec de l'inscription.",

    err_block_card_request:
      "Échec de la demande de blocage.",

    block_card_success:
      "Demande envoyée avec succès.",

    err_confirm_email_first:
      "Veuillez confirmer votre e-mail.",

    card_status_check_failed:
      "Échec de la vérification : ",

    card_blocked:
      "Cette carte est bloquée.",

    alert_error_title:
      "Erreur",

    alert_open_link_failed:
      "Le lien n'a pas pu être ouvert",

    alert_card_activated_title:
      "VIVE CARD activée",

    alert_card_activated_text:
      "Votre carte a été activée.",

    pid_ph:
      "ex. PVJ2AT5B6Y",

    activation_guide_title:
      "Comment activer votre VIVE CARD",

    activation_guide_step_1:
      "Commandez votre VIVE CARD.",

    activation_guide_step_2:
      "Vous recevrez votre PUBLIC_ID par e-mail.",

    activation_guide_step_3:
      "Créez un compte.",

    activation_guide_step_4:
      "Confirmez votre compte par e-mail.",

    activation_guide_step_5:
      "Confirmez votre adresse e-mail.",

    activation_guide_step_6:
      "Connectez-vous.",

    activation_guide_step_7:
      "Acceptez l’avis de confidentialité.",

    activation_guide_step_8:
      "Saisissez votre PUBLIC_ID.",

    activation_guide_step_9:
      "Complétez votre profil.",
  },

  es: {
    pill: "🔒 Acceso / VIVE CARD",
    email_label: "Correo electrónico",
    pw_label: "Contraseña",
    pw_toggle: "MOSTRAR",
    pw_hide: "OCULTAR",
    forgot_pw: "¿Olvidaste tu contraseña?",

    reset_title: "Restablecer contraseña",
    new_pw_label: "Nueva contraseña",
    new_pw2_label: "Repetir contraseña",
    btn_reset_pw: "Cambiar contraseña",
    reset_hint:
      "Después podrás iniciar sesión.",

    btn_login: "Iniciar sesión",
    btn_signup: "Crear cuenta",
    btn_order: "Pedir VIVE CARD",
    btn_about: "¿Qué es VIVE CARD?",
    btn_block: "Bloquear / desactivar tarjeta",

    terms_prefix: "Acepto los",
    terms_and: "y las",
    terms_agb: "Términos",
    terms_usage: "Condiciones de uso",
    btn_accept: "Aceptar y continuar",

    pid_label: "Tarjeta (PUBLIC_ID)",
    public_id_label: "PUBLIC_ID",

    claim_hint:
      "Después de iniciar sesión puedes vincular tu tarjeta.",

    btn_claim: "Activar tarjeta",
    claim_already: "Ya activada",

    link_impressum: "Aviso legal",
    link_privacy: "Privacidad",
    link_agb: "Términos",
    link_usage: "Condiciones de uso",

    err_enter: "Introduce correo y contraseña.",
    err_enter_email: "Introduce un correo electrónico.",
    err_login: "Error al iniciar sesión: ",
    err_signup: "Error en el registro: ",
    err_user_missing: "Usuario no encontrado.",
    err_profile: "Error al cargar perfil: ",
    err_save: "Error al guardar: ",
    err_relogin: "Vuelve a iniciar sesión.",

    need_terms: "Acepta los términos.",
    need_privacy_claim:
      "Acepta la política de privacidad.",
    need_pid: "Introduce la PUBLIC_ID.",

    err_pid: "Introduce la PUBLIC_ID.",
    err_login_first: "Primero inicia sesión.",
    err_claim: "Error al activar: ",
    err_claim_rpc: "Error RPC.",

    terms_ok: "Términos aceptados.",
    privacy_claim_ok: "Privacidad aceptada.",

    signup_ok:
      "Cuenta creada. Revisa tu correo.",

    err_reset: "Error al restablecer: ",
    reset_sent: "Correo enviado.",
    err_pw_short: "Contraseña demasiado corta.",
    err_pw_match: "Las contraseñas no coinciden.",
    err_reset_apply: "Error al cambiar contraseña: ",
    reset_ok: "Contraseña actualizada.",

    pid_detected_login:
      "PUBLIC_ID detectada. Inicia sesión.",

    pid_detected: "PUBLIC_ID detectada.",
    claim_ok: "Tarjeta activada.",

    err_pid_save: "Error al guardar PUBLIC_ID: ",
    err_privacy_save: "Error al guardar privacidad: ",

    terms_intro:
      "Acepta los términos antes de activar la tarjeta.",

    privacy_claim_title:
      "Aviso de privacidad para la activación de la tarjeta",

    privacy_claim_body:
      "Al activar tu VIVE CARD puedes guardar voluntariamente información personal, incluidos posibles datos de salud como alergias, medicamentos, grupo sanguíneo o indicaciones de emergencia.\n\nEstos datos son proporcionados y gestionados exclusivamente por ti.",

    privacy_claim_checkbox:
      "He leído el aviso de privacidad y acepto que los datos personales introducidos voluntariamente se guarden como parte de mi VIVE CARD.",

    btn_accept_privacy_claim:
      "Aceptar aviso de privacidad",

    claim_notice_title:
      "VIVE CARD reconocida",

    claim_notice_text:
      "Comprueba tu PUBLIC_ID y activa tu VIVE CARD.",

    claim_success_title:
      "✅ Tarjeta activada correctamente",

    claim_success_text:
      "Tu tarjeta está vinculada a tu cuenta.",

    btn_go_profile:
      "Completar perfil",

    signup_title:
      "Crear cuenta",

    signup_password_ph:
      "Al menos 6 caracteres",

    signup_password2_ph:
      "Repetir contraseña",

    signup_pw2_label:
      "Repetir contraseña",

    btn_signup_start:
      "Iniciar registro",

    signup_hint:
      "Recibirás un correo de confirmación.",

    block_card_title:
      "Bloquear tarjeta",

    block_card_intro:
      "Envía una solicitud para bloquear o desactivar tu tarjeta.",

    block_reason_label:
      "Motivo (opcional)",

    block_reason_ph:
      "ej. tarjeta perdida",

    btn_block_card_submit:
      "Enviar solicitud",

    block_card_hint:
      "El soporte revisará tu caso.",

    err_valid_email:
      "Introduce un correo válido.",

    err_accept_terms_first:
      "Acepta los términos primero.",

    err_signup_failed_generic:
      "Registro fallido.",

    err_block_card_request:
      "Error en solicitud.",

    block_card_success:
      "Solicitud enviada.",

    err_confirm_email_first:
      "Confirma tu correo primero.",

    card_status_check_failed:
      "Error al comprobar tarjeta: ",

    card_blocked:
      "Tarjeta bloqueada.",

    alert_error_title:
      "Error",

    alert_open_link_failed:
      "No se pudo abrir el enlace",

    alert_card_activated_title:
      "VIVE CARD activada",

    alert_card_activated_text:
      "Tu tarjeta ha sido activada.",

    pid_ph:
      "ej. PVJ2AT5B6Y",

    activation_guide_title:
      "Cómo activar tu VIVE CARD",

    activation_guide_step_1:
      "Pide tu VIVE CARD.",

    activation_guide_step_2:
      "Recibirás tu PUBLIC_ID por correo electrónico.",

    activation_guide_step_3:
      "Crea una cuenta.",

    activation_guide_step_4:
      "Confirma tu cuenta.",

    activation_guide_step_5:
      "Confirma tu correo electrónico.",

    activation_guide_step_6:
      "Inicia sesión.",

    activation_guide_step_7:
      "Acepta el aviso de privacidad.",

    activation_guide_step_8:
      "Introduce tu PUBLIC_ID.",

    activation_guide_step_9:
      "Completa tu perfil.",
  },

  en: {
    pill: "🔒 Login / VIVE CARD",
    email_label: "Email",
    pw_label: "Password",
    pw_toggle: "SHOW",
    pw_hide: "HIDE",
    forgot_pw: "Forgot password?",

    reset_title: "Reset password",
    new_pw_label: "New password",
    new_pw2_label: "Repeat new password",
    btn_reset_pw: "Change password",
    reset_hint:
      "You can log in after changing it.",

    btn_login: "Login",
    btn_signup: "Create account",
    btn_order: "Order VIVE CARD",
    btn_about: "What is VIVE CARD?",
    btn_block: "Block / deactivate card",

    terms_prefix: "I accept the",
    terms_and: "and the",
    terms_agb: "Terms",
    terms_usage: "Terms of use",
    btn_accept: "Accept & continue",

    pid_label: "Card (PUBLIC_ID)",
    public_id_label: "PUBLIC_ID",

    claim_hint:
      "Once you are logged in, you can link your card to your account.",

    btn_claim: "Activate card",
    claim_already: "Already activated",

    link_impressum: "Legal notice",
    link_privacy: "Privacy",
    link_agb: "Terms",
    link_usage: "Terms of use",

    err_enter: "Enter email and password.",
    err_enter_email: "Enter email.",
    err_login: "Login failed: ",
    err_signup: "Signup failed: ",
    err_user_missing: "User missing.",
    err_profile: "Profile load failed: ",
    err_save: "Save failed: ",
    err_relogin: "Please log in again.",

    need_terms: "Accept terms first.",
    need_privacy_claim: "Accept privacy notice.",
    need_pid: "Enter PUBLIC_ID.",

    err_pid: "Enter PUBLIC_ID.",
    err_login_first: "Login first.",
    err_claim: "Activation failed: ",
    err_claim_rpc: "RPC error.",

    terms_ok: "Terms accepted.",
    privacy_claim_ok: "Privacy accepted.",

    signup_ok:
      "Account created. Please confirm your email.",

    err_reset: "Reset failed: ",
    reset_sent: "Reset email sent.",
    err_pw_short: "Password too short.",
    err_pw_match: "Passwords do not match.",
    err_reset_apply: "Password change failed: ",
    reset_ok: "Password updated.",

    pid_detected_login:
      "PUBLIC_ID detected. Please login.",

    pid_detected:
      "PUBLIC_ID detected.",

    claim_ok:
      "Card activated.",

    err_pid_save:
      "Save PUBLIC_ID failed: ",

    err_privacy_save:
      "Save privacy failed: ",

    terms_intro:
      "Accept the terms before activating your card.",

    privacy_claim_title:
      "Privacy notice for card activation",

    privacy_claim_body:
      "When activating your VIVE CARD, you may voluntarily store personal information, including possible health data such as allergies, medications, blood group or emergency notes.\n\nThis information is provided and managed exclusively by you.",

    privacy_claim_checkbox:
      "I have read the privacy notice and agree that personal data voluntarily entered by me may be stored as part of my VIVE CARD.",

    btn_accept_privacy_claim:
      "Accept privacy notice",

    claim_notice_title:
      "VIVE CARD detected",

    claim_notice_text:
      "Please check your PUBLIC_ID and activate your VIVE CARD.",

    claim_success_title:
      "✅ Card activated successfully",

    claim_success_text:
      "Your card is now linked to your account.",

    btn_go_profile:
      "Complete profile",

    signup_title:
      "Create account",

    signup_password_ph:
      "At least 6 characters",

    signup_password2_ph:
      "Repeat password",

    signup_pw2_label:
      "Repeat password",

    btn_signup_start:
      "Start signup",

    signup_hint:
      "You will receive a confirmation email.",

    block_card_title:
      "Block / deactivate card",

    block_card_intro:
      "Submit a request to block or deactivate your card.",

    block_reason_label:
      "Reason (optional)",

    block_reason_ph:
      "e.g. lost card",

    btn_block_card_submit:
      "Send request",

    block_card_hint:
      "Support will review the request.",

    err_valid_email:
      "Enter a valid email.",

    err_accept_terms_first:
      "Accept terms first.",

    err_signup_failed_generic:
      "Signup failed.",

    err_block_card_request:
      "Block request failed.",

    block_card_success:
      "Request sent.",

    err_confirm_email_first:
      "Confirm email first.",

    card_status_check_failed:
      "Card check failed: ",

    card_blocked:
      "Card blocked.",

    alert_error_title:
      "Error",

    alert_open_link_failed:
      "The link could not be opened",

    alert_card_activated_title:
      "VIVE CARD activated",

    alert_card_activated_text:
      "Your card has been activated.",

    pid_ph:
      "e.g. PVJ2AT5B6Y",

    activation_guide_title:
      "How to activate your VIVE CARD",

    activation_guide_step_1:
      "Order your VIVE CARD.",

    activation_guide_step_2:
      "You will receive your PUBLIC_ID by email.",

    activation_guide_step_3:
      "Create an account.",

    activation_guide_step_4:
      "Confirm your account by email.",

    activation_guide_step_5:
      "Confirm your email address.",

    activation_guide_step_6:
      "Log in with email and password.",

    activation_guide_step_7:
      "Accept the privacy notice.",

    activation_guide_step_8:
      "Enter your PUBLIC_ID and activate the card.",

    activation_guide_step_9:
      "Complete your personal profile.",
  },
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}

function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default function LoginScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>("de");

  const t = useMemo(
    () => I18N[lang] || I18N.de,
    [lang]
  );

  const [langOpen, setLangOpen] = useState(false);

  const [msg, setMsg] = useState<MessageState>({
    text: "",
    type: "",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [publicId, setPublicId] = useState("");

  const [pwVisible, setPwVisible] = useState(false);

  const [showResetBox, setShowResetBox] =
    useState(false);

  const [newPassword, setNewPassword] =
    useState("");

  const [newPassword2, setNewPassword2] =
    useState("");

  const [showTermsBox, setShowTermsBox] =
    useState(false);

  const [termsCheck, setTermsCheck] =
    useState(false);

  const [showPrivacyBox, setShowPrivacyBox] =
    useState(false);

  const [privacyCheck, setPrivacyCheck] =
    useState(false);

  const [showActivationArea, setShowActivationArea] =
    useState(false);

  const [showClaimNotice, setShowClaimNotice] =
    useState(false);

  const [claimNoticePid, setClaimNoticePid] =
    useState("");

  const [claimSuccessPid, setClaimSuccessPid] =
    useState("");

  const [guideOpen, setGuideOpen] =
    useState(false);

  const [signupOpen, setSignupOpen] =
    useState(false);

  const [signupMsg, setSignupMsg] =
    useState<MessageState>({
      text: "",
      type: "",
    });

  const [signupEmail, setSignupEmail] =
    useState("");

  const [signupPassword, setSignupPassword] =
    useState("");

  const [signupPassword2, setSignupPassword2] =
    useState("");

  const [
    signupTermsCheck,
    setSignupTermsCheck,
  ] = useState(false);

  const [
    signupPwVisible,
    setSignupPwVisible,
  ] = useState(false);

  const [blockOpen, setBlockOpen] =
    useState(false);

  const [blockMsg, setBlockMsg] =
    useState<MessageState>({
      text: "",
      type: "",
    });

  const [blockEmail, setBlockEmail] =
    useState("");

  const [
    blockPublicId,
    setBlockPublicId,
  ] = useState("");

  const [blockReason, setBlockReason] =
    useState("");

  const [busy, setBusy] =
    useState<string | null>(null);

  const setMainMessage = (
    text: string,
    type: "" | "ok" | "err" = ""
  ) => {
    setMsg({
      text,
      type,
    });
  };

  const setSignupMessage = (
    text: string,
    type: "" | "ok" | "err" = ""
  ) => {
    setSignupMsg({
      text,
      type,
    });
  };

  const setBlockMessage = (
    text: string,
    type: "" | "ok" | "err" = ""
  ) => {
    setBlockMsg({
      text,
      type,
    });
  };

  const resetClaimState = () => {
    setClaimSuccessPid("");
  };

  const openUrl = async (url: string) => {
    try {
      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          t.alert_error_title,
          t.alert_open_link_failed
        );

        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t.alert_error_title,
        t.alert_open_link_failed
      );
    }
  };

  const getCurrentUser = async () => {
    const { data, error } =
      await supabase.auth.getUser();

    if (error) {
      return {
        user: null,
        error,
      };
    }

    return {
      user: data?.user || null,
      error: null,
    };
  };

  const loadProfile = async (
    ownerId: string
  ) => {
    return await supabase
      .from("profiles")
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .eq("owner_id", ownerId)
      .maybeSingle();
  };

  const upsertProfile = async (
    values: any
  ) => {
    return await supabase
      .from("profiles")
      .upsert(values, {
        onConflict: "owner_id",
      })
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .maybeSingle();
  };

  const savePrivacyClaimConsent = async (
    ownerId: string
  ) => {
    return await supabase
      .from("profiles")
      .upsert(
        {
          owner_id: ownerId,
          privacy_claim_accepted_at:
            new Date().toISOString(),
        },
        {
          onConflict: "owner_id",
        }
      )
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .maybeSingle();
  };

  const getOrCreateProfile = async () => {
    const {
      user,
      error: userErr,
    } = await getCurrentUser();

    if (userErr || !user) {
      return {
        user: null,
        profile: null,
        error: new Error(t.err_relogin),
      };
    }

    let {
      data: profile,
      error,
    } = await loadProfile(user.id);

    if (error) {
      return {
        user,
        profile: null,
        error,
      };
    }

    if (!profile) {
      const up =
        await upsertProfile({
          owner_id: user.id,
        });

      if (up.error) {
        return {
          user,
          profile: null,
          error: up.error,
        };
      }

      profile = up.data || null;
    }

    return {
      user,
      profile,
      error: null,
    };
  };

  const getCardByPid = async (
    pid: string
  ) => {
    const cleanPid =
      normalizePid(pid);

    if (!cleanPid) {
      return {
        card: null,
        error: null,
      };
    }

    const {
      data,
      error,
    } = await supabase
      .from("cards")
      .select(
        "id, public_id, status, blocked_at"
      )
      .eq("public_id", cleanPid)
      .maybeSingle();

    if (error) {
      return {
        card: null,
        error,
      };
    }

    return {
      card: data || null,
      error: null,
    };
  };

  const isBlockedCard = (card: any) => {
    if (!card) return false;

    return (
      String(card.status || "") ===
        "blocked" ||
      !!card.blocked_at
    );
  };

  const ensureCardNotBlocked = async (
    pid: string
  ) => {
    const cleanPid =
      normalizePid(pid);

    if (!cleanPid) {
      return {
        ok: true,
        card: null,
        message: "",
      };
    }

    const {
      card,
      error,
    } = await getCardByPid(cleanPid);

    if (error) {
      return {
        ok: false,
        card: null,
        message:
          t.card_status_check_failed +
          error.message,
      };
    }

    if (
      card &&
      isBlockedCard(card)
    ) {
      return {
        ok: false,
        card,
        message: t.card_blocked,
      };
    }

    return {
      ok: true,
      card,
      message: "",
    };
  };

  const showCardActivation = (
    pid = ""
  ) => {
    const cleanPid =
      normalizePid(pid);

    setShowActivationArea(true);

    if (cleanPid) {
      setPublicId(cleanPid);

      setClaimNoticePid(cleanPid);

      setShowClaimNotice(true);
    } else {
      setShowClaimNotice(false);
    }
  };

  const performClaimFlow = async (
    pid: string
  ) => {
    const cleanPid =
      normalizePid(pid);

    if (!cleanPid) {
      setMainMessage(
        t.err_pid,
        "err"
      );

      return false;
    }

    setPublicId(cleanPid);

    const {
      data: sess,
    } =
      await supabase.auth.getSession();

    if (!sess?.session) {
      setMainMessage(
        t.err_login_first,
        "err"
      );

      return false;
    }

    const {
      user,
      profile,
      error,
    } =
      await getOrCreateProfile();

    if (
      error ||
      !user ||
      !profile
    ) {
      setMainMessage(
        error?.message ||
          t.err_user_missing,
        "err"
      );

      return false;
    }

    const authConfirmedAt =
      (user as any)
        ?.email_confirmed_at ||
      (user as any)
        ?.confirmed_at ||
      null;

    if (
      !profile.email_confirmed_at &&
      authConfirmedAt
    ) {
      const syncRes =
        await upsertProfile({
          owner_id: user.id,
          email: String(
            user.email || ""
          )
            .trim()
            .toLowerCase(),
          email_confirmed_at:
            authConfirmedAt,
        });

      if (
        !syncRes.error &&
        syncRes.data
      ) {
        profile.email_confirmed_at =
          authConfirmedAt;
      }
    }

    if (
      !profile.email_confirmed_at
    ) {
      await supabase.auth.signOut();

      setMainMessage(
        t.err_confirm_email_first,
        "err"
      );

      return false;
    }

    if (
      !profile.terms_accepted_at
    ) {
      setShowActivationArea(false);
      setShowPrivacyBox(false);
      setShowTermsBox(true);

      setMainMessage(
        t.need_terms,
        "ok"
      );

      return false;
    }

    if (
      !profile
        .privacy_claim_accepted_at
    ) {
      setShowActivationArea(false);
      setShowTermsBox(false);
      setShowPrivacyBox(true);

      setMainMessage(
        t.need_privacy_claim,
        "ok"
      );

      return false;
    }

    const blockCheck =
      await ensureCardNotBlocked(
        cleanPid
      );

    if (!blockCheck.ok) {
      setMainMessage(
        blockCheck.message,
        "err"
      );

      return false;
    }

    try {
      const {
        error: claimError,
      } =
        await supabase.rpc(
          "claim_card",
          {
            p_public_id:
              cleanPid,
          }
        );

      if (claimError) {
        setMainMessage(
          t.err_claim +
            claimError.message,
          "err"
        );

        return false;
      }
    } catch {
      setMainMessage(
        t.err_claim_rpc,
        "err"
      );

      return false;
    }

    const up =
      await upsertProfile({
        owner_id: user.id,
        public_id: cleanPid,
      });

    if (up.error) {
      setMainMessage(
        t.err_pid_save +
          up.error.message,
        "err"
      );

      return false;
    }

    setShowActivationArea(false);
    setShowClaimNotice(false);

    setClaimNoticePid(
      cleanPid
    );

    setClaimSuccessPid(
      cleanPid
    );

    setMainMessage(
      t.claim_ok,
      "ok"
    );

    return true;
  };

  const handleForgotPassword =
    async () => {
      try {
        setBusy("forgot");
        setMainMessage("");

        const cleanEmail =
          email.trim().toLowerCase();

        if (!cleanEmail) {
          setMainMessage(
            t.err_enter_email,
            "err"
          );

          return;
        }

        if (
          !isValidEmail(
            cleanEmail
          )
        ) {
          setMainMessage(
            t.err_valid_email,
            "err"
          );

          return;
        }

        const redirectTo =
          "https://vive-card.com/login";

        const {
          error,
        } =
          await supabase.auth.resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo,
            }
          );

        if (error) {
          setMainMessage(
            t.err_reset +
              error.message,
            "err"
          );

          return;
        }

        setShowTermsBox(false);
        setShowPrivacyBox(false);
        setShowActivationArea(false);

        setShowResetBox(true);

        setMainMessage(
          t.reset_sent,
          "ok"
        );
      } finally {
        setBusy(null);
      }
    };

  const handleApplyReset =
    async () => {
      try {
        setBusy("reset");

        setMainMessage("");

        if (
          !newPassword ||
          newPassword.length < 6
        ) {
          setMainMessage(
            t.err_pw_short,
            "err"
          );

          return;
        }

        if (
          newPassword !==
          newPassword2
        ) {
          setMainMessage(
            t.err_pw_match,
            "err"
          );

          return;
        }

        const {
          error,
        } =
          await supabase.auth.updateUser(
            {
              password:
                newPassword,
            }
          );

        if (error) {
          setMainMessage(
            t.err_reset_apply +
              error.message,
            "err"
          );

          return;
        }

        try {
          await supabase.auth.signOut();
        } catch {}

        setShowResetBox(false);

        setNewPassword("");
        setNewPassword2("");

        setMainMessage(
          t.reset_ok,
          "ok"
        );
      } finally {
        setBusy(null);
      }
    };

  const handleLogin = async () => {
    try {
      setBusy("login");

      setMainMessage("");

      setShowResetBox(false);
      setShowTermsBox(false);
      setShowPrivacyBox(false);
      setShowActivationArea(false);

      resetClaimState();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !cleanEmail ||
        !password
      ) {
        setMainMessage(
          t.err_enter,
          "err"
        );

        return;
      }

      if (
        !isValidEmail(cleanEmail)
      ) {
        setMainMessage(
          t.err_valid_email,
          "err"
        );

        return;
      }

      const {
        data: loginData,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              cleanEmail,
            password,
          }
        );

      if (loginError) {
        setMainMessage(
          t.err_login +
            loginError.message,
          "err"
        );

        return;
      }

      if (
        !loginData?.user ||
        !loginData?.session
      ) {
        setMainMessage(
          t.err_relogin,
          "err"
        );

        return;
      }

      const {
        user,
        profile,
        error,
      } =
        await getOrCreateProfile();

      if (
        error ||
        !user ||
        !profile
      ) {
        setMainMessage(
          error?.message ||
            t.err_user_missing,
          "err"
        );

        return;
      }

      const authConfirmedAt =
        (user as any)
          ?.email_confirmed_at ||
        (user as any)
          ?.confirmed_at ||
        null;

      if (
        !profile
          .email_confirmed_at &&
        authConfirmedAt
      ) {
        const syncRes =
          await upsertProfile({
            owner_id:
              user.id,
            email: String(
              user.email || ""
            )
              .trim()
              .toLowerCase(),

            email_confirmed_at:
              authConfirmedAt,
          });

        if (
          !syncRes.error &&
          syncRes.data
        ) {
          profile.email_confirmed_at =
            authConfirmedAt;
        }
      }

      if (
        !profile
          .email_confirmed_at
      ) {
        await supabase.auth.signOut();

        setMainMessage(
          t.err_confirm_email_first,
          "err"
        );

        return;
      }

      if (
        !profile
          .terms_accepted_at
      ) {
        setShowTermsBox(true);

        setMainMessage(
          t.need_terms,
          "ok"
        );

        return;
      }

      const pidToUse =
        normalizePid(
          publicId
        );

      if (
        !profile
          .privacy_claim_accepted_at
      ) {
        if (pidToUse) {
          setPublicId(
            pidToUse
          );
        }

        setShowPrivacyBox(true);

        setMainMessage(
          t.need_privacy_claim,
          "ok"
        );

        return;
      }

      if (pidToUse) {
        await performClaimFlow(
          pidToUse
        );

        return;
      }

      if (
        profile.public_id
      ) {
        const existingPid =
          normalizePid(
            profile.public_id
          );

        const blockCheck =
          await ensureCardNotBlocked(
            existingPid
          );

        if (!blockCheck.ok) {
          setMainMessage(
            blockCheck.message,
            "err"
          );

          return;
        }

        setPublicId(
          existingPid
        );

        /*
          Wenn deine App-Navigation bereits automatisch
          auf eine aktive Supabase-Session reagiert,
          wird jetzt der eingeloggte App-Bereich geöffnet.
        */

        return;
      }

      showCardActivation("");

      setMainMessage(
        t.need_pid,
        "ok"
      );
    } finally {
      setBusy(null);
    }
  };

  const handleAcceptTerms =
    async () => {
      try {
        setBusy("terms");

        setMainMessage("");

        if (!termsCheck) {
          setMainMessage(
            t.need_terms,
            "err"
          );

          return;
        }

        const {
          user,
          error: userErr,
        } =
          await getCurrentUser();

        if (
          userErr ||
          !user
        ) {
          setMainMessage(
            t.err_relogin,
            "err"
          );

          return;
        }

        const {
          data: profile,
          error,
        } =
          await upsertProfile({
            owner_id:
              user.id,

            terms_accepted_at:
              new Date().toISOString(),
          });

        if (error) {
          setMainMessage(
            t.err_save +
              error.message,
            "err"
          );

          return;
        }

        setShowTermsBox(false);
        setTermsCheck(false);

        setMainMessage(
          t.terms_ok,
          "ok"
        );

        const pidToUse =
          normalizePid(
            publicId
          );

        if (
          !profile
            ?.privacy_claim_accepted_at
        ) {
          setShowPrivacyBox(true);

          setMainMessage(
            t.need_privacy_claim,
            "ok"
          );

          return;
        }

        if (pidToUse) {
          await performClaimFlow(
            pidToUse
          );

          return;
        }

        showCardActivation("");

        setMainMessage(
          t.need_pid,
          "ok"
        );
      } finally {
        setBusy(null);
      }
    };

  const handleAcceptPrivacyClaim =
    async () => {
      try {
        setBusy("privacy");

        setMainMessage("");

        if (!privacyCheck) {
          setMainMessage(
            t.need_privacy_claim,
            "err"
          );

          return;
        }

        const {
          user,
          error: userErr,
        } =
          await getCurrentUser();

        if (
          userErr ||
          !user
        ) {
          setMainMessage(
            t.err_relogin,
            "err"
          );

          return;
        }

        const {
          data: profile,
          error,
        } =
          await savePrivacyClaimConsent(
            user.id
          );

        if (error) {
          setMainMessage(
            t.err_privacy_save +
              error.message,
            "err"
          );

          return;
        }

        setShowPrivacyBox(false);

        setPrivacyCheck(false);

        setMainMessage(
          t.privacy_claim_ok,
          "ok"
        );

        const pidToUse =
          normalizePid(
            publicId
          );

        if (pidToUse) {
          await performClaimFlow(
            pidToUse
          );

          return;
        }

        if (
          profile?.public_id
        ) {
          const existingPid =
            normalizePid(
              profile.public_id
            );

          const blockCheck =
            await ensureCardNotBlocked(
              existingPid
            );

          if (!blockCheck.ok) {
            setMainMessage(
              blockCheck.message,
              "err"
            );

            return;
          }

          return;
        }

        showCardActivation("");

        setMainMessage(
          t.need_pid,
          "ok"
        );
      } finally {
        setBusy(null);
      }
    };

  const handleOpenSignup = () => {
    resetClaimState();

    setSignupEmail(
      email.trim()
    );

    setSignupPassword("");
    setSignupPassword2("");

    setSignupTermsCheck(false);

    setSignupMessage("");

    setSignupOpen(true);
  };

  const handleSignup =
    async () => {
      try {
        setBusy("signup");

        setSignupMessage("");

        const cleanEmail =
          signupEmail
            .trim()
            .toLowerCase();

        if (!cleanEmail) {
          setSignupMessage(
            t.err_enter_email,
            "err"
          );

          return;
        }

        if (
          !isValidEmail(
            cleanEmail
          )
        ) {
          setSignupMessage(
            t.err_valid_email,
            "err"
          );

          return;
        }

        if (
          !signupPassword ||
          signupPassword.length <
            6
        ) {
          setSignupMessage(
            t.err_pw_short,
            "err"
          );

          return;
        }

        if (
          signupPassword !==
          signupPassword2
        ) {
          setSignupMessage(
            t.err_pw_match,
            "err"
          );

          return;
        }

        if (
          !signupTermsCheck
        ) {
          setSignupMessage(
            t.err_accept_terms_first,
            "err"
          );

          return;
        }

        const response =
          await fetch(
            `${SUPABASE_URL}/functions/v1/signup-with-email`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                apikey:
                  SUPABASE_ANON_KEY,

                Authorization:
                  `Bearer ${SUPABASE_ANON_KEY}`,
              },

              body:
                JSON.stringify({
                  email:
                    cleanEmail,

                  password:
                    signupPassword,

                  terms_accepted:
                    true,
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          setSignupMessage(
            data?.error ||
              t.err_signup_failed_generic,
            "err"
          );

          return;
        }

        setEmail(
          cleanEmail
        );

        setSignupOpen(false);

        setMainMessage(
          t.signup_ok,
          "ok"
        );
      } catch (e: any) {
        setSignupMessage(
          e?.message ||
            t.err_signup,
          "err"
        );
      } finally {
        setBusy(null);
      }
    };

  const handleClaim = async () => {
    try {
      setBusy("claim");

      setMainMessage("");

      resetClaimState();

      await performClaimFlow(
        publicId
      );
    } finally {
      setBusy(null);
    }
  };

  const handleOpenBlockModal =
    () => {
      setBlockEmail(
        email.trim()
      );

      setBlockPublicId(
        normalizePid(publicId)
      );

      setBlockReason("");

      setBlockMessage("");

      setBlockOpen(true);
    };

  const handleSubmitBlockRequest =
    async () => {
      try {
        setBusy("block");

        setBlockMessage("");

        const cleanEmail =
          blockEmail
            .trim()
            .toLowerCase();

        const cleanPid =
          normalizePid(
            blockPublicId
          );

        if (!cleanEmail) {
          setBlockMessage(
            t.err_enter_email,
            "err"
          );

          return;
        }

        if (
          !isValidEmail(
            cleanEmail
          )
        ) {
          setBlockMessage(
            t.err_valid_email,
            "err"
          );

          return;
        }

        if (!cleanPid) {
          setBlockMessage(
            t.err_pid,
            "err"
          );

          return;
        }

        const response =
          await fetch(
            `${SUPABASE_URL}/functions/v1/request-card-block`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${SUPABASE_ANON_KEY}`,

                apikey:
                  SUPABASE_ANON_KEY,
              },

              body:
                JSON.stringify({
                  email:
                    cleanEmail,

                  public_id:
                    cleanPid,

                  reason:
                    blockReason.trim(),
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          setBlockMessage(
            data?.error ||
              data?.details ||
              t.err_block_card_request,
            "err"
          );

          return;
        }

        setBlockMessage(
          t.block_card_success,
          "ok"
        );

        setBlockReason("");
      } catch {
        setBlockMessage(
          t.err_block_card_request,
          "err"
        );
      } finally {
        setBusy(null);
      }
    };

  const goProfile = async () => {
    const pid =
      normalizePid(
        claimSuccessPid ||
          publicId
      );

    if (!pid) {
      return;
    }

    const blockCheck =
      await ensureCardNotBlocked(
        pid
      );

    if (!blockCheck.ok) {
      setMainMessage(
        blockCheck.message,
        "err"
      );

      return;
    }

    /*
      Falls dein Navigator einen Card-Screen besitzt,
      versuchen wir ihn direkt zu öffnen.

      Falls dein Root-Navigator ohnehin anhand der
      Supabase-Session umschaltet, ist dies nur ein Bonus.
    */
    if (
      navigation?.navigate
    ) {
      try {
        navigation.navigate(
          "Card",
          {
            pid,
          }
        );

        return;
      } catch {}
    }

    Alert.alert(
      t.alert_card_activated_title,
      t.alert_card_activated_text
    );
  };

  useEffect(() => {
    setLang("de");
  }, []);

  const guideSteps = [
    t.activation_guide_step_1,
    t.activation_guide_step_2,
    t.activation_guide_step_3,
    t.activation_guide_step_4,
    t.activation_guide_step_5,
    t.activation_guide_step_6,
    t.activation_guide_step_7,
    t.activation_guide_step_8,
    t.activation_guide_step_9,
  ];

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View
          pointerEvents="none"
          style={
            styles.backgroundAccentTop
          }
        />

        <View
          pointerEvents="none"
          style={
            styles.backgroundAccentRight
          }
        />

        <KeyboardAvoidingView
          style={styles.screen}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            style={styles.screen}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            <View style={styles.wrap}>
              <View style={styles.brand}>
                <View
                  style={
                    styles.brandLogo
                  }
                >
                  <View
                    style={
                      styles.brandLogoInner
                    }
                  />

                  <View
                    style={
                      styles.brandLogoCut
                    }
                  />
                </View>

                <Text
                  style={
                    styles.brandTitle
                  }
                >
                  VIVE CARD
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.pill}>
                  <Text
                    style={
                      styles.pillText
                    }
                    numberOfLines={2}
                  >
                    {t.pill}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={
                      styles.langSelect
                    }
                    onPress={() =>
                      setLangOpen(true)
                    }
                  >
                    <Text
                      style={
                        styles.langSelectText
                      }
                    >
                      {lang.toUpperCase()}⌄
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sep} />

                <FieldLabel
                  text={t.email_label}
                />

                <TextInput
                  style={styles.input}
                  placeholder="name@domain.ch"
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                />

                <FieldLabel
                  text={t.pw_label}
                />

                <View
                  style={
                    styles.passwordWrap
                  }
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    secureTextEntry={
                      !pwVisible
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    value={password}
                    onChangeText={
                      setPassword
                    }
                    returnKeyType="done"
                    onSubmitEditing={
                      handleLogin
                    }
                  />

                  <TouchableOpacity
                    style={
                      styles.pwToggle
                    }
                    onPress={() =>
                      setPwVisible(
                        (v) => !v
                      )
                    }
                  >
                    <Text
                      style={
                        styles.pwToggleText
                      }
                    >
                      {pwVisible
                        ? t.pw_hide
                        : t.pw_toggle}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={
                    handleForgotPassword
                  }
                  disabled={
                    busy !== null
                  }
                  style={
                    styles.forgotWrap
                  }
                >
                  <Text
                    style={
                      styles.linkBtn
                    }
                  >
                    {busy === "forgot"
                      ? "..."
                      : t.forgot_pw}
                  </Text>
                </TouchableOpacity>

                {showResetBox ? (
                  <View
                    style={
                      styles.infoBox
                    }
                  >
                    <Text
                      style={
                        styles.infoBoxTitle
                      }
                    >
                      {t.reset_title}
                    </Text>

                    <FieldLabel
                      text={
                        t.new_pw_label
                      }
                    />

                    <TextInput
                      style={
                        styles.input
                      }
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      value={
                        newPassword
                      }
                      onChangeText={
                        setNewPassword
                      }
                    />

                    <FieldLabel
                      text={
                        t.new_pw2_label
                      }
                    />

                    <TextInput
                      style={
                        styles.input
                      }
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      value={
                        newPassword2
                      }
                      onChangeText={
                        setNewPassword2
                      }
                      onSubmitEditing={
                        handleApplyReset
                      }
                    />

                    <PrimaryButton
                      text={
                        busy === "reset"
                          ? "..."
                          : t.btn_reset_pw
                      }
                      onPress={
                        handleApplyReset
                      }
                      disabled={
                        busy !== null
                      }
                    />

                    <Text
                      style={
                        styles.smallText
                      }
                    >
                      {t.reset_hint}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={
                    styles.buttonRow
                  }
                >
                  <PrimaryButton
                    text={
                      busy === "login"
                        ? "..."
                        : t.btn_login
                    }
                    onPress={
                      handleLogin
                    }
                    disabled={
                      busy !== null
                    }
                    flex
                  />

                  <SecondaryButton
                    text={t.btn_signup}
                    onPress={
                      handleOpenSignup
                    }
                    disabled={
                      busy !== null
                    }
                    flex
                  />
                </View>

                <View
                  style={
                    styles.buttonRow
                  }
                >
                  <SecondaryButton
                    text={t.btn_order}
                    onPress={() =>
                      openUrl(
                        "https://vive-card.com/order.html"
                      )
                    }
                    flex
                  />

                  <SecondaryButton
                    text={t.btn_block}
                    onPress={
                      handleOpenBlockModal
                    }
                    flex
                  />
                </View>

                <SecondaryButton
                  text={t.btn_about}
                  onPress={() =>
                    openUrl(
                      "https://vive-card.com/"
                    )
                  }
                />

                {showTermsBox ? (
                  <View
                    style={
                      styles.infoBox
                    }
                  >
                    <Text
                      style={
                        styles.smallTextNoMargin
                      }
                    >
                      {t.terms_intro}
                    </Text>

                    <CheckboxRow
                      checked={
                        termsCheck
                      }
                      onPress={() =>
                        setTermsCheck(
                          (v) => !v
                        )
                      }
                    >
                      <Text
                        style={
                          styles.checkText
                        }
                      >
                        {
                          t.terms_prefix
                        }{" "}
                        <Text
                          style={
                            styles.inlineLink
                          }
                          onPress={() =>
                            openUrl(
                              "https://vive-card.com/agb.html"
                            )
                          }
                        >
                          {t.terms_agb}
                        </Text>{" "}
                        {t.terms_and}{" "}
                        <Text
                          style={
                            styles.inlineLink
                          }
                          onPress={() =>
                            openUrl(
                              "https://vive-card.com/nutzung.html"
                            )
                          }
                        >
                          {
                            t.terms_usage
                          }
                        </Text>
                        .
                      </Text>
                    </CheckboxRow>

                    <PrimaryButton
                      text={
                        busy === "terms"
                          ? "..."
                          : t.btn_accept
                      }
                      onPress={
                        handleAcceptTerms
                      }
                      disabled={
                        !termsCheck ||
                        busy !== null
                      }
                    />
                  </View>
                ) : null}

                {showPrivacyBox ? (
                  <View
                    style={[
                      styles.infoBox,
                      styles.privacyBox,
                    ]}
                  >
                    <Text
                      style={
                        styles.infoBoxTitle
                      }
                    >
                      {
                        t.privacy_claim_title
                      }
                    </Text>

                    <View
                      style={
                        styles.privacyTextBox
                      }
                    >
                      <Text
                        style={
                          styles.privacyBodyText
                        }
                      >
                        {
                          t.privacy_claim_body
                        }
                      </Text>
                    </View>

                    <CheckboxRow
                      checked={
                        privacyCheck
                      }
                      onPress={() =>
                        setPrivacyCheck(
                          (v) => !v
                        )
                      }
                    >
                      <Text
                        style={
                          styles.checkText
                        }
                      >
                        {
                          t.privacy_claim_checkbox
                        }
                      </Text>
                    </CheckboxRow>

                    <PrimaryButton
                      text={
                        busy ===
                        "privacy"
                          ? "..."
                          : t.btn_accept_privacy_claim
                      }
                      onPress={
                        handleAcceptPrivacyClaim
                      }
                      disabled={
                        !privacyCheck ||
                        busy !== null
                      }
                    />
                  </View>
                ) : null}

                {showActivationArea ? (
                  <View
                    style={
                      styles.activationArea
                    }
                  >
                    {showClaimNotice &&
                    claimNoticePid ? (
                      <View
                        style={
                          styles.claimNoticeBox
                        }
                      >
                        <Text
                          style={
                            styles.claimNoticeTitle
                          }
                        >
                          {
                            t.claim_notice_title
                          }
                        </Text>

                        <Text
                          style={
                            styles.claimNoticeText
                          }
                        >
                          {
                            t.claim_notice_text
                          }
                        </Text>

                        <View
                          style={
                            styles.pidBadge
                          }
                        >
                          <Text
                            style={
                              styles.pidBadgeText
                            }
                          >
                            {
                              t.public_id_label
                            }
                            :{" "}
                            {
                              claimNoticePid
                            }
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <FieldLabel
                      text={t.pid_label}
                    />

                    <TextInput
                      style={
                        styles.input
                      }
                      placeholder={
                        t.pid_ph
                      }
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      autoCapitalize="characters"
                      autoCorrect={false}
                      value={publicId}
                      onChangeText={(v) =>
                        setPublicId(
                          normalizePid(
                            v
                          )
                        )
                      }
                      onSubmitEditing={
                        handleClaim
                      }
                    />

                    <Text
                      style={
                        styles.smallTextNoMargin
                      }
                    >
                      {t.claim_hint}
                    </Text>

                    <SecondaryButton
                      text={
                        claimSuccessPid
                          ? t.claim_already
                          : busy ===
                            "claim"
                          ? "..."
                          : t.btn_claim
                      }
                      onPress={
                        handleClaim
                      }
                      disabled={
                        busy !== null ||
                        !!claimSuccessPid
                      }
                    />
                  </View>
                ) : null}

                {!!msg.text ? (
                  <Text
                    style={[
                      styles.message,
                      msg.type ===
                        "ok" &&
                        styles.messageOk,

                      msg.type ===
                        "err" &&
                        styles.messageErr,
                    ]}
                  >
                    {msg.text}
                  </Text>
                ) : null}

                {!!claimSuccessPid ? (
                  <View
                    style={
                      styles.claimSuccessCard
                    }
                  >
                    <Text
                      style={
                        styles.claimSuccessTitle
                      }
                    >
                      {
                        t.claim_success_title
                      }
                    </Text>

                    <Text
                      style={
                        styles.claimSuccessText
                      }
                    >
                      {
                        t.claim_success_text
                      }
                    </Text>

                    <PrimaryButton
                      text={
                        t.btn_go_profile
                      }
                      onPress={
                        goProfile
                      }
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={
                    styles.guideBox
                  }
                  onPress={() =>
                    setGuideOpen(
                      (v) => !v
                    )
                  }
                >
                  <View
                    style={
                      styles.guideHeader
                    }
                  >
                    <Text
                      style={
                        styles.guideTitle
                      }
                    >
                      {
                        t.activation_guide_title
                      }
                    </Text>

                    <View
                      style={
                        styles.guideToggle
                      }
                    >
                      <Text
                        style={
                          styles.guideToggleText
                        }
                      >
                        {guideOpen
                          ? "−"
                          : "+"}
                      </Text>
                    </View>
                  </View>

                  {guideOpen ? (
                    <View
                      style={
                        styles.guideContent
                      }
                    >
                      {guideSteps.map(
                        (
                          step,
                          index
                        ) => (
                          <View
                            key={`${index}-${step}`}
                            style={
                              styles.guideStep
                            }
                          >
                            <View
                              style={
                                styles.guideStepNumber
                              }
                            >
                              <Text
                                style={
                                  styles.guideStepNumberText
                                }
                              >
                                {index +
                                  1}
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.guideStepText
                              }
                            >
                              {step}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  ) : null}
                </TouchableOpacity>

                <View
                  style={
                    styles.footerSep
                  }
                />

                <View
                  style={
                    styles.footerLinks
                  }
                >
                  <Text
                    style={
                      styles.footerLink
                    }
                    onPress={() =>
                      openUrl(
                        "https://vive-card.com/impressum.html"
                      )
                    }
                  >
                    {
                      t.link_impressum
                    }
                  </Text>

                  <Text
                    style={
                      styles.footerLink
                    }
                    onPress={() =>
                      openUrl(
                        "https://vive-card.com/datenschutz.html"
                      )
                    }
                  >
                    {t.link_privacy}
                  </Text>

                  <Text
                    style={
                      styles.footerLink
                    }
                    onPress={() =>
                      openUrl(
                        "https://vive-card.com/agb.html"
                      )
                    }
                  >
                    {t.link_agb}
                  </Text>

                  <Text
                    style={
                      styles.footerLink
                    }
                    onPress={() =>
                      openUrl(
                        "https://vive-card.com/nutzung.html"
                      )
                    }
                  >
                    {t.link_usage}
                  </Text>
                </View>

                <Text
                  style={
                    styles.copyright
                  }
                >
                  ©️{" "}
                  {new Date().getFullYear()}{" "}
                  Vive-Card • Danilo
                  Torsello (CH)
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* SPRACHWAHL */}

      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setLangOpen(false)
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() =>
            setLangOpen(false)
          }
        >
          <Pressable
            style={
              styles.languageModal
            }
            onPress={() => {}}
          >
            {LANG_OPTIONS.map(
              (item) => {
                const active =
                  item === lang;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.languageOption,

                      active &&
                        styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setLang(item);
                      setLangOpen(
                        false
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,

                        active &&
                          styles.languageOptionTextActive,
                      ]}
                    >
                      {
                        LANGUAGE_NAMES[
                          item
                        ]
                      }
                    </Text>

                    {active ? (
                      <Text
                        style={
                          styles.languageCheck
                        }
                      >
                        ✓
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* REGISTRIERUNG */}

      <Modal
        visible={signupOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSignupOpen(false)
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalKeyboard
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.modalOverlay
            }
            onPress={() =>
              setSignupOpen(false)
            }
          >
            <Pressable
              style={
                styles.modalCard
              }
              onPress={() => {}}
            >
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {t.signup_title}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.modalCloseBtn
                    }
                    onPress={() =>
                      setSignupOpen(
                        false
                      )
                    }
                  >
                    <Text
                      style={
                        styles.modalCloseBtnText
                      }
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={styles.sep}
                />

                <FieldLabel
                  text={
                    t.email_label
                  }
                />

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="name@domain.ch"
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={
                    signupEmail
                  }
                  onChangeText={
                    setSignupEmail
                  }
                />

                <FieldLabel
                  text={
                    t.pw_label
                  }
                />

                <View
                  style={
                    styles.passwordWrap
                  }
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                    ]}
                    placeholder={
                      t.signup_password_ph
                    }
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    secureTextEntry={
                      !signupPwVisible
                    }
                    autoCapitalize="none"
                    value={
                      signupPassword
                    }
                    onChangeText={
                      setSignupPassword
                    }
                  />

                  <TouchableOpacity
                    style={
                      styles.pwToggle
                    }
                    onPress={() =>
                      setSignupPwVisible(
                        (v) => !v
                      )
                    }
                  >
                    <Text
                      style={
                        styles.pwToggleText
                      }
                    >
                      {signupPwVisible
                        ? t.pw_hide
                        : t.pw_toggle}
                    </Text>
                  </TouchableOpacity>
                </View>

                <FieldLabel
                  text={
                    t.signup_pw2_label
                  }
                />

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder={
                    t.signup_password2_ph
                  }
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  secureTextEntry={
                    !signupPwVisible
                  }
                  autoCapitalize="none"
                  value={
                    signupPassword2
                  }
                  onChangeText={
                    setSignupPassword2
                  }
                />

                <CheckboxRow
                  checked={
                    signupTermsCheck
                  }
                  onPress={() =>
                    setSignupTermsCheck(
                      (v) => !v
                    )
                  }
                >
                  <Text
                    style={
                      styles.checkText
                    }
                  >
                    {t.terms_prefix}{" "}
                    <Text
                      style={
                        styles.inlineLink
                      }
                      onPress={() =>
                        openUrl(
                          "https://vive-card.com/agb.html"
                        )
                      }
                    >
                      {t.terms_agb}
                    </Text>{" "}
                    {t.terms_and}{" "}
                    <Text
                      style={
                        styles.inlineLink
                      }
                      onPress={() =>
                        openUrl(
                          "https://vive-card.com/nutzung.html"
                        )
                      }
                    >
                      {t.terms_usage}
                    </Text>
                    .
                  </Text>
                </CheckboxRow>

                <PrimaryButton
                  text={
                    busy === "signup"
                      ? "..."
                      : t.btn_signup_start
                  }
                  onPress={
                    handleSignup
                  }
                  disabled={
                    busy !== null
                  }
                />

                {!!signupMsg.text ? (
                  <Text
                    style={[
                      styles.message,

                      signupMsg.type ===
                        "ok" &&
                        styles.messageOk,

                      signupMsg.type ===
                        "err" &&
                        styles.messageErr,
                    ]}
                  >
                    {
                      signupMsg.text
                    }
                  </Text>
                ) : null}

                <Text
                  style={
                    styles.smallText
                  }
                >
                  {t.signup_hint}
                </Text>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* KARTE SPERREN */}

      <Modal
        visible={blockOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setBlockOpen(false)
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalKeyboard
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.modalOverlay
            }
            onPress={() =>
              setBlockOpen(false)
            }
          >
            <Pressable
              style={
                styles.modalCard
              }
              onPress={() => {}}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {
                      t.block_card_title
                    }
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.modalCloseBtn
                    }
                    onPress={() =>
                      setBlockOpen(
                        false
                      )
                    }
                  >
                    <Text
                      style={
                        styles.modalCloseBtnText
                      }
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={styles.sep}
                />

                <Text
                  style={
                    styles.smallTextNoMargin
                  }
                >
                  {t.block_card_intro}
                </Text>

                <FieldLabel
                  text={
                    t.email_label
                  }
                />

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="name@domain.ch"
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={
                    blockEmail
                  }
                  onChangeText={
                    setBlockEmail
                  }
                />

                <FieldLabel
                  text={
                    t.public_id_label
                  }
                />

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder={
                    t.pid_ph
                  }
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={
                    blockPublicId
                  }
                  onChangeText={(v) =>
                    setBlockPublicId(
                      normalizePid(
                        v
                      )
                    )
                  }
                />

                <FieldLabel
                  text={
                    t.block_reason_label
                  }
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.textarea,
                  ]}
                  placeholder={
                    t.block_reason_ph
                  }
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  multiline
                  value={
                    blockReason
                  }
                  onChangeText={
                    setBlockReason
                  }
                />

                <PrimaryButton
                  text={
                    busy === "block"
                      ? "..."
                      : t.btn_block_card_submit
                  }
                  onPress={
                    handleSubmitBlockRequest
                  }
                  disabled={
                    busy !== null
                  }
                />

                {!!blockMsg.text ? (
                  <Text
                    style={[
                      styles.message,

                      blockMsg.type ===
                        "ok" &&
                        styles.messageOk,

                      blockMsg.type ===
                        "err" &&
                        styles.messageErr,
                    ]}
                  >
                    {blockMsg.text}
                  </Text>
                ) : null}

                <Text
                  style={
                    styles.smallText
                  }
                >
                  {
                    t.block_card_hint
                  }
                </Text>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function FieldLabel({
  text,
}: {
  text: string;
}) {
  return (
    <Text style={styles.label}>
      {text}
    </Text>
  );
}

function PrimaryButton({
  text,
  onPress,
  disabled = false,
  flex = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[
        styles.primaryButton,
        flex &&
          styles.flexButton,
        disabled &&
          styles.disabledButton,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        style={
          styles.primaryButtonHighlight
        }
      />

      <Text
        style={
          styles.primaryButtonText
        }
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  text,
  onPress,
  disabled = false,
  flex = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[
        styles.secondaryButton,
        flex &&
          styles.flexButton,
        disabled &&
          styles.disabledButton,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        style={
          styles.secondaryButtonText
        }
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function CheckboxRow({
  checked,
  onPress,
  children,
}: {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={
        styles.checkRow
      }
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.checkbox,

          checked &&
            styles.checkboxChecked,
        ]}
        onPress={onPress}
      >
        {checked ? (
          <Text
            style={
              styles.checkboxCheck
            }
          >
            ✓
          </Text>
        ) : null}
      </TouchableOpacity>

      <Pressable
        style={{ flex: 1 }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </View>
  );
}

const COLORS = {
  bg: "#f6f4ef",
  bgTop: "#f8f6f1",

  panel: "#fffefa",
  panel2: "#eeece6",

  text: "#25282b",
  muted: "#656b70",
  placeholder: "#8a8f93",

  accent: "#b5282d",
  accent2: "#cf3c42",

  dark: "#303438",
  darkHover: "#24282b",

  line: "rgba(37,40,43,0.12)",
  lineStrong:
    "rgba(37,40,43,0.18)",

  green: "#2f6b50",
  greenSoft: "#eaf0eb",

  redSoft: "#f6e9e8",

  privacy: "#e2ded6",
  privacyInner: "#d5d0c7",
};

const styles =
  StyleSheet.create({
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

    backgroundAccentTop: {
      position: "absolute",
      top: -130,
      alignSelf: "center",
      width: 480,
      height: 300,
      borderRadius: 240,
      backgroundColor:
        "rgba(181,40,45,0.045)",
    },

    backgroundAccentRight: {
      position: "absolute",
      right: -180,
      top: 200,
      width: 420,
      height: 420,
      borderRadius: 210,
      backgroundColor:
        "rgba(75,105,115,0.035)",
    },

    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 34,
      flexGrow: 1,
      justifyContent:
        "center",
    },

    wrap: {
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
    },

    brand: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 10,
      marginTop: 4,
      marginBottom: 16,
    },

    brandLogo: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.10)",
      backgroundColor:
        COLORS.panel,
      alignItems: "center",
      justifyContent:
        "center",

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 4,
    },

    brandLogoInner: {
      width: 19,
      height: 19,
      borderRadius: 5,
      backgroundColor:
        COLORS.accent,
      transform: [
        {
          rotate: "45deg",
        },
      ],
    },

    brandLogoCut: {
      position: "absolute",
      width: 7,
      height: 7,
      borderRadius: 2,
      backgroundColor:
        COLORS.panel,
    },

    brandTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 1,
    },

    card: {
      backgroundColor:
        COLORS.panel,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      borderRadius: 20,

      padding: 14,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 14,
      },
      shadowOpacity: 0.09,
      shadowRadius: 24,
      elevation: 5,
    },

    pill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,

      paddingVertical: 9,
      paddingLeft: 12,
      paddingRight: 7,

      borderRadius: 14,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      backgroundColor:
        "rgba(255,255,255,0.62)",
    },

    pillText: {
      flex: 1,
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 17,
    },

    langSelect: {
      minWidth: 70,
      height: 36,

      borderRadius: 10,

      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.16)",

      backgroundColor:
        COLORS.panel,

      alignItems: "center",
      justifyContent:
        "center",

      paddingHorizontal: 9,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },

    langSelectText: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "900",
    },

    sep: {
      height: 1,
      backgroundColor:
        COLORS.line,
      marginVertical: 16,
    },

    footerSep: {
      height: 1,
      backgroundColor:
        COLORS.line,
      marginTop: 18,
      marginBottom: 16,
    },

    label: {
      color: "#41464a",
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 7,
      marginTop: 2,
    },

    input: {
      width: "100%",

      minHeight: 48,

      borderRadius: 11,

      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.15)",

      backgroundColor:
        "rgba(255,254,250,0.96)",

      color: COLORS.text,

      paddingHorizontal: 13,
      paddingVertical: 12,

      fontSize: 15,

      marginBottom: 14,

      shadowColor: "#ffffff",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.8,
      shadowRadius: 1,
    },

    textarea: {
      minHeight: 100,
      textAlignVertical: "top",
    },

    passwordWrap: {
      position: "relative",
      marginBottom: 2,
    },

    passwordInput: {
      paddingRight: 104,
    },

    pwToggle: {
      position: "absolute",
      right: 8,
      top: 8,

      height: 34,

      paddingHorizontal: 9,

      borderRadius: 9,

      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.15)",

      backgroundColor:
        "rgba(238,236,230,0.88)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    pwToggleText: {
      color: COLORS.text,
      fontSize: 10,
      fontWeight: "900",
    },

    forgotWrap: {
      alignSelf:
        "flex-start",
      marginBottom: 4,
    },

    linkBtn: {
      color: COLORS.accent,
      textDecorationLine:
        "underline",
      fontSize: 12,
      fontWeight: "800",
    },

    buttonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 14,
    },

    flexButton: {
      flex: 1,
      minWidth: 145,
    },

    primaryButton: {
      position: "relative",
      overflow: "hidden",

      width: "100%",

      minHeight: 48,

      backgroundColor:
        COLORS.accent,

      borderRadius: 12,

      borderWidth: 1,
      borderColor:
        "rgba(130,25,30,0.16)",

      alignItems: "center",
      justifyContent:
        "center",

      paddingHorizontal: 14,
      paddingVertical: 12,

      marginTop: 10,

      shadowColor:
        COLORS.accent,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 3,
    },

    primaryButtonHighlight: {
      position: "absolute",
      top: 0,
      left: 1,
      right: 1,
      height: 16,

      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
    },

    secondaryButton: {
      width: "100%",

      minHeight: 48,

      backgroundColor:
        COLORS.dark,

      borderRadius: 12,

      borderWidth: 1,
      borderColor:
        COLORS.dark,

      alignItems: "center",
      justifyContent:
        "center",

      paddingHorizontal: 14,
      paddingVertical: 12,

      marginTop: 10,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },

    secondaryButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
    },

    disabledButton: {
      opacity: 0.48,
    },

    smallText: {
      color: COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 10,
    },

    smallTextNoMargin: {
      color: COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
    },

    infoBox: {
      marginTop: 14,

      padding: 14,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      borderRadius: 14,

      backgroundColor:
        "rgba(238,236,230,0.72)",

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.04,
      shadowRadius: 14,
      elevation: 2,
    },

    infoBoxTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      marginBottom: 10,
    },

    privacyBox: {
      backgroundColor:
        COLORS.privacy,

      borderColor:
        "rgba(37,40,43,0.22)",
    },

    privacyTextBox: {
      padding: 12,

      borderRadius: 12,

      backgroundColor:
        COLORS.privacyInner,

      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.18)",

      marginBottom: 12,
    },

    privacyBodyText: {
      color: COLORS.dark,
      fontSize: 12,
      lineHeight: 18,
    },

    checkRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 10,

      marginTop: 12,
      marginBottom: 4,
    },

    checkbox: {
      width: 22,
      height: 22,

      borderRadius: 5,

      borderWidth: 1.5,
      borderColor:
        "rgba(37,40,43,0.28)",

      backgroundColor:
        COLORS.panel,

      alignItems: "center",
      justifyContent:
        "center",

      marginTop: 1,
    },

    checkboxChecked: {
      backgroundColor:
        COLORS.accent,

      borderColor:
        COLORS.accent,
    },

    checkboxCheck: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "900",
      lineHeight: 16,
    },

    checkText: {
      flex: 1,
      color: COLORS.text,
      fontSize: 13,
      lineHeight: 19,
    },

    inlineLink: {
      color: COLORS.accent,
      textDecorationLine:
        "underline",
      fontWeight: "800",
    },

    activationArea: {
      marginTop: 14,

      padding: 16,

      borderRadius: 14,

      backgroundColor:
        COLORS.privacy,

      borderWidth: 1,
      borderColor:
        "rgba(37,40,43,0.22)",

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2,
    },

    claimNoticeBox: {
      borderWidth: 1,
      borderColor:
        "rgba(181,40,45,0.18)",

      backgroundColor:
        COLORS.redSoft,

      borderRadius: 14,

      padding: 14,

      marginBottom: 16,
    },

    claimNoticeTitle: {
      color: COLORS.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8,
    },

    claimNoticeText: {
      color: COLORS.muted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 10,
    },

    pidBadge: {
      alignSelf:
        "flex-start",

      paddingVertical: 8,
      paddingHorizontal: 12,

      borderRadius: 10,

      backgroundColor:
        COLORS.panel,

      borderWidth: 1,
      borderColor:
        COLORS.line,
    },

    pidBadgeText: {
      color: COLORS.text,
      fontWeight: "800",
      letterSpacing: 0.4,
    },

    message: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },

    messageOk: {
      color: COLORS.green,
    },

    messageErr: {
      color: COLORS.accent,
    },

    claimSuccessCard: {
      borderWidth: 1,
      borderColor:
        "rgba(47,107,80,0.24)",

      backgroundColor:
        COLORS.greenSoft,

      borderRadius: 14,

      padding: 16,

      marginTop: 14,
    },

    claimSuccessTitle: {
      color: COLORS.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8,
      lineHeight: 24,
    },

    claimSuccessText: {
      color: "#3f4448",
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 6,
    },

    guideBox: {
      position: "relative",
      overflow: "hidden",

      marginTop: 16,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      borderRadius: 15,

      backgroundColor:
        COLORS.panel,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 2,
    },

    guideHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",

      gap: 12,

      padding: 17,

      borderLeftWidth: 3,
      borderLeftColor:
        COLORS.accent,
    },

    guideTitle: {
      flex: 1,
      color: COLORS.text,
      fontSize: 15,
      fontWeight: "900",
      lineHeight: 20,
    },

    guideToggle: {
      width: 28,
      height: 28,

      borderRadius: 14,

      borderWidth: 1,
      borderColor:
        "rgba(181,40,45,0.22)",

      backgroundColor:
        "rgba(181,40,45,0.09)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    guideToggleText: {
      color: COLORS.accent,
      fontSize: 20,
      lineHeight: 22,
      fontWeight: "700",
    },

    guideContent: {
      paddingHorizontal: 17,
      paddingTop: 15,
      paddingBottom: 8,

      borderTopWidth: 1,
      borderTopColor:
        COLORS.line,
    },

    guideStep: {
      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 10,

      marginBottom: 12,
    },

    guideStepNumber: {
      width: 28,
      height: 28,

      borderRadius: 14,

      backgroundColor:
        COLORS.accent,

      alignItems: "center",
      justifyContent:
        "center",

      shadowColor:
        COLORS.accent,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },

    guideStepNumberText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "900",
    },

    guideStepText: {
      flex: 1,
      color: "#3f4448",
      fontSize: 13,
      lineHeight: 19,
      paddingTop: 4,
    },

    footerLinks: {
      flexDirection: "row",
      flexWrap: "wrap",

      gap: 12,

      alignItems: "center",

      marginBottom: 10,
    },

    footerLink: {
      color: COLORS.accent,
      fontSize: 12,
      textDecorationLine:
        "underline",
      fontWeight: "700",
    },

    copyright: {
      color: COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
    },

    modalKeyboard: {
      flex: 1,
    },

    modalOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(37,40,43,0.56)",

      paddingHorizontal: 20,
      paddingVertical: 30,

      justifyContent:
        "center",
    },

    modalCard: {
      width: "100%",
      maxWidth: 520,

      maxHeight: "90%",

      alignSelf: "center",

      backgroundColor:
        COLORS.panel,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      borderRadius: 20,

      padding: 18,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 16,
      },
      shadowOpacity: 0.18,
      shadowRadius: 30,
      elevation: 10,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",

      gap: 10,
    },

    modalTitle: {
      flex: 1,
      color: COLORS.text,
      fontSize: 18,
      fontWeight: "900",
    },

    modalCloseBtn: {
      width: 38,
      height: 38,

      borderRadius: 11,

      backgroundColor:
        COLORS.dark,

      alignItems: "center",
      justifyContent:
        "center",
    },

    modalCloseBtnText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "900",
    },

    languageModal: {
      width: "100%",
      maxWidth: 330,

      alignSelf: "center",

      backgroundColor:
        COLORS.panel,

      borderRadius: 18,

      borderWidth: 1,
      borderColor:
        COLORS.line,

      padding: 8,

      shadowColor: "#25282b",
      shadowOffset: {
        width: 0,
        height: 16,
      },
      shadowOpacity: 0.16,
      shadowRadius: 28,
      elevation: 10,
    },

    languageOption: {
      minHeight: 50,

      paddingHorizontal: 14,

      borderRadius: 12,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    languageOptionActive: {
      backgroundColor:
        "rgba(181,40,45,0.08)",
    },

    languageOptionText: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: "700",
    },

    languageOptionTextActive: {
      color: COLORS.accent,
      fontWeight: "900",
    },

    languageCheck: {
      color: COLORS.accent,
      fontSize: 17,
      fontWeight: "900",
    },
  });