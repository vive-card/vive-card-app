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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = "https://uyrvuekhvczbjvpbequv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cnZ1ZWtodmN6Ymp2cGJlcXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjA1OTAsImV4cCI6MjA4NjkzNjU5MH0.-6Fia8CGlMxKf6xPGAZK-kFfUXtCtqXH7etfFtMJ1OU";

const LANG_OPTIONS = ["de", "it", "fr", "es", "en"] as const;
type Lang = (typeof LANG_OPTIONS)[number];

const I18N: Record<Lang, Record<string, string>> = {
  de: {
    pill: "🔒 Login / VIVE CARD aktivieren",
    email_label: "E-Mail",
    pw_label: "Passwort",
    pw_toggle: "ANZEIGEN",
    pw_hide: "VERBERGEN",
    forgot_pw: "Passwort vergessen?",
    security_hint: "Sicherheit: Teile deine Login-Daten nie mit Dritten.",
    rescue_note:
      "Empfehlung: E-Mail + Passwort nicht im Gerät speichern. Für Einsatzkräfte gibt es eine separate Notfallansicht.",
    reset_title: "Passwort zurücksetzen (über E-Mail Link bestätigt)",
    new_pw_label: "Neues Passwort",
    new_pw2_label: "Neues Passwort wiederholen",
    btn_reset_pw: "Passwort ändern",
    reset_hint:
      "Hinweis: Nach dem Ändern kannst du dich direkt einloggen.",
    btn_login: "Login",
    btn_signup: "Sign up",
    btn_order: "VIVE CARD bestellen",
    btn_about: "Was ist VIVE CARD?",
    btn_block: "Karte sperren / deaktivieren",
    terms_prefix: "Ich akzeptiere die",
    terms_and: "und die",
    terms_agb: "AGB",
    terms_usage: "Nutzungsvereinbarung",
    btn_accept: "Akzeptieren & weiter",
    pid_label: "Karte (PUBLIC_ID)",
    claim_hint:
      "Sobald du eingeloggt bist, kann deine Karte mit deinem Konto verbunden werden.",
    btn_claim: "Claim Card",
    claim_already: "Bereits aktiviert",
    hint:
      "Hinweis: Prelaunch-Setup. Google Indexing ist deaktiviert (noindex + robots.txt).",
    link_impressum: "Impressum",
    link_privacy: "Datenschutz",
    link_agb: "AGB",
    link_usage: "Nutzungsvereinbarung",
    err_enter: "Bitte E-Mail und Passwort eingeben.",
    err_enter_email: "Bitte E-Mail eingeben.",
    err_login: "Login fehlgeschlagen: ",
    err_signup: "Sign up fehlgeschlagen: ",
    err_user_missing: "Login ok, aber User fehlt. Bitte neu einloggen.",
    err_profile: "Profil konnte nicht geladen werden: ",
    err_save: "Speichern fehlgeschlagen: ",
    err_relogin: "Bitte neu einloggen.",
    need_terms: "Bitte AGB & Nutzungsvereinbarung akzeptieren.",
    need_privacy_claim:
      "Bitte bestätige zuerst den Datenschutzhinweis zur Kartenaktivierung.",
    need_pid: "Bitte PUBLIC_ID eingeben und 'Claim Card' drücken.",
    err_pid: "Bitte PUBLIC_ID eingeben.",
    err_login_first: "Bitte zuerst einloggen.",
    err_claim: "Claim fehlgeschlagen: ",
    err_claim_rpc: "Claim Fehler: RPC nicht verfügbar.",
    terms_ok: "AGB akzeptiert.",
    privacy_claim_ok: "Datenschutzhinweis akzeptiert.",
    signup_ok:
      "Konto erstellt. Bitte bestätige jetzt deine E-Mail über den Link in deinem Postfach.",
    err_reset: "Reset fehlgeschlagen: ",
    reset_sent: "E-Mail zum Zurücksetzen wurde versendet. Bitte Postfach prüfen.",
    err_pw_short: "Passwort zu kurz (mind. 6 Zeichen).",
    err_pw_match: "Passwörter stimmen nicht überein.",
    err_reset_apply: "Passwort-Änderung fehlgeschlagen: ",
    reset_ok:
      "Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.",
    pid_detected_login:
      "PUBLIC_ID erkannt. Bitte einloggen und dann 'Claim Card' drücken.",
    pid_detected: "PUBLIC_ID erkannt.",
    claim_ok: "Claim OK.",
    err_pid_save: "PUBLIC_ID konnte nicht gespeichert werden: ",
    err_privacy_save:
      "Datenschutzzustimmung konnte nicht gespeichert werden: ",
    banner: "PRE-LAUNCH PRIVATE VERSION",
single_account_notice:
  "Wichtiger Hinweis: Pro PUBLIC_ID kann nur eine E-Mail-Adresse bzw. ein Konto verwendet werden. Bitte registriere dich mit derselben E-Mail-Adresse wie bei deiner Bestellung.",
terms_intro:
  "Bevor du deine VIVE CARD aktivieren kannst, bestätige bitte die AGB und Nutzungsvereinbarung.",

privacy_claim_title: "Datenschutzhinweis zur Kartenaktivierung",
privacy_claim_body:
  "Mit der Aktivierung deiner VIVE CARD können freiwillig persönliche Informationen gespeichert werden, einschliesslich möglicher Gesundheitsdaten wie z. B. Allergien, Medikamente, Blutgruppe oder Notfallhinweise.\n\nDiese Angaben werden ausschliesslich von dir bereitgestellt und verwaltet. Bitte speichere nur Daten, deren Verarbeitung du ausdrücklich wünschst.",
privacy_claim_checkbox:
  "Ich habe den Datenschutzhinweis zur Kartenaktivierung gelesen und bin damit einverstanden, dass von mir freiwillig eingegebene persönliche Daten – einschliesslich möglicher Gesundheitsdaten – im Rahmen meiner VIVE CARD gespeichert werden.",
btn_accept_privacy_claim: "Datenschutzhinweis akzeptieren",

claim_notice_title: "VIVE CARD erkannt",
claim_notice_text:
  "Bitte logge dich ein oder erstelle ein Konto. Danach wird deine VIVE CARD automatisch aktiviert.",
public_id_label: "PUBLIC_ID",

claim_success_title: "✅ Deine VIVE CARD wurde erfolgreich aktiviert",
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
block_reason_ph: "z.B. Karte verloren, falsche Zuordnung, Konto löschen",
btn_block_card_submit: "Sperranfrage senden",
block_card_hint:
  "Die Anfrage wird an den Support weitergeleitet. Danach wird die Karte manuell geprüft und gesperrt bzw. deaktiviert.",

err_valid_email: "Bitte eine gültige E-Mail eingeben.",
err_accept_terms_first:
  "Bitte akzeptiere zuerst die AGB und die Nutzungsvereinbarung.",
err_signup_failed_generic: "Registrierung fehlgeschlagen.",
err_block_card_request: "Sperranfrage konnte nicht gesendet werden.",
block_card_success:
  "Deine Sperranfrage wurde erfolgreich übermittelt. Die Karte wurde sofort gesperrt und unser Support prüft den Fall schnellstmöglich.",
err_confirm_email_first:
  "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.",
card_status_check_failed: "Kartenstatus konnte nicht geprüft werden: ",
card_blocked: "Diese VIVE CARD wurde gesperrt oder deaktiviert.",

alert_error_title: "Fehler",
alert_open_link_failed: "Link konnte nicht geöffnet werden",
alert_card_activated_title: "VIVE CARD aktiviert",
alert_card_activated_text:
  "Deine Karte wurde aktiviert. Durch die aktive Session wechselst du nun in die App.",

pid_ph: "z.B. PVJ2AT5B6Y",
  },
  it: {
    pill: "🔒 Login / attiva VIVE CARD",
    email_label: "E-mail",
    pw_label: "Password",
    pw_toggle: "MOSTRA",
    pw_hide: "NASCONDI",
    forgot_pw: "Password dimenticata?",
    security_hint: "Sicurezza: non condividere mai i dati di accesso.",
    rescue_note:
      "Consiglio: non salvare e-mail e password sul dispositivo. Per i soccorritori esiste una vista d’emergenza separata.",
    reset_title: "Reimposta password",
    new_pw_label: "Nuova password",
    new_pw2_label: "Ripeti nuova password",
    btn_reset_pw: "Cambia password",
    reset_hint:
      "Dopo il cambio puoi accedere direttamente.",
    btn_login: "Accedi",
    btn_signup: "Registrati",
    btn_order: "Ordina VIVE CARD",
    btn_about: "Cos’è VIVE CARD?",
    btn_block: "Blocca / disattiva carta",
    terms_prefix: "Accetto i",
    terms_and: "e il",
    terms_agb: "Termini",
    terms_usage: "Contratto d’uso",
    btn_accept: "Accetta e continua",
    pid_label: "Carta (PUBLIC_ID)",
    claim_hint:
      "Dopo il login, la carta può essere collegata al tuo account.",
    btn_claim: "Claim Card",
    claim_already: "Già attivata",
    hint: "Setup prelaunch. Indicizzazione Google disattivata.",
    link_impressum: "Note legali",
    link_privacy: "Privacy",
    link_agb: "AGB",
    link_usage: "Contratto d’uso",
    err_enter: "Inserisci e-mail e password.",
    err_enter_email: "Inserisci e-mail.",
    err_login: "Login fallito: ",
    err_signup: "Registrazione fallita: ",
    err_user_missing: "Login ok, ma utente mancante.",
    err_profile: "Impossibile caricare il profilo: ",
    err_save: "Salvataggio fallito: ",
    err_relogin: "Effettua nuovamente il login.",
    need_terms: "Accetta prima AGB e contratto d’uso.",
    need_privacy_claim:
      "Conferma prima l’informativa privacy per l’attivazione della carta.",
    need_pid: "Inserisci la PUBLIC_ID e premi Claim Card.",
    err_pid: "Inserisci la PUBLIC_ID.",
    err_login_first: "Effettua prima il login.",
    err_claim: "Claim fallito: ",
    err_claim_rpc: "Errore Claim: RPC non disponibile.",
    terms_ok: "AGB accettati.",
    privacy_claim_ok: "Informativa privacy accettata.",
    signup_ok:
      "Account creato. Conferma ora la tua e-mail tramite il link ricevuto.",
    err_reset: "Reset fallito: ",
    reset_sent: "E-mail di reset inviata.",
    err_pw_short: "Password troppo corta (minimo 6 caratteri).",
    err_pw_match: "Le password non coincidono.",
    err_reset_apply: "Cambio password fallito: ",
    reset_ok: "Password cambiata con successo.",
    pid_detected_login:
      "PUBLIC_ID riconosciuta. Effettua il login e premi Claim Card.",
    pid_detected: "PUBLIC_ID riconosciuta.",
    claim_ok: "Claim OK.",
    err_pid_save: "Impossibile salvare la PUBLIC_ID: ",
    err_privacy_save:
      "Impossibile salvare il consenso privacy: ",
    banner: "VERSIONE PRIVATA PRE-LANCIO",
single_account_notice:
  "Avviso importante: per ogni PUBLIC_ID può essere utilizzato un solo indirizzo e-mail o un solo account. Registrati con lo stesso indirizzo e-mail usato per il tuo ordine.",
terms_intro:
  "Prima di poter attivare la tua VIVE CARD, conferma i Termini e le Condizioni d'uso.",

privacy_claim_title: "Informativa privacy per l'attivazione della carta",
privacy_claim_body:
  "Con l'attivazione della tua VIVE CARD possono essere salvate volontariamente informazioni personali, inclusi possibili dati sanitari come allergie, farmaci, gruppo sanguigno o note di emergenza.\n\nQuesti dati sono forniti e gestiti esclusivamente da te. Salva solo i dati di cui desideri espressamente il trattamento.",
privacy_claim_checkbox:
  "Ho letto l'informativa privacy per l'attivazione della carta e accetto che i dati personali inseriti volontariamente da me – inclusi eventuali dati sanitari – vengano memorizzati nell'ambito della mia VIVE CARD.",
btn_accept_privacy_claim: "Accetta informativa privacy",

claim_notice_title: "VIVE CARD rilevata",
claim_notice_text:
  "Effettua il login o crea un account. Successivamente la tua VIVE CARD verrà attivata automaticamente.",
public_id_label: "PUBLIC_ID",

claim_success_title: "✅ La tua VIVE CARD è stata attivata con successo",
claim_success_text:
  "La tua carta è ora collegata al tuo account. Ora puoi compilare il tuo profilo e le tue informazioni di emergenza.\n\nSe hai ordinato altre carte, apri semplicemente il link di attivazione successivo ricevuto via e-mail e ripeti la procedura.",
btn_go_profile: "Compila profilo",

signup_title: "Crea account",
signup_password_ph: "Almeno 6 caratteri",
signup_password2_ph: "Ripeti password",
signup_pw2_label: "Ripeti password",
btn_signup_start: "Avvia registrazione",
signup_hint:
  "Dopo il clic riceverai un'e-mail di conferma. Successivamente potrai attivare il tuo account e associare la tua VIVE CARD.",

block_card_title: "Blocca / disattiva carta",
block_card_intro:
  "Se la tua carta è stata smarrita o deve essere disattivata, invia qui una richiesta di blocco. Indica l'indirizzo e-mail e la PUBLIC_ID collegati alla carta.",
block_reason_label: "Motivo (opzionale)",
block_reason_ph: "es. carta smarrita, assegnazione errata, eliminazione account",
btn_block_card_submit: "Invia richiesta di blocco",
block_card_hint:
  "La richiesta verrà inoltrata al supporto. Successivamente la carta sarà verificata manualmente e bloccata o disattivata.",

err_valid_email: "Inserisci un indirizzo e-mail valido.",
err_accept_terms_first:
  "Accetta prima i Termini e le Condizioni d'uso.",
err_signup_failed_generic: "Registrazione fallita.",
err_block_card_request: "Impossibile inviare la richiesta di blocco.",
block_card_success:
  "La tua richiesta di blocco è stata inviata con successo. La carta è stata bloccata immediatamente e il nostro supporto esaminerà il caso il prima possibile.",
err_confirm_email_first:
  "Conferma prima il tuo indirizzo e-mail tramite il link nella tua casella di posta.",
card_status_check_failed: "Impossibile verificare lo stato della carta: ",
card_blocked: "Questa VIVE CARD è stata bloccata o disattivata.",

alert_error_title: "Errore",
alert_open_link_failed: "Impossibile aprire il link",
alert_card_activated_title: "VIVE CARD attivata",
alert_card_activated_text:
  "La tua carta è stata attivata. Grazie alla sessione attiva, ora entrerai nell'app.",

pid_ph: "es. PVJ2AT5B6Y",
  },
  fr: {
    pill: "🔒 Login / activer VIVE CARD",
    email_label: "E-mail",
    pw_label: "Mot de passe",
    pw_toggle: "AFFICHER",
    pw_hide: "MASQUER",
    forgot_pw: "Mot de passe oublié ?",
    security_hint: "Sécurité : ne partage jamais tes identifiants.",
    rescue_note:
      "Recommandation : ne pas enregistrer e-mail et mot de passe sur l’appareil. Une vue d’urgence séparée existe.",
    reset_title: "Réinitialiser le mot de passe",
    new_pw_label: "Nouveau mot de passe",
    new_pw2_label: "Répéter le mot de passe",
    btn_reset_pw: "Changer le mot de passe",
    reset_hint: "Après la modification, tu peux te connecter directement.",
    btn_login: "Connexion",
    btn_signup: "Inscription",
    btn_order: "Commander VIVE CARD",
    btn_about: "Qu’est-ce que VIVE CARD ?",
    btn_block: "Bloquer / désactiver la carte",
    terms_prefix: "J’accepte les",
    terms_and: "et les",
    terms_agb: "CGV",
    terms_usage: "conditions d’utilisation",
    btn_accept: "Accepter et continuer",
    pid_label: "Carte (PUBLIC_ID)",
    claim_hint:
      "Une fois connecté, ta carte peut être liée à ton compte.",
    btn_claim: "Claim Card",
    claim_already: "Déjà activée",
    hint: "Configuration prelaunch. Indexation Google désactivée.",
    link_impressum: "Mentions légales",
    link_privacy: "Protection des données",
    link_agb: "CGV",
    link_usage: "Conditions d’utilisation",
    err_enter: "Veuillez saisir e-mail et mot de passe.",
    err_enter_email: "Veuillez saisir l’e-mail.",
    err_login: "Échec de connexion : ",
    err_signup: "Échec d’inscription : ",
    err_user_missing: "Connexion OK, mais utilisateur introuvable.",
    err_profile: "Impossible de charger le profil : ",
    err_save: "Échec d’enregistrement : ",
    err_relogin: "Veuillez vous reconnecter.",
    need_terms: "Veuillez d’abord accepter les conditions.",
    need_privacy_claim:
      "Veuillez d’abord confirmer l’information de confidentialité.",
    need_pid: "Veuillez saisir la PUBLIC_ID puis appuyer sur Claim Card.",
    err_pid: "Veuillez saisir la PUBLIC_ID.",
    err_login_first: "Veuillez d’abord vous connecter.",
    err_claim: "Échec du claim : ",
    err_claim_rpc: "Erreur Claim : RPC indisponible.",
    terms_ok: "Conditions acceptées.",
    privacy_claim_ok: "Confidentialité acceptée.",
    signup_ok:
      "Compte créé. Merci de confirmer votre e-mail via le lien reçu.",
    err_reset: "Échec du reset : ",
    reset_sent: "E-mail de réinitialisation envoyé.",
    err_pw_short: "Mot de passe trop court (min. 6 caractères).",
    err_pw_match: "Les mots de passe ne correspondent pas.",
    err_reset_apply: "Modification du mot de passe échouée : ",
    reset_ok: "Mot de passe modifié avec succès.",
    pid_detected_login:
      "PUBLIC_ID détectée. Connectez-vous puis appuyez sur Claim Card.",
    pid_detected: "PUBLIC_ID détectée.",
    claim_ok: "Claim OK.",
    err_pid_save: "Impossible d’enregistrer la PUBLIC_ID : ",
    err_privacy_save:
      "Impossible d’enregistrer le consentement confidentialité : ",
    banner: "VERSION PRIVÉE PRÉ-LANCEMENT",
single_account_notice:
  "Remarque importante : une seule adresse e-mail ou un seul compte peut être utilisé par PUBLIC_ID. Veuillez vous inscrire avec la même adresse e-mail que celle utilisée lors de votre commande.",
terms_intro:
  "Avant de pouvoir activer votre VIVE CARD, veuillez confirmer les conditions générales et les conditions d'utilisation.",

privacy_claim_title: "Avis de confidentialité pour l'activation de la carte",
privacy_claim_body:
  "Avec l'activation de votre VIVE CARD, des informations personnelles peuvent être enregistrées volontairement, y compris d'éventuelles données de santé telles que des allergies, des médicaments, le groupe sanguin ou des notes d'urgence.\n\nCes informations sont fournies et gérées exclusivement par vous. Veuillez n'enregistrer que les données dont vous souhaitez expressément le traitement.",
privacy_claim_checkbox:
  "J'ai lu l'avis de confidentialité relatif à l'activation de la carte et j'accepte que les données personnelles que je saisis volontairement – y compris d'éventuelles données de santé – soient enregistrées dans le cadre de ma VIVE CARD.",
btn_accept_privacy_claim: "Accepter l'avis de confidentialité",

claim_notice_title: "VIVE CARD détectée",
claim_notice_text:
  "Veuillez vous connecter ou créer un compte. Ensuite, votre VIVE CARD sera automatiquement activée.",
public_id_label: "PUBLIC_ID",

claim_success_title: "✅ Votre VIVE CARD a été activée avec succès",
claim_success_text:
  "Votre carte est maintenant liée à votre compte. Vous pouvez désormais compléter votre profil et vos informations d'urgence.\n\nSi vous avez commandé d'autres cartes, ouvrez simplement le lien d'activation suivant reçu par e-mail et répétez la procédure.",
btn_go_profile: "Compléter le profil",

signup_title: "Créer un compte",
signup_password_ph: "Au moins 6 caractères",
signup_password2_ph: "Répéter le mot de passe",
signup_pw2_label: "Répéter le mot de passe",
btn_signup_start: "Démarrer l'inscription",
signup_hint:
  "Après avoir cliqué, vous recevrez un e-mail de confirmation. Vous pourrez ensuite activer votre compte et associer votre VIVE CARD.",

block_card_title: "Bloquer / désactiver la carte",
block_card_intro:
  "Si votre carte a été perdue ou doit être désactivée, envoyez ici une demande de blocage. Veuillez indiquer l'adresse e-mail et la PUBLIC_ID liées à la carte.",
block_reason_label: "Motif (optionnel)",
block_reason_ph: "p. ex. carte perdue, mauvaise attribution, suppression du compte",
btn_block_card_submit: "Envoyer la demande de blocage",
block_card_hint:
  "La demande sera transmise au support. Ensuite, la carte sera vérifiée manuellement puis bloquée ou désactivée.",

err_valid_email: "Veuillez saisir une adresse e-mail valide.",
err_accept_terms_first:
  "Veuillez d'abord accepter les conditions générales et les conditions d'utilisation.",
err_signup_failed_generic: "Échec de l'inscription.",
err_block_card_request: "La demande de blocage n'a pas pu être envoyée.",
block_card_success:
  "Votre demande de blocage a été transmise avec succès. La carte a été bloquée immédiatement et notre support examinera le cas dans les plus brefs délais.",
err_confirm_email_first:
  "Veuillez d'abord confirmer votre adresse e-mail via le lien dans votre boîte mail.",
card_status_check_failed: "Impossible de vérifier le statut de la carte : ",
card_blocked: "Cette VIVE CARD a été bloquée ou désactivée.",

alert_error_title: "Erreur",
alert_open_link_failed: "Le lien n'a pas pu être ouvert",
alert_card_activated_title: "VIVE CARD activée",
alert_card_activated_text:
  "Votre carte a été activée. Grâce à la session active, vous allez maintenant entrer dans l'application.",

pid_ph: "p. ex. PVJ2AT5B6Y",
  },
  es: {
    pill: "🔒 Login / activar VIVE CARD",
    email_label: "Correo electrónico",
    pw_label: "Contraseña",
    pw_toggle: "MOSTRAR",
    pw_hide: "OCULTAR",
    forgot_pw: "¿Olvidaste la contraseña?",
    security_hint: "Seguridad: nunca compartas tus datos de acceso.",
    rescue_note:
      "Recomendación: no guardar correo y contraseña en el dispositivo. Existe una vista de emergencia separada.",
    reset_title: "Restablecer contraseña",
    new_pw_label: "Nueva contraseña",
    new_pw2_label: "Repetir nueva contraseña",
    btn_reset_pw: "Cambiar contraseña",
    reset_hint: "Después podrás iniciar sesión directamente.",
    btn_login: "Iniciar sesión",
    btn_signup: "Registrarse",
    btn_order: "Pedir VIVE CARD",
    btn_about: "¿Qué es VIVE CARD?",
    btn_block: "Bloquear / desactivar tarjeta",
    terms_prefix: "Acepto las",
    terms_and: "y el",
    terms_agb: "condiciones",
    terms_usage: "acuerdo de uso",
    btn_accept: "Aceptar y continuar",
    pid_label: "Tarjeta (PUBLIC_ID)",
    claim_hint:
      "Después de iniciar sesión, tu tarjeta puede vincularse a tu cuenta.",
    btn_claim: "Claim Card",
    claim_already: "Ya activada",
    hint: "Configuración prelaunch. Indexación de Google desactivada.",
    link_impressum: "Aviso legal",
    link_privacy: "Privacidad",
    link_agb: "AGB",
    link_usage: "Acuerdo de uso",
    err_enter: "Introduce correo y contraseña.",
    err_enter_email: "Introduce el correo.",
    err_login: "Inicio de sesión fallido: ",
    err_signup: "Registro fallido: ",
    err_user_missing: "Login correcto, pero falta el usuario.",
    err_profile: "No se pudo cargar el perfil: ",
    err_save: "Guardado fallido: ",
    err_relogin: "Vuelve a iniciar sesión.",
    need_terms: "Acepta primero las condiciones.",
    need_privacy_claim:
      "Confirma primero la nota de privacidad para activar la tarjeta.",
    need_pid: "Introduce la PUBLIC_ID y pulsa Claim Card.",
    err_pid: "Introduce la PUBLIC_ID.",
    err_login_first: "Primero inicia sesión.",
    err_claim: "Claim fallido: ",
    err_claim_rpc: "Error Claim: RPC no disponible.",
    terms_ok: "Condiciones aceptadas.",
    privacy_claim_ok: "Privacidad aceptada.",
    signup_ok:
      "Cuenta creada. Ahora confirma tu correo con el enlace recibido.",
    err_reset: "Reset fallido: ",
    reset_sent: "Correo de restablecimiento enviado.",
    err_pw_short: "Contraseña demasiado corta (mín. 6 caracteres).",
    err_pw_match: "Las contraseñas no coinciden.",
    err_reset_apply: "Cambio de contraseña fallido: ",
    reset_ok: "Contraseña cambiada correctamente.",
    pid_detected_login:
      "PUBLIC_ID detectada. Inicia sesión y pulsa Claim Card.",
    pid_detected: "PUBLIC_ID detectada.",
    claim_ok: "Claim OK.",
    err_pid_save: "No se pudo guardar la PUBLIC_ID: ",
    err_privacy_save:
      "No se pudo guardar el consentimiento de privacidad: ",
   banner: "VERSIÓN PRIVADA DE PRELANZAMIENTO",
single_account_notice:
  "Aviso importante: por cada PUBLIC_ID solo se puede utilizar una dirección de correo electrónico o una cuenta. Regístrate con la misma dirección de correo electrónico que utilizaste en tu pedido.",
terms_intro:
  "Antes de poder activar tu VIVE CARD, confirma los términos y condiciones y las condiciones de uso.",

privacy_claim_title: "Aviso de privacidad para la activación de la tarjeta",
privacy_claim_body:
  "Con la activación de tu VIVE CARD se podrán guardar voluntariamente datos personales, incluidos posibles datos de salud como alergias, medicamentos, grupo sanguíneo o indicaciones de emergencia.\n\nEstos datos son proporcionados y gestionados exclusivamente por ti. Guarda solo los datos cuyo tratamiento deseas expresamente.",
privacy_claim_checkbox:
  "He leído el aviso de privacidad para la activación de la tarjeta y acepto que los datos personales introducidos voluntariamente por mí – incluidos posibles datos de salud – se almacenen en el marco de mi VIVE CARD.",
btn_accept_privacy_claim: "Aceptar aviso de privacidad",

claim_notice_title: "VIVE CARD detectada",
claim_notice_text:
  "Inicia sesión o crea una cuenta. Después, tu VIVE CARD se activará automáticamente.",
public_id_label: "PUBLIC_ID",

claim_success_title: "✅ Tu VIVE CARD se ha activado correctamente",
claim_success_text:
  "Tu tarjeta ya está vinculada a tu cuenta. Ahora puedes completar tu perfil y tu información de emergencia.\n\nSi has pedido más tarjetas, solo tienes que abrir el siguiente enlace de activación de tu correo electrónico y repetir el proceso.",
btn_go_profile: "Completar perfil",

signup_title: "Crear cuenta",
signup_password_ph: "Al menos 6 caracteres",
signup_password2_ph: "Repetir contraseña",
signup_pw2_label: "Repetir contraseña",
btn_signup_start: "Iniciar registro",
signup_hint:
  "Después de hacer clic recibirás un correo de confirmación. Después podrás activar tu cuenta y asignar tu VIVE CARD.",

block_card_title: "Bloquear / desactivar tarjeta",
block_card_intro:
  "Si tu tarjeta se ha perdido o debe desactivarse, envía aquí una solicitud de bloqueo. Indica la dirección de correo electrónico y la PUBLIC_ID vinculadas a la tarjeta.",
block_reason_label: "Motivo (opcional)",
block_reason_ph: "p. ej. tarjeta perdida, asignación incorrecta, eliminar cuenta",
btn_block_card_submit: "Enviar solicitud de bloqueo",
block_card_hint:
  "La solicitud se enviará al soporte. Después, la tarjeta será revisada manualmente y bloqueada o desactivada.",

err_valid_email: "Introduce una dirección de correo electrónico válida.",
err_accept_terms_first:
  "Acepta primero los términos y condiciones y las condiciones de uso.",
err_signup_failed_generic: "Error en el registro.",
err_block_card_request: "No se pudo enviar la solicitud de bloqueo.",
block_card_success:
  "Tu solicitud de bloqueo se ha enviado correctamente. La tarjeta se ha bloqueado de inmediato y nuestro soporte revisará el caso lo antes posible.",
err_confirm_email_first:
  "Confirma primero tu dirección de correo electrónico mediante el enlace de tu bandeja de entrada.",
card_status_check_failed: "No se pudo comprobar el estado de la tarjeta: ",
card_blocked: "Esta VIVE CARD ha sido bloqueada o desactivada.",

alert_error_title: "Error",
alert_open_link_failed: "No se pudo abrir el enlace",
alert_card_activated_title: "VIVE CARD activada",
alert_card_activated_text:
  "Tu tarjeta ha sido activada. Gracias a la sesión activa, ahora entrarás en la aplicación.",

pid_ph: "p. ej. PVJ2AT5B6Y",
  },
  en: {
    pill: "🔒 Login / activate VIVE CARD",
    email_label: "Email",
    pw_label: "Password",
    pw_toggle: "SHOW",
    pw_hide: "HIDE",
    forgot_pw: "Forgot password?",
    security_hint: "Security: never share your login data with third parties.",
    rescue_note:
      "Recommendation: do not store email + password on the device. There is a separate emergency view for responders.",
    reset_title: "Reset password",
    new_pw_label: "New password",
    new_pw2_label: "Repeat new password",
    btn_reset_pw: "Change password",
    reset_hint: "After changing it, you can log in directly.",
    btn_login: "Login",
    btn_signup: "Sign up",
    btn_order: "Order VIVE CARD",
    btn_about: "What is VIVE CARD?",
    btn_block: "Block / deactivate card",
    terms_prefix: "I accept the",
    terms_and: "and the",
    terms_agb: "terms",
    terms_usage: "usage agreement",
    btn_accept: "Accept & continue",
    pid_label: "Card (PUBLIC_ID)",
    claim_hint:
      "As soon as you are logged in, your card can be linked to your account.",
    btn_claim: "Claim Card",
    claim_already: "Already activated",
    hint: "Prelaunch setup. Google indexing is disabled.",
    link_impressum: "Imprint",
    link_privacy: "Privacy",
    link_agb: "Terms",
    link_usage: "Usage agreement",
    err_enter: "Please enter email and password.",
    err_enter_email: "Please enter email.",
    err_login: "Login failed: ",
    err_signup: "Sign up failed: ",
    err_user_missing: "Login OK, but user is missing.",
    err_profile: "Profile could not be loaded: ",
    err_save: "Saving failed: ",
    err_relogin: "Please log in again.",
    need_terms: "Please accept terms & usage agreement first.",
    need_privacy_claim:
      "Please confirm the privacy notice for card activation first.",
    need_pid: "Please enter PUBLIC_ID and press Claim Card.",
    err_pid: "Please enter PUBLIC_ID.",
    err_login_first: "Please log in first.",
    err_claim: "Claim failed: ",
    err_claim_rpc: "Claim error: RPC not available.",
    terms_ok: "Terms accepted.",
    privacy_claim_ok: "Privacy notice accepted.",
    signup_ok:
      "Account created. Please confirm your email using the link in your inbox.",
    err_reset: "Reset failed: ",
    reset_sent: "Reset email has been sent. Please check your inbox.",
    err_pw_short: "Password too short (min. 6 characters).",
    err_pw_match: "Passwords do not match.",
    err_reset_apply: "Password change failed: ",
    reset_ok: "Password successfully changed.",
    pid_detected_login:
      "PUBLIC_ID detected. Please log in and then press Claim Card.",
    pid_detected: "PUBLIC_ID detected.",
    claim_ok: "Claim OK.",
    err_pid_save: "PUBLIC_ID could not be saved: ",
    err_privacy_save:
      "Privacy consent could not be saved: ",
    banner: "PRE-LAUNCH PRIVATE VERSION",
single_account_notice:
  "Important notice: only one email address or account can be used per PUBLIC_ID. Please register with the same email address you used for your order.",
terms_intro:
  "Before you can activate your VIVE CARD, please confirm the Terms and Conditions and the Terms of Use.",

privacy_claim_title: "Privacy notice for card activation",
privacy_claim_body:
  "When activating your VIVE CARD, you may voluntarily store personal information, including possible health data such as allergies, medications, blood type, or emergency notes.\n\nThis information is provided and managed exclusively by you. Please store only data that you explicitly want to be processed.",
privacy_claim_checkbox:
  "I have read the privacy notice for card activation and agree that personal data voluntarily entered by me – including possible health data – may be stored as part of my VIVE CARD.",
btn_accept_privacy_claim: "Accept privacy notice",

claim_notice_title: "VIVE CARD detected",
claim_notice_text:
  "Please log in or create an account. After that, your VIVE CARD will be activated automatically.",
public_id_label: "PUBLIC_ID",

claim_success_title: "✅ Your VIVE CARD has been activated successfully",
claim_success_text:
  "Your card is now linked to your account. You can now complete your profile and your emergency information.\n\nIf you ordered additional cards, simply open the next activation link from your email and repeat the process.",
btn_go_profile: "Complete profile",

signup_title: "Create account",
signup_password_ph: "At least 6 characters",
signup_password2_ph: "Repeat password",
signup_pw2_label: "Repeat password",
btn_signup_start: "Start registration",
signup_hint:
  "After clicking, you will receive a confirmation email. After that, you can activate your account and assign your VIVE CARD.",

block_card_title: "Block / deactivate card",
block_card_intro:
  "If your card has been lost or needs to be deactivated, submit a block request here. Please enter the email address and PUBLIC_ID linked to the card.",
block_reason_label: "Reason (optional)",
block_reason_ph: "e.g. lost card, wrong assignment, delete account",
btn_block_card_submit: "Send block request",
block_card_hint:
  "The request will be forwarded to support. After that, the card will be checked manually and blocked or deactivated.",

err_valid_email: "Please enter a valid email address.",
err_accept_terms_first:
  "Please accept the Terms and Conditions and the Terms of Use first.",
err_signup_failed_generic: "Sign up failed.",
err_block_card_request: "Block request could not be sent.",
block_card_success:
  "Your block request was submitted successfully. The card was blocked immediately and our support team will review the case as soon as possible.",
err_confirm_email_first:
  "Please confirm your email address first using the link in your inbox.",
card_status_check_failed: "Card status could not be checked: ",
card_blocked: "This VIVE CARD has been blocked or deactivated.",

alert_error_title: "Error",
alert_open_link_failed: "The link could not be opened",
alert_card_activated_title: "VIVE CARD activated",
alert_card_activated_text:
  "Your card has been activated. Because your session is active, you will now enter the app.",

pid_ph: "e.g. PVJ2AT5B6Y",
  },
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function mergeLang(base: Lang) {
  return I18N[base] || I18N.de;
}

export default function LoginScreen({ navigation }: any) {
  const [lang, setLang] = useState<Lang>("de");
  const t = useMemo(() => mergeLang(lang), [lang]);

  const [msg, setMsg] = useState<{ text: string; type: "" | "ok" | "err" }>({
    text: "",
    type: "",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [publicId, setPublicId] = useState("");

  const [pwVisible, setPwVisible] = useState(false);

  const [showResetBox, setShowResetBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [showTermsBox, setShowTermsBox] = useState(false);
  const [termsCheck, setTermsCheck] = useState(false);

  const [showPrivacyBox, setShowPrivacyBox] = useState(false);
  const [privacyCheck, setPrivacyCheck] = useState(false);

  const [showClaimNotice, setShowClaimNotice] = useState(false);
  const [claimNoticePid, setClaimNoticePid] = useState("");
  const [claimSuccessPid, setClaimSuccessPid] = useState("");

  const [signupOpen, setSignupOpen] = useState(false);
  const [signupMsg, setSignupMsg] = useState<{
    text: string;
    type: "" | "ok" | "err";
  }>({ text: "", type: "" });
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");
  const [signupTermsCheck, setSignupTermsCheck] = useState(false);
  const [signupPwVisible, setSignupPwVisible] = useState(false);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockMsg, setBlockMsg] = useState<{
    text: string;
    type: "" | "ok" | "err";
  }>({ text: "", type: "" });
  const [blockEmail, setBlockEmail] = useState("");
  const [blockPublicId, setBlockPublicId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const [busy, setBusy] = useState<string | null>(null);

  const setMainMessage = (text: string, type: "" | "ok" | "err" = "") => {
    setMsg({ text, type });
  };

  const setSignupMessage = (text: string, type: "" | "ok" | "err" = "") => {
    setSignupMsg({ text, type });
  };

  const setBlockMessage = (text: string, type: "" | "ok" | "err" = "") => {
    setBlockMsg({ text, type });
  };

  const resetClaimState = () => {
    setClaimSuccessPid("");
  };

  const openUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t.alert_error_title, t.alert_open_link_failed);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(t.alert_error_title, t.alert_open_link_failed);
  }
};

  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { user: null, error };
    return { user: data?.user || null, error: null };
  };

  const loadProfile = async (ownerId: string) => {
    return await supabase
      .from("profiles")
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .eq("owner_id", ownerId)
      .maybeSingle();
  };

  const upsertProfile = async (values: any) => {
    return await supabase
      .from("profiles")
      .upsert(values, { onConflict: "owner_id" })
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .maybeSingle();
  };

  const savePrivacyClaimConsent = async (ownerId: string) => {
    return await supabase
      .from("profiles")
      .upsert(
        {
          owner_id: ownerId,
          privacy_claim_accepted_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      )
      .select(
        "terms_accepted_at, public_id, privacy_claim_accepted_at, email_confirmed_at"
      )
      .maybeSingle();
  };

  const getOrCreateProfile = async () => {
    const { user, error: userErr } = await getCurrentUser();
    if (userErr || !user) {
      return { user: null, profile: null, error: new Error(t.err_relogin) };
    }

    let { data: profile, error } = await loadProfile(user.id);
    if (error) return { user, profile: null, error };

    if (!profile) {
      const up = await upsertProfile({ owner_id: user.id });
      if (up.error) return { user, profile: null, error: up.error };
      profile = up.data || null;
    }

    return { user, profile, error: null };
  };

  const getCardByPid = async (pid: string) => {
    const cleanPid = normalizePid(pid);
    if (!cleanPid) return { card: null, error: null };

    const { data, error } = await supabase
      .from("cards")
      .select("id, public_id, status, blocked_at")
      .eq("public_id", cleanPid)
      .maybeSingle();

    if (error) return { card: null, error };
    return { card: data || null, error: null };
  };

  const isBlockedCard = (card: any) => {
    if (!card) return false;
    return String(card.status || "") === "blocked" || !!card.blocked_at;
  };

  const ensureCardNotBlocked = async (pid: string) => {
    const cleanPid = normalizePid(pid);
    if (!cleanPid) return { ok: true, card: null, message: "" };

    const { card, error } = await getCardByPid(cleanPid);

    if (error) {
      return {
        ok: false,
        card: null,
        message: t.card_status_check_failed + error.message,
      };
    }

    if (card && isBlockedCard(card)) {
      return {
        ok: false,
        card,
        message: t.card_blocked,
      };
    }

    return { ok: true, card, message: "" };
  };

  const performClaimFlow = async (pid: string) => {
    const cleanPid = normalizePid(pid);
    if (!cleanPid) {
      setMainMessage(t.err_pid, "err");
      return false;
    }

    setPublicId(cleanPid);

    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      setMainMessage(t.err_login_first, "err");
      return false;
    }

    const { user, profile, error } = await getOrCreateProfile();

    if (error || !user) {
      setMainMessage(error?.message || t.err_user_missing, "err");
      return false;
    }

    const authConfirmedAt =
      (user as any)?.email_confirmed_at || (user as any)?.confirmed_at || null;

    if (!profile?.email_confirmed_at && authConfirmedAt) {
      const syncRes = await upsertProfile({
        owner_id: user.id,
        email: String(user.email || "").trim().toLowerCase(),
        email_confirmed_at: authConfirmedAt,
      });

      if (!syncRes.error && syncRes.data) {
        profile.email_confirmed_at = authConfirmedAt;
      }
    }

    if (!profile?.email_confirmed_at) {
      await supabase.auth.signOut();
      setMainMessage(t.err_confirm_email_first, "err");
      return false;
    }

    if (!profile?.terms_accepted_at) {
      setShowPrivacyBox(false);
      setShowTermsBox(true);
      setMainMessage(t.need_terms, "ok");
      return false;
    }

    if (!profile?.privacy_claim_accepted_at) {
      setPublicId(cleanPid);
      setShowTermsBox(false);
      setShowPrivacyBox(true);
      setMainMessage(t.need_privacy_claim, "ok");
      return false;
    }

    const blockCheck = await ensureCardNotBlocked(cleanPid);
    if (!blockCheck.ok) {
      setMainMessage(blockCheck.message, "err");
      return false;
    }

    try {
      const { error: claimError } = await supabase.rpc("claim_card", {
        p_public_id: cleanPid,
      });

      if (claimError) {
        setMainMessage(t.err_claim + claimError.message, "err");
        return false;
      }
    } catch {
      setMainMessage(t.err_claim_rpc, "err");
      return false;
    }

    const up = await upsertProfile({
      owner_id: user.id,
      public_id: cleanPid,
    });

    if (up.error) {
      setMainMessage(t.err_pid_save + up.error.message, "err");
      return false;
    }

    setShowClaimNotice(false);
    setClaimNoticePid(cleanPid);
    setClaimSuccessPid(cleanPid);
    setMainMessage(t.claim_ok, "ok");
    return true;
  };

  const handleForgotPassword = async () => {
    try {
      setBusy("forgot");
      setMainMessage("");

      const cleanEmail = email.trim();
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        setMainMessage(t.err_enter_email, "err");
        return;
      }

      const redirectTo = "https://vive-card.com/login";

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setMainMessage(t.err_reset + error.message, "err");
        return;
      }

      setShowTermsBox(false);
      setShowPrivacyBox(false);
      setShowResetBox(true);
      setMainMessage(t.reset_sent, "ok");
    } finally {
      setBusy(null);
    }
  };

  const handleApplyReset = async () => {
    try {
      setBusy("reset");
      setMainMessage("");

      if (!newPassword || newPassword.length < 6) {
        setMainMessage(t.err_pw_short, "err");
        return;
      }

      if (newPassword !== newPassword2) {
        setMainMessage(t.err_pw_match, "err");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMainMessage(t.err_reset_apply + error.message, "err");
        return;
      }

      setShowResetBox(false);
      setNewPassword("");
      setNewPassword2("");
      setMainMessage(t.reset_ok, "ok");
    } finally {
      setBusy(null);
    }
  };

  const handleLogin = async () => {
    try {
      setBusy("login");
      setMainMessage("");
      setShowTermsBox(false);
      setShowPrivacyBox(false);
      resetClaimState();

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        setMainMessage(t.err_enter, "err");
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        setMainMessage(t.err_enter_email, "err");
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        setMainMessage(t.err_login + loginError.message, "err");
        return;
      }

      const { user, profile, error } = await getOrCreateProfile();

      if (error || !user) {
        setMainMessage(error?.message || t.err_user_missing, "err");
        return;
      }

      const authConfirmedAt =
        (user as any)?.email_confirmed_at ||
        (user as any)?.confirmed_at ||
        null;

      if (!profile?.email_confirmed_at && authConfirmedAt) {
        const syncRes = await upsertProfile({
          owner_id: user.id,
          email: String(user.email || "").trim().toLowerCase(),
          email_confirmed_at: authConfirmedAt,
        });

        if (!syncRes.error && syncRes.data) {
          profile.email_confirmed_at = authConfirmedAt;
        }
      }

      if (!profile?.email_confirmed_at) {
        await supabase.auth.signOut();
setMainMessage(t.err_confirm_email_first, "err");
        return;
      }

      if (!profile?.terms_accepted_at) {
        setShowTermsBox(true);
        setMainMessage(t.need_terms, "ok");
        return;
      }

      const pidToUse = normalizePid(publicId);

      if (!profile?.privacy_claim_accepted_at) {
        if (pidToUse) setPublicId(pidToUse);
        setShowPrivacyBox(true);
        setMainMessage(t.need_privacy_claim, "ok");
        return;
      }

      if (pidToUse) {
        await performClaimFlow(pidToUse);
        return;
      }

      if (profile?.public_id) {
        const blockCheck = await ensureCardNotBlocked(profile.public_id);
        if (!blockCheck.ok) {
          setMainMessage(blockCheck.message, "err");
          return;
        }
      }

      setMainMessage(t.need_pid, "ok");
    } finally {
      setBusy(null);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      setBusy("terms");
      setMainMessage("");

      const { user, error: userErr } = await getCurrentUser();
      if (userErr || !user) {
        setMainMessage(t.err_relogin, "err");
        return;
      }

      const { data: profile, error } = await upsertProfile({
        owner_id: user.id,
        terms_accepted_at: new Date().toISOString(),
      });

      if (error) {
        setMainMessage(t.err_save + error.message, "err");
        return;
      }

      setShowTermsBox(false);
      setTermsCheck(false);
      setMainMessage(t.terms_ok, "ok");

      const pidToUse = normalizePid(publicId);

      if (!profile?.privacy_claim_accepted_at) {
        if (pidToUse) setPublicId(pidToUse);
        setShowPrivacyBox(true);
        setMainMessage(t.need_privacy_claim, "ok");
        return;
      }

      if (pidToUse) {
        await performClaimFlow(pidToUse);
        return;
      }

      if (profile?.public_id) {
        const blockCheck = await ensureCardNotBlocked(profile.public_id);
        if (!blockCheck.ok) {
          setMainMessage(blockCheck.message, "err");
          return;
        }
      }

      setMainMessage(t.need_pid, "ok");
    } finally {
      setBusy(null);
    }
  };

  const handleAcceptPrivacyClaim = async () => {
    try {
      setBusy("privacy");
      setMainMessage("");

      const { user, error: userErr } = await getCurrentUser();
      if (userErr || !user) {
        setMainMessage(t.err_relogin, "err");
        return;
      }

      const { data: profile, error } = await savePrivacyClaimConsent(user.id);
      if (error) {
        setMainMessage(t.err_privacy_save + error.message, "err");
        return;
      }

      setShowPrivacyBox(false);
      setPrivacyCheck(false);
      setMainMessage(t.privacy_claim_ok, "ok");

      const pidToUse = normalizePid(publicId);

      if (pidToUse) {
        await performClaimFlow(pidToUse);
        return;
      }

      if (profile?.public_id) {
        const blockCheck = await ensureCardNotBlocked(profile.public_id);
        if (!blockCheck.ok) {
          setMainMessage(blockCheck.message, "err");
          return;
        }
      }

      setMainMessage(t.need_pid, "ok");
    } finally {
      setBusy(null);
    }
  };

  const handleOpenSignup = () => {
    resetClaimState();
    setSignupEmail(email.trim());
    setSignupPassword("");
    setSignupPassword2("");
    setSignupTermsCheck(false);
    setSignupMessage("");
    setSignupOpen(true);
  };

  const handleSignup = async () => {
    try {
      setBusy("signup");
      setSignupMessage("");

      const cleanEmail = signupEmail.trim().toLowerCase();

      if (!cleanEmail) {
        setSignupMessage(t.err_enter_email, "err");
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setSignupMessage(t.err_valid_email, "err");
        return;
      }
      if (!signupPassword || signupPassword.length < 6) {
        setSignupMessage(t.err_pw_short, "err");
        return;
      }
      if (signupPassword !== signupPassword2) {
        setSignupMessage(t.err_pw_match, "err");
        return;
      }
      if (!signupTermsCheck) {
        setSignupMessage(t.err_accept_terms_first, "err");
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/signup-with-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: signupPassword,
            terms_accepted: true,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSignupMessage(data?.error || t.err_signup_failed_generic, "err");
        return;
      }

      setEmail(cleanEmail);
      setSignupOpen(false);
      setMainMessage(t.signup_ok, "ok");
    } catch (e: any) {
      setSignupMessage(e?.message || t.err_signup, "err");
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async () => {
    try {
      setBusy("claim");
      setMainMessage("");
      resetClaimState();
      await performClaimFlow(publicId);
    } finally {
      setBusy(null);
    }
  };

  const handleOpenBlockModal = () => {
    setBlockEmail(email.trim());
    setBlockPublicId(normalizePid(publicId));
    setBlockReason("");
    setBlockMessage("");
    setBlockOpen(true);
  };

  const handleSubmitBlockRequest = async () => {
    try {
      setBusy("block");
      setBlockMessage("");

      const cleanEmail = blockEmail.trim().toLowerCase();
      const cleanPid = normalizePid(blockPublicId);

      if (!cleanEmail) {
        setBlockMessage(t.err_enter_email, "err");
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setBlockMessage(t.err_valid_email, "err");
        return;
      }
      if (!cleanPid) {
        setBlockMessage(t.err_pid, "err");
        return;
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
            reason: blockReason.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBlockMessage(
          data?.error || data?.details || t.err_block_card_request
          "err"
        );
        return;
      }

      setBlockMessage(t.block_card_success, "ok");
    } catch {
      setBlockMessage(t.err_block_card_request, "err");
    } finally {
      setBusy(null);
    }
  };

  const goProfile = async () => {
    const pid = normalizePid(claimSuccessPid || publicId);

    if (!pid) {
      return;
    }

    const blockCheck = await ensureCardNotBlocked(pid);
    if (!blockCheck.ok) {
      setMainMessage(blockCheck.message, "err");
      return;
    }

    Alert.alert(
      "VIVE CARD aktiviert",
      "Deine Karte wurde aktiviert. Durch die aktive Session wechselst du nun in die App."
    );
  };

  useEffect(() => {
    const currentLang =
      (Platform.OS === "ios" ? "de" : "de") as Lang;
    setLang(currentLang);
  }, []);

  return (
    <>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>PRE-LAUNCH PRIVATE VERSION</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wrap}>
            <View style={styles.brand}>
              <View style={styles.logoFake} />
              <Text style={styles.brandTitle}>VIVE CARD</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{t.pill}</Text>

                <View style={styles.langRow}>
                  {LANG_OPTIONS.map((item) => {
                    const active = item === lang;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.langChip,
                          active && styles.langChipActive,
                        ]}
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
                </View>
              </View>

              <View style={styles.sep} />

              <FieldLabel text={t.email_label} />
              <TextInput
                style={styles.input}
                placeholder="name@domain.ch"
                placeholderTextColor="#95a0b0"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <FieldLabel text={t.pw_label} />
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#95a0b0"
                  secureTextEntry={!pwVisible}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.pwToggle}
                  onPress={() => setPwVisible((v) => !v)}
                >
                  <Text style={styles.pwToggleText}>
                    {pwVisible ? t.pw_hide : t.pw_toggle}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inlineRow}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.linkBtn}>{t.forgot_pw}</Text>
                </TouchableOpacity>

                <Text style={styles.securityHint}>{t.security_hint}</Text>
              </View>

              <Text style={styles.smallText}>{t.rescue_note}</Text>

              <View style={styles.warnBox}>
                <Text style={styles.warnBoxText}>
                  Wichtiger Hinweis: Pro PUBLIC_ID kann nur eine E-Mail-Adresse
                  bzw. ein Konto verwendet werden. Bitte registriere dich mit
                  derselben E-Mail-Adresse wie bei deiner Bestellung.
                </Text>
              </View>

              {showResetBox && (
                <View style={styles.infoBox}>
                  <Text style={styles.smallTitle}>{t.reset_title}</Text>

                  <FieldLabel text={t.new_pw_label} />
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#95a0b0"
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />

                  <FieldLabel text={t.new_pw2_label} />
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#95a0b0"
                    value={newPassword2}
                    onChangeText={setNewPassword2}
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleApplyReset}
                    disabled={busy !== null}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy === "reset" ? "..." : t.btn_reset_pw}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.smallText}>{t.reset_hint}</Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.primaryButtonFlex}
                  onPress={handleLogin}
                  disabled={busy !== null}
                >
                  <Text style={styles.primaryButtonText}>
                    {busy === "login" ? "..." : t.btn_login}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButtonFlex}
                  onPress={handleOpenSignup}
                  disabled={busy !== null}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t.btn_signup}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButtonFlex}
                  onPress={() => openUrl("https://vive-card.com/order.html")}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t.btn_order}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButtonFlex}
                  onPress={handleOpenBlockModal}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t.btn_block}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.secondaryButtonFull}
                onPress={() => openUrl("https://vive-card.com/")}
              >
                <Text style={styles.secondaryButtonText}>{t.btn_about}</Text>
              </TouchableOpacity>

              {showTermsBox && (
                <View style={styles.infoBox}>
                  <Text style={styles.smallText}>
                    Bevor du deine VIVE CARD aktivieren kannst, bestätige bitte
                    die AGB und Nutzungsvereinbarung.
                  </Text>

                  <View style={styles.checkRow}>
                    <Switch
                      value={termsCheck}
                      onValueChange={setTermsCheck}
                    />
                    <Text style={styles.checkText}>
                      {t.terms_prefix}{" "}
                      <Text
                        style={styles.inlineLink}
                        onPress={() => openUrl("https://vive-card.com/agb.html")}
                      >
                        {t.terms_agb}
                      </Text>{" "}
                      {t.terms_and}{" "}
                      <Text
                        style={styles.inlineLink}
                        onPress={() =>
                          openUrl("https://vive-card.com/nutzung.html")
                        }
                      >
                        {t.terms_usage}
                      </Text>
                      .
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !termsCheck && styles.disabledButton,
                    ]}
                    onPress={handleAcceptTerms}
                    disabled={!termsCheck || busy !== null}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy === "terms" ? "..." : t.btn_accept}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {showPrivacyBox && (
                <View style={styles.infoBox}>
                  <Text style={styles.smallTitle}>
                    Datenschutzhinweis zur Kartenaktivierung
                  </Text>

                  <View style={styles.warnBox}>
                    <Text style={styles.warnBoxText}>
                      Mit der Aktivierung deiner VIVE CARD können freiwillig
                      persönliche Informationen gespeichert werden,
                      einschliesslich möglicher Gesundheitsdaten wie z. B.
                      Allergien, Medikamente, Blutgruppe oder
                      Notfallhinweise.{"\n\n"}
                      Diese Angaben werden ausschliesslich von dir
                      bereitgestellt und verwaltet. Bitte speichere nur Daten,
                      deren Verarbeitung du ausdrücklich wünschst.
                    </Text>
                  </View>

                  <View style={styles.checkRow}>
                    <Switch
                      value={privacyCheck}
                      onValueChange={setPrivacyCheck}
                    />
                    <Text style={styles.checkText}>
                      Ich habe den Datenschutzhinweis zur Kartenaktivierung
                      gelesen und bin damit einverstanden, dass von mir
                      freiwillig eingegebene persönliche Daten – einschliesslich
                      möglicher Gesundheitsdaten – im Rahmen meiner VIVE CARD
                      gespeichert werden.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !privacyCheck && styles.disabledButton,
                    ]}
                    onPress={handleAcceptPrivacyClaim}
                    disabled={!privacyCheck || busy !== null}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy === "privacy"
                        ? "..."
                        : "Datenschutzhinweis akzeptieren"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.sep} />

              {showClaimNotice && !!claimNoticePid && (
                <View style={styles.claimNoticeBox}>
                  <Text style={styles.claimNoticeTitle}>VIVE CARD erkannt</Text>
                  <Text style={styles.claimNoticeText}>
                    Bitte logge dich ein oder erstelle ein Konto. Danach wird
                    deine VIVE CARD automatisch aktiviert.
                  </Text>
                  <View style={styles.pidBadge}>
                    <Text style={styles.pidBadgeText}>
                      PUBLIC_ID: {claimNoticePid}
                    </Text>
                  </View>
                </View>
              )}

              <FieldLabel text={t.pid_label} />
              <TextInput
                style={styles.input}
                placeholder="z.B. PVJ2AT5B6Y"
                placeholderTextColor="#95a0b0"
                autoCapitalize="characters"
                autoCorrect={false}
                value={publicId}
                onChangeText={(v) => setPublicId(normalizePid(v))}
              />
              <Text style={styles.smallText}>{t.claim_hint}</Text>

              <TouchableOpacity
                style={styles.secondaryButtonFull}
                onPress={handleClaim}
                disabled={busy !== null || claimSuccessPid.length > 0}
              >
                <Text style={styles.secondaryButtonText}>
                  {claimSuccessPid ? t.claim_already : t.btn_claim}
                </Text>
              </TouchableOpacity>

              {!!msg.text && (
                <Text
                  style={[
                    styles.message,
                    msg.type === "ok" && styles.messageOk,
                    msg.type === "err" && styles.messageErr,
                  ]}
                >
                  {msg.text}
                </Text>
              )}

              {!!claimSuccessPid && (
                <View style={styles.claimSuccessCard}>
                  <Text style={styles.claimSuccessTitle}>
                    ✅ Deine VIVE CARD wurde erfolgreich aktiviert
                  </Text>
                  <Text style={styles.claimSuccessText}>
                    Deine Karte ist jetzt mit deinem Konto verbunden. Du kannst
                    nun dein Profil und deine Notfallinformationen ausfüllen.
                    {"\n\n"}
                    Falls du weitere Karten bestellt hast, öffne einfach den
                    nächsten Aktivierungslink aus deiner E-Mail und wiederhole
                    den Vorgang.
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={goProfile}
                  >
                    <Text style={styles.primaryButtonText}>
                      Profil ausfüllen
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.hintText}>{t.hint}</Text>

              <View style={styles.sep} />

              <View style={styles.footerLinks}>
                <Text
                  style={styles.footerLink}
                  onPress={() => openUrl("https://vive-card.com/impressum.html")}
                >
                  {t.link_impressum}
                </Text>
                <Text
                  style={styles.footerLink}
                  onPress={() =>
                    openUrl("https://vive-card.com/datenschutz.html")
                  }
                >
                  {t.link_privacy}
                </Text>
                <Text
                  style={styles.footerLink}
                  onPress={() => openUrl("https://vive-card.com/agb.html")}
                >
                  {t.link_agb}
                </Text>
                <Text
                  style={styles.footerLink}
                  onPress={() => openUrl("https://vive-card.com/nutzung.html")}
                >
                  {t.link_usage}
                </Text>
              </View>

              <Text style={styles.copyright}>
                ©️ {new Date().getFullYear()} Vive-Card • Danilo Torsello (CH)
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={signupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSignupOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSignupOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Konto erstellen</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSignupOpen(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sep} />

            <FieldLabel text="E-Mail" />
            <TextInput
              style={styles.input}
              placeholder="name@domain.ch"
              placeholderTextColor="#95a0b0"
              autoCapitalize="none"
              keyboardType="email-address"
              value={signupEmail}
              onChangeText={setSignupEmail}
            />

            <FieldLabel text="Passwort" />
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mindestens 6 Zeichen"
                placeholderTextColor="#95a0b0"
                secureTextEntry={!signupPwVisible}
                value={signupPassword}
                onChangeText={setSignupPassword}
              />
              <TouchableOpacity
                style={styles.pwToggle}
                onPress={() => setSignupPwVisible((v) => !v)}
              >
                <Text style={styles.pwToggleText}>
                  {signupPwVisible ? t.pw_hide : t.pw_toggle}
                </Text>
              </TouchableOpacity>
            </View>

            <FieldLabel text="Passwort wiederholen" />
            <TextInput
              style={styles.input}
              placeholder="Passwort wiederholen"
              placeholderTextColor="#95a0b0"
              secureTextEntry={!signupPwVisible}
              value={signupPassword2}
              onChangeText={setSignupPassword2}
            />

            <View style={styles.checkRow}>
              <Switch
                value={signupTermsCheck}
                onValueChange={setSignupTermsCheck}
              />
              <Text style={styles.checkText}>
                Ich akzeptiere die{" "}
                <Text
                  style={styles.inlineLink}
                  onPress={() => openUrl("https://vive-card.com/agb.html")}
                >
                  AGB
                </Text>{" "}
                und die{" "}
                <Text
                  style={styles.inlineLink}
                  onPress={() => openUrl("https://vive-card.com/nutzung.html")}
                >
                  Nutzungsvereinbarung
                </Text>
                .
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignup}
              disabled={busy !== null}
            >
              <Text style={styles.primaryButtonText}>
                {busy === "signup" ? "..." : "Registrierung starten"}
              </Text>
            </TouchableOpacity>

            {!!signupMsg.text && (
              <Text
                style={[
                  styles.message,
                  signupMsg.type === "ok" && styles.messageOk,
                  signupMsg.type === "err" && styles.messageErr,
                ]}
              >
                {signupMsg.text}
              </Text>
            )}

            <Text style={styles.smallText}>
              Nach dem Klick erhältst du eine Bestätigungs-E-Mail. Danach kannst
              du dein Konto aktivieren und deine VIVE CARD zuordnen.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={blockOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBlockOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Karte sperren / deaktivieren
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBlockOpen(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sep} />

            <Text style={styles.smallText}>
              Wenn deine Karte verloren wurde oder deaktiviert werden soll,
              sende hier eine Sperranfrage. Bitte gib die E-Mail-Adresse und
              die PUBLIC_ID an, die mit der Karte verknüpft sind.
            </Text>

            <FieldLabel text="E-Mail" />
            <TextInput
              style={styles.input}
              placeholder="name@domain.ch"
              placeholderTextColor="#95a0b0"
              autoCapitalize="none"
              keyboardType="email-address"
              value={blockEmail}
              onChangeText={setBlockEmail}
            />

            <FieldLabel text="PUBLIC_ID" />
            <TextInput
              style={styles.input}
              placeholder="z.B. PVJ2AT5B6Y"
              placeholderTextColor="#95a0b0"
              autoCapitalize="characters"
              autoCorrect={false}
              value={blockPublicId}
              onChangeText={(v) => setBlockPublicId(normalizePid(v))}
            />

            <FieldLabel text="Grund (optional)" />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="z.B. Karte verloren, falsche Zuordnung, Konto löschen"
              placeholderTextColor="#95a0b0"
              multiline
              value={blockReason}
              onChangeText={setBlockReason}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmitBlockRequest}
              disabled={busy !== null}
            >
              <Text style={styles.primaryButtonText}>
                {busy === "block" ? "..." : "Sperranfrage senden"}
              </Text>
            </TouchableOpacity>

            {!!blockMsg.text && (
              <Text
                style={[
                  styles.message,
                  blockMsg.type === "ok" && styles.messageOk,
                  blockMsg.type === "err" && styles.messageErr,
                ]}
              >
                {blockMsg.text}
              </Text>
            )}

            <Text style={styles.smallText}>
              Die Anfrage wird an den Support weitergeleitet. Danach wird die
              Karte manuell geprüft und gesperrt bzw. deaktiviert.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0e0f12",
  },
  scrollContent: {
    paddingTop: 72,
    paddingBottom: 28,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#e10600",
    paddingTop: Platform.OS === "ios" ? 16 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },
  bannerText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  wrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  logoFake: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1d2230",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  brandTitle: {
    color: "#f3f5f7",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "rgba(22,24,29,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 22,
  },
  pill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  pillText: {
    color: "#b7bcc4",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  langChipActive: {
    backgroundColor: "#2a2d35",
    borderColor: "rgba(255,255,255,0.20)",
  },
  langChipText: {
    color: "#b7bcc4",
    fontSize: 12,
    fontWeight: "800",
  },
  langChipTextActive: {
    color: "#ffffff",
  },
  sep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 14,
  },
  label: {
    color: "#b7bcc4",
    fontSize: 12,
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.25)",
    color: "#f3f5f7",
    fontSize: 16,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  passwordWrap: {
    position: "relative",
    marginBottom: 4,
  },
  passwordInput: {
    paddingRight: 110,
    marginBottom: 0,
  },
  pwToggle: {
    position: "absolute",
    right: 10,
    top: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  pwToggleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
  },
  linkBtn: {
    color: "#ffffff",
    textDecorationLine: "underline",
    fontSize: 12,
    fontWeight: "800",
  },
  securityHint: {
    color: "#b7bcc4",
    fontSize: 12,
    flex: 1,
    minWidth: 180,
  },
  smallText: {
    color: "#b7bcc4",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  smallTitle: {
    color: "#f3f5f7",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  warnBox: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  warnBoxText: {
    color: "#b7bcc4",
    fontSize: 12,
    lineHeight: 18,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  checkRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 10,
  },
  checkText: {
    flex: 1,
    color: "#f3f5f7",
    fontSize: 13,
    lineHeight: 18,
  },
  inlineLink: {
    color: "#ffffff",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#e10600",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonFlex: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#e10600",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButtonFlex: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#2a2d35",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  secondaryButtonFull: {
    width: "100%",
    backgroundColor: "#2a2d35",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  claimNoticeBox: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(225,6,0,0.08)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  claimNoticeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  claimNoticeText: {
    color: "#b7bcc4",
    lineHeight: 21,
    marginBottom: 10,
  },
  pidBadge: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pidBadgeText: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  message: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
  },
  messageOk: {
    color: "#24c26a",
  },
  messageErr: {
    color: "#ff6b6b",
  },
  claimSuccessCard: {
    borderWidth: 1,
    borderColor: "rgba(36,194,106,0.35)",
    backgroundColor: "rgba(36,194,106,0.10)",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  claimSuccessTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  claimSuccessText: {
    color: "#b7bcc4",
    lineHeight: 21,
    marginBottom: 12,
  },
  hintText: {
    color: "#b7bcc4",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  footerLinks: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  footerLink: {
    color: "#ffffff",
    textDecorationLine: "underline",
    fontSize: 12,
  },
  copyright: {
    color: "#b7bcc4",
    fontSize: 12,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    padding: 20,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "rgba(22,24,29,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseBtn: {
    backgroundColor: "#2a2d35",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseBtnText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
