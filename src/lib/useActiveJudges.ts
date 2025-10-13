import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

export function useActiveJudges(pollInterval = 5000) {
  const [activeJudges, setActiveJudges] = useState<number[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
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
      if (!cancelled) {
        timer = setTimeout(fetchActive, pollInterval);
      }
    };
    fetchActive();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollInterval]);

  return activeJudges;
}