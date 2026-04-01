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

    let timeoutRef: any = null;

    const trigger = () => {
      if (timeoutRef) clearTimeout(timeoutRef);

      timeoutRef = setTimeout(() => {
        Promise.resolve(onChange()).catch(() => {});
      }, 200);
    };

    const channels: any[] = [];

    // ✅ Cards Channel
    const cardsChannel = supabase.channel(`cards-${ownerUserId}`);

    cardsChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cards",
        filter: `owner_user_id=eq.${ownerUserId}`,
      },
      trigger
    );

    cardsChannel.subscribe();
    channels.push(cardsChannel);

    // ✅ Profile Channel
    if (cardId) {
      const profileChannel = supabase.channel(`profiles-${cardId}`);

      profileChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_profiles",
          filter: `card_id=eq.${cardId}`,
        },
        trigger
      );

      profileChannel.subscribe();
      channels.push(profileChannel);
    }

    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);

      channels.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch {}
      });
    };
  }, [cardId, ownerUserId, enabled, onChange]);
}
