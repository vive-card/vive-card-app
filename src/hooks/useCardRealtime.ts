import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type UseCardRealtimeParams = {
  publicId?: string | null;
  ownerUserId?: string | null;
  enabled?: boolean;
  onChange: () => void | Promise<void>;
};

function buildUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCardRealtime({
  publicId,
  ownerUserId,
  enabled = true,
  onChange,
}: UseCardRealtimeParams) {
  const instanceIdRef = useRef(buildUniqueId());

  useEffect(() => {
    if (!enabled) return;
    if (!ownerUserId && !publicId) return;

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
    const channels: any[] = [];

    if (ownerUserId) {
      const cardsChannel = supabase.channel(
        `cards-owner-${ownerUserId}-${instanceId}`
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
      channels.push(cardsChannel);
    }

    if (publicId) {
      const cleanPublicId = String(publicId).trim().toUpperCase();

      const emergencyCardsChannel = supabase.channel(
        `emergency-cards-${cleanPublicId}-${instanceId}`
      );

      emergencyCardsChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_cards",
          filter: public_id=eq.${cleanPublicId},
        },
        trigger
      );

      emergencyCardsChannel.subscribe();
      channels.push(emergencyCardsChannel);

      const cardsByPidChannel = supabase.channel(
        `cards-pid-${cleanPublicId}-${instanceId}`
      );

      cardsByPidChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: public_id=eq.${cleanPublicId},
        },
        trigger
      );

      cardsByPidChannel.subscribe();
      channels.push(cardsByPidChannel);
    }

    return () => {
      disposed = true;

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      channels.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      });
    };
  }, [publicId, ownerUserId, enabled, onChange]);
}
