import {
  CurrentUserCardProfileResult,
  EmergencyCardData,
  EmergencyCardRow,
  ProfileFormValues,
} from "../types/card";
import { normalizeDate, normalizePid } from "./normalize";

export function mapEmergencyDataToForm(
  profile?: EmergencyCardRow | null
): ProfileFormValues {
  const d = profile?.data || {};

  return {
    name: d.name || "",
    dob: normalizeDate(d.dob || ""),
    blood: d.blood || "",
    allergies: d.allergies || "",
    bloodThinner: d.bloodThinner || "",
    meds: d.meds || "",
    vaccines: d.vaccines || "",
    chronic: d.chronic || "",
    organ: d.organ || "",
    notes: d.notes || "",
    em1_name: d.em1_name || "",
    em1: d.em1 || "",
    em2_name: d.em2_name || "",
    em2: d.em2 || "",
  };
}

export function mapFormToEmergencyData(
  values: ProfileFormValues
): EmergencyCardData {
  return {
    name: values.name.trim(),
    dob: values.dob.trim() || "",
    blood: values.blood.trim(),
    allergies: values.allergies.trim(),
    bloodThinner: values.bloodThinner.trim(),
    meds: values.meds.trim(),
    vaccines: values.vaccines.trim(),
    chronic: values.chronic.trim(),
    organ: values.organ.trim(),
    notes: values.notes.trim(),
    em1_name: values.em1_name.trim(),
    em1: values.em1.trim(),
    em2_name: values.em2_name.trim(),
    em2: values.em2.trim(),
  };
}

export function buildCardUrl(pid: string) {
  const cleanPid = normalizePid(pid);
  const returnPath = `/card?pid=${encodeURIComponent(cleanPid)}&edit=1`;

  return `/p/${encodeURIComponent(
    cleanPid
  )}?emergency=1&return=${encodeURIComponent(returnPath)}`;
}

export function fullCardUrl(pid: string) {
  return `https://vive-card.com${buildCardUrl(pid)}`;
}

export function hasCardProfile(
  result: CurrentUserCardProfileResult | null | undefined
) {
  return !!result?.card?.public_id;
}
