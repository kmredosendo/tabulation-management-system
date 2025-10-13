"use client";
import { getApiUrl } from "@/lib/api";

import React, { useEffect, useState } from "react";
import { PrintHeader } from "@/components/print-header";
import { FinalRankTable } from "@/components/FinalRankTable";

export default function PrintFinalRankPage() {
  const [data, setData] = useState<{event: unknown, judges: {id: number, name: string, number: number}[], contestants: unknown[]} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/raw-scores"))
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data || !data.contestants || data.contestants.length === 0) {
    return <div className="p-8 text-center">No scores found.</div>;
  }

  const judges = (data.judges || []).map((j) => ({ id: j.id, name: j.name, number: Number(j.number) }))
    .sort((a, b) => a.number - b.number);

  // Type guard for event
  function isEventType(event: unknown): event is { name: string; date: string; institutionName?: string; institutionAddress?: string; venue?: string } {
    if (typeof event !== 'object' || event === null) return false;
    const e = event as { name?: unknown; date?: unknown };
    return typeof e.name === 'string' && typeof e.date === 'string';
  }

  return (
    <div className="min-h-screen p-8 print:bg-white print:text-black flex flex-col items-center">
      <PrintHeader event={isEventType(data.event) ? data.event : null} />
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Final Rank</h1>
        <FinalRankTable />
        {/* Judges Footer: 3 per row */}
        <div className="w-full mt-16 print:mt-12 flex flex-col items-center">
          {Array.from({ length: Math.ceil(judges.length / 3) }).map((_, rowIdx: number) => (
            <div key={rowIdx} className="flex flex-row justify-center gap-12 mb-8 w-full">
              {judges.slice(rowIdx * 3, rowIdx * 3 + 3).map((judge, idx) => (
                <div key={judge.id} className="flex flex-col items-center w-72">
                  <div className="w-full border-t border-black mb-1" style={{ minWidth: 200 }} />
                  <div className="w-full text-center font-medium text-sm">{judge.name}</div>
                  <div className="w-full text-center text-xs text-muted-foreground mt-0.5">Judge {rowIdx * 3 + idx + 1}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}