import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type UseCardRealtimeParams = {
  cardId?: string | null;
  ownerUserId?: string | null;
  enabled?: boolean;
  onChange: () => void | Promise<void>;
};

function buildUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCardRealtime({
  cardId,
  ownerUserId,
  enabled = true,
  onChange,
}: UseCardRealtimeParams) {
  const instanceIdRef = useRef(buildUniqueId());

  useEffect(() => {
    if (!enabled) return;
    if (!ownerUserId) return;

    let disposed = false;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (disposed) return;

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      timeoutRef = setTimeout(() => {
        Promise.resolve(onChange()).catch(() => {});
      }, 250);
    };

    const instanceId = instanceIdRef.current;

    const cardsChannel = supabase.channel(
      `cards-${ownerUserId}-${instanceId}`
    );

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

    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    if (cardId) {
      profileChannel = supabase.channel(
        `profiles-${cardId}-${instanceId}`
      );

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
    }

    return () => {
      disposed = true;

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      try {
        supabase.removeChannel(cardsChannel);
      } catch {}

      if (profileChannel) {
        try {
          supabase.removeChannel(profileChannel);
        } catch {}
      }
    };
  }, [cardId, ownerUserId, enabled, onChange]);
}
