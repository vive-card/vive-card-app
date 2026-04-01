export type ProfileRow = {
  owner_id: string;
  public_id?: string | null;
  email?: string | null;
  terms_accepted_at?: string | null;
  privacy_claim_accepted_at?: string | null;
  email_confirmed_at?: string | null;
};

export type GetCurrentUserResult = {
  user: any | null;
  error: Error | null;
};

export type CardBlockedCheckResult = {
  ok: boolean;
  reason?: "error" | "blocked";
  message?: string;
  card?: {
    id: string;
    public_id: string;
    status?: string | null;
    blocked_at?: string | null;
  } | null;
};
