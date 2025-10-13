"use client";
import { getApiUrl } from "@/lib/api";
import React, { useEffect, useState } from "react";
import { RankPerJudgeTable } from "@/components/RankPerJudgeTable";
import { PrintHeader } from "@/components/print-header";

export default function PrintRankPerJudgePage() {
  const [event, setEvent] = useState<{ id: number, name: string } | null>(null);
  const [judges, setJudges] = useState<{ id: number, name: string, number: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/raw-scores"))
      .then((res) => res.json())
      .then((data) => {
        setEvent(data.event || null);
        setJudges(data.judges || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  function isEventType(event: unknown): event is { name: string; date: string; institutionName?: string; institutionAddress?: string; venue?: string } {
    if (typeof event !== 'object' || event === null) return false;
    const e = event as { name?: unknown; date?: unknown };
    return typeof e.name === 'string' && typeof e.date === 'string';
  }

  return (
    <div className="min-h-screen p-8 print:bg-white print:text-black flex flex-col items-center">
      <PrintHeader event={isEventType(event) ? event : null} />
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Rank per Judge</h1>
        <RankPerJudgeTable />
        {/* Judges Footer: 3 per row */}
        <div className="w-full mt-16 print:mt-12 flex flex-col items-center">
          {Array.from({ length: Math.ceil(judges.length / 3) }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex flex-row justify-center gap-12 mb-8 w-full">
              {judges.slice(rowIdx * 3, rowIdx * 3 + 3).map((judge) => (
                <div key={judge.id} className="flex flex-col items-center w-72">
                  <div className="w-full border-t border-black mb-1" style={{ minWidth: 200 }} />
                  <div className="w-full text-center font-medium text-sm">{judge.name}</div>
                  <div className="w-full text-center text-xs text-muted-foreground mt-0.5">Judge {judge.number}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}