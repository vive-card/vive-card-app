export type MessageType = "" | "ok" | "err";

export function isValidEmail(email: string): boolean;
export function normalizePid(value: string | null | undefined): string;

export async function forgotPassword(email: string): Promise<void>;
export async function applyPasswordReset(newPassword: string, repeatPassword: string): Promise<void>;

export async function loginWithEmail(params: {
  email: string;
  password: string;
  publicId?: string;
}): Promise<{
  requiresTerms: boolean;
  requiresPrivacyClaim: boolean;
  requiresPid: boolean;
  claimSuccessPid: string | null;
  message: string;
}>;

export async function acceptTerms(params: {
  publicId?: string;
}): Promise<{
  requiresPrivacyClaim: boolean;
  requiresPid: boolean;
  claimSuccessPid: string | null;
  message: string;
}>;

export async function acceptPrivacyClaim(params: {
  publicId?: string;
}): Promise<{
  requiresPid: boolean;
  claimSuccessPid: string | null;
  message: string;
}>;

export async function claimCard(publicId: string): Promise<{
  claimSuccessPid: string;
  message: string;
}>;

export async function signupWithEmail(params: {
  email: string;
  password: string;
  repeatPassword: string;
  termsAccepted: boolean;
}): Promise<{
  message: string;
}>;

export async function submitBlockRequest(params: {
  email: string;
  publicId: string;
  reason?: string;
}): Promise<{
  message: string;
}>;

export async function ensureCardNotBlocked(publicId: string): Promise<void>;