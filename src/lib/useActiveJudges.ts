import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { io, Socket } from "socket.io-client";

export function useActiveJudges(pollInterval = 5000, realTime = true) {
  const [activeJudges, setActiveJudges] = useState<number[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let socket: Socket | null = null;
    let cancelled = false;

    const fetchActive = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(getApiUrl("/api/active-judges"));
        const data = await res.json();
        setActiveJudges(data.activeJudges || []);
      } catch {
        setActiveJudges([]);
      }
      if (!cancelled && !realTime) {
        timer = setTimeout(fetchActive, pollInterval);
      }
    };

    // Initial fetch
    fetchActive();

    if (realTime) {
      // Setup WebSocket connection for real-time updates
      const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
      socket = io({
        path: "/tabulation/ws",
        transports: ["polling"],  // Use polling only to avoid WebSocket 400 errors
        secure: isProduction,
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        upgrade: false           // Disable WebSocket upgrades entirely
      });

      socket.on("connect", () => {
        console.log("Admin socket connected for judge status updates");
      });

      socket.on("judges-status", (judgeIds: number[]) => {
        console.log("Admin: Received real-time judge status update:", judgeIds);
        setActiveJudges(judgeIds);
      });

      socket.on("connect_error", (error) => {
        console.error("Admin socket connection error:", error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Admin socket disconnected:", reason);
        // Fall back to polling if socket disconnects
        if (!cancelled) {
          fetchActive();
        }
      });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [pollInterval, realTime]);

  return activeJudges;
}