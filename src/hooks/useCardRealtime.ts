import { useEffect } from "react";
import { supabase } from "../lib/supabase";

type UseCardRealtimeParams = {
  cardId?: string | null;
  ownerUserId?: string | null;
  enabled?: boolean;
  onChange: () => void | Promise<void>;
};

export function useCardRealtime({
  cardId,
  ownerUserId,
  enabled = true,
  onChange,
}: UseCardRealtimeParams) {
  useEffect(() => {
    if (!enabled) return;
    if (!ownerUserId) return;

    let active = true;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (!active) return;

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      timeoutRef = setTimeout(() => {
        Promise.resolve(onChange()).catch(() => {});
      }, 250);
    };

    const channels: any[] = [];

    const cardsChannel = supabase
      .channel(`app-cards-${ownerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `owner_user_id=eq.${ownerUserId}`,
        },
        () => trigger()
      )
      .subscribe();

    channels.push(cardsChannel);

    if (cardId) {
      const profilesChannel = supabase
        .channel(`app-card-profiles-${cardId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "card_profiles",
            filter: `card_id=eq.${cardId}`,
          },
          () => trigger()
        )
        .subscribe();

      channels.push(profilesChannel);
    }

    return () => {
      active = false;

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      channels.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      });
    };
  }, [cardId, ownerUserId, enabled, onChange]);
}
