import React from "react";
import { CategoryRankTable } from "@/components/CategoryRankTable";
import { PrintHeader } from "@/components/print-header";
import { getApiUrl } from "@/lib/api";

interface Props {
  params: Promise<{ identifier: string }>;
}

async function getCategoryScores(identifier: string) {
  const res = await fetch(getApiUrl(`/api/category-scores?category=${encodeURIComponent(identifier)}`), { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function PrintCategoryResultsPage({ params }: Props) {
  const { identifier } = await params;
  const data = await getCategoryScores(identifier);
  if (!data || !data.contestants || data.contestants.length === 0) {
    return <div className="p-8 text-center">No scores found.</div>;
  }
  // Collect all unique judges from the contestants' scores
  const judgeMap = new Map();
  data.contestants.forEach((c: { scores: { judgeId: number, judgeName: string }[] }) => {
    c.scores.forEach((s) => {
      if (!judgeMap.has(s.judgeId)) {
        judgeMap.set(s.judgeId, s.judgeName);
      }
    });
  });
  const judges = Array.from(judgeMap.entries()).map(([id, name]) => ({ id, name }));

  return (
    <div className="min-h-screen p-8 print:bg-white print:text-black flex flex-col items-center">
      <PrintHeader event={data.event || null} />
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-center">{data.criteria?.name || identifier}</h1>
        <CategoryRankTable contestants={data.contestants} />
        {/* Judges Footer: 3 per row */}
        <div className="w-full mt-16 print:mt-12 flex flex-col items-center">
          {Array.from({ length: Math.ceil(judges.length / 3) }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex flex-row justify-center gap-12 mb-8 w-full">
              {judges.slice(rowIdx * 3, rowIdx * 3 + 3).map((judge) => (
                <div key={judge.id} className="flex flex-col items-center w-72">
                  <div className="w-full border-t border-black mb-1" style={{ minWidth: 200 }} />
                  <span className="font-medium text-lg mt-2">{judge.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}