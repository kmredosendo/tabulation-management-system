"use client"


import React, { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
interface RawScore {
  contestantId: number;
  contestantName: string;
  judgeId: number;
  judgeNumber: number;
  judgeName: string;
  criteriaId: number;
  criteriaName: string;
  criteriaIdentifier?: string;
  value: number;
}

interface Criteria {
  id: number;
  name: string;
  identifier?: string;
  weight?: number;
  parentId?: number | null;
  phase?: string;
}

interface Contestant {
  id: number;
  number: number;
  name: string;
  sex?: string;
}

interface Event {
  id: number;
  name: string;
  separateGenders?: boolean;
  hasTwoPhases?: boolean;
  currentPhase?: string;
  finalistsCount?: number;
}

export function RawScoresTable({ judgeId, eventId, tableClassName, phase }: { judgeId: number; eventId?: number; tableClassName?: string; phase?: string }) {
  const [raw, setRaw] = useState<RawScore[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  // Destructure eventId from props to avoid ReferenceError
  useEffect(() => {
    setLoading(true);
    let apiUrl = getApiUrl("/api/raw-scores");
    let eid = undefined;
    if (typeof eventId !== "undefined") {
      eid = eventId;
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEventId = urlParams.get("eventId");
      if (urlEventId) eid = Number(urlEventId);
    }
    if (eid) {
      apiUrl += `?eventId=${eid}`;
      if (phase) {
        apiUrl += `&phase=${phase}`;
      }
    }
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        setRaw(data.scores.filter((s: RawScore) => s.judgeId === judgeId));
        setCriteria(data.criteria);
        setContestants(data.contestants);
        setEvent(data.event);
        setLoading(false);
      });
  }, [judgeId, eventId, phase]);
  if (loading) return <div className="text-center py-8">Loading raw scores...</div>;
  const mainGroups = criteria
    .filter((c) => !c.parentId)
    .sort((a, b) => a.id - b.id)
    .map((main) => ({
      ...main,
      subCriterias: criteria
        .filter((sub) => sub.parentId === main.id)
        .sort((a, b) => a.id - b.id),
    }));
  const scoreMap: Record<string, number> = {};
  raw.forEach((s) => {
    scoreMap[`${s.contestantId}_${s.criteriaId}`] = s.value;
  });
  
  // Filter contestants based on phase
  // For FINAL phase with two phases, only show contestants who have scores (finalists)
  let eligibleContestants = contestants;
  if (event?.hasTwoPhases && phase === 'FINAL') {
    // Only include contestants who actually have final scores
    const contestantsWithScores = new Set(raw.map(s => s.contestantId));
    eligibleContestants = contestants.filter(c => contestantsWithScores.has(c.id));
  }
  
  const sortedContestants = [...eligibleContestants].sort((a, b) => a.number - b.number);
  
  // Calculate totals for eligible contestants only
  const totals = sortedContestants.map((c) => {
    let total = 0;
    mainGroups.forEach((main) => {
      main.subCriterias.forEach((sub) => {
        total += scoreMap[`${c.id}_${sub.id}`] || 0;
      });
    });
    return { id: c.id, number: c.number, name: c.name, total, sex: c.sex };
  });
  
  // Function to calculate ranks for a group of contestants
  const calculateRanks = (contestantGroup: typeof totals) => {
    const sortedByTotal = [...contestantGroup].sort((a, b) => b.total - a.total);
    const rankMap = new Map<number, number>();
    sortedByTotal.forEach((c, i) => {
      if (i > 0 && c.total === sortedByTotal[i - 1].total) {
        rankMap.set(c.id, rankMap.get(sortedByTotal[i - 1].id)!);
      } else {
        rankMap.set(c.id, i + 1);
      }
    });
    return rankMap;
  };
  
  // Calculate ranks based on gender separation setting
  let totalsWithRank: Array<{ id: number; number: number; name: string; total: number; sex?: string; rank: number }>;
  
  if (event?.separateGenders) {
    // Separate rankings by gender
    const maleContestants = totals.filter(c => c.sex === 'MALE');
    const femaleContestants = totals.filter(c => c.sex === 'FEMALE');
    const otherContestants = totals.filter(c => !c.sex || (c.sex !== 'MALE' && c.sex !== 'FEMALE'));
    
    const maleRanks = calculateRanks(maleContestants);
    const femaleRanks = calculateRanks(femaleContestants);
    const otherRanks = calculateRanks(otherContestants);
    
    totalsWithRank = totals.map((c) => ({
      ...c,
      rank: (c.sex === 'MALE' ? maleRanks.get(c.id) :
             c.sex === 'FEMALE' ? femaleRanks.get(c.id) :
             otherRanks.get(c.id)) ?? 0
    }));
  } else {
    // Unified ranking
    const rankMap = calculateRanks(totals);
    totalsWithRank = totals.map((c) => ({ ...c, rank: rankMap.get(c.id) ?? 0 }));
  }
  const subCriteriaHeaders = mainGroups
    .map((main, mainIdx) =>
      main.subCriterias.map((sub, subIdx) => (
        <th
          key={`main${main.id}-sub${sub.id}`}
          className={[
            "border-b-2 border-muted p-2 text-center font-normal",
            mainIdx === 0 && subIdx === 0 ? "border-l-2 border-muted" : "",
            mainIdx === mainGroups.length - 1 && subIdx === main.subCriterias.length - 1
              ? "border-r-2 border-muted"
              : "",
            mainIdx !== 0 && subIdx === 0 ? "border-l-2 border-muted" : "",
          ].join(" ")}
        >
          {sub.name}
          <br />
          <span className="text-xs text-muted-foreground">
            {sub.weight ? `(${sub.weight}%)` : ""}
          </span>
        </th>
      ))
    )
    .flat();
  return (
    <div className="overflow-x-auto">
      <table className={tableClassName ? tableClassName : "min-w-full border-separate text-xs"} style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="border-b-2 border-muted p-2 text-center align-bottom" rowSpan={2}>
              No.
            </th>
            {mainGroups.map((main, mainIdx) => (
              <th
                key={main.id}
                colSpan={main.subCriterias.length}
                className={[
                  "border-b-2 border-muted p-2 text-center align-bottom",
                  mainIdx === 0 ? "border-l-2 border-muted" : "",
                  mainIdx === mainGroups.length - 1 ? "border-r-2 border-muted" : "",
                  mainIdx !== 0 ? "border-l-2 border-muted" : "",
                ].join(" ")}
              >
                <div className="font-semibold">{main.name}</div>
                <div className="text-xs text-muted-foreground">
                  {main.weight ? `(${main.weight}%)` : ""}
                </div>
              </th>
            ))}
            <th className="border-b-2 border-l-2 border-muted p-2 text-center align-bottom" rowSpan={2}>
              Total Score
            </th>
            <th className="border-b-2 border-muted p-2 text-center align-bottom" rowSpan={2}>
              Rank
            </th>
          </tr>
          <tr>
            {subCriteriaHeaders}
          </tr>
        </thead>
        <tbody>
          {(() => {
            if (!event?.separateGenders) {
              // No gender separation - render all contestants
              return totalsWithRank.map((contestant) => (
                <tr key={contestant.id}>
                  <td className="border-b-2 border-muted p-1 font-mono whitespace-nowrap text-xs text-center">
                    #{contestant.number}
                  </td>
                  {mainGroups.flatMap((main) =>
                    main.subCriterias.map((sub, subIdx) => (
                      <td
                        key={sub.id}
                        className={[
                          "border-b-2 border-muted p-1 text-center",
                          subIdx === 0 && "border-l-2 border-muted",
                          subIdx === main.subCriterias.length - 1 && "border-r-2 border-muted"
                        ].filter(Boolean).join(" ")}
                      >
                        {scoreMap[`${contestant.id}_${sub.id}`] ?? ""}
                      </td>
                    ))
                  )}
                  <td className="border-b-2 border-l-2 border-muted p-1 text-center font-bold text-xs">
                    {contestant.total.toFixed(2)}
                  </td>
                  <td className="border-b-2 border-muted p-1 text-center font-bold text-xs">
                    {contestant.rank}
                  </td>
                </tr>
              ));
            }
            
            // Gender separation enabled - group contestants by gender
            const maleContestants = totalsWithRank.filter(c => c.sex === 'MALE');
            const femaleContestants = totalsWithRank.filter(c => c.sex === 'FEMALE');
            const otherContestants = totalsWithRank.filter(c => !c.sex || (c.sex !== 'MALE' && c.sex !== 'FEMALE'));
            
            const renderGenderGroup = (contestants: typeof totalsWithRank, label: string) => {
              if (contestants.length === 0) return null;
              
              return [
                // Gender header row
                <tr key={`header-${label}`} className="bg-muted/50">
                  <td
                    colSpan={1 + mainGroups.reduce((sum, main) => sum + main.subCriterias.length, 0) + 2}
                    className="border-b-2 border-muted p-2 text-center font-bold text-sm"
                  >
                    {label}
                  </td>
                </tr>,
                // Contestant rows
                ...contestants.map((contestant) => (
                  <tr key={contestant.id}>
                    <td className="border-b-2 border-muted p-1 font-mono whitespace-nowrap text-xs text-center">
                      #{contestant.number}
                    </td>
                    {mainGroups.flatMap((main) =>
                      main.subCriterias.map((sub, subIdx) => (
                        <td
                          key={sub.id}
                          className={[
                            "border-b-2 border-muted p-1 text-center",
                            subIdx === 0 && "border-l-2 border-muted",
                            subIdx === main.subCriterias.length - 1 && "border-r-2 border-muted"
                          ].filter(Boolean).join(" ")}
                        >
                          {scoreMap[`${contestant.id}_${sub.id}`] ?? ""}
                        </td>
                      ))
                    )}
                    <td className="border-b-2 border-l-2 border-muted p-1 text-center font-bold text-xs">
                      {contestant.total.toFixed(2)}
                    </td>
                    <td className="border-b-2 border-muted p-1 text-center font-bold text-xs">
                      {contestant.rank}
                    </td>
                  </tr>
                ))
              ];
            };
            
            return [
              ...(renderGenderGroup(maleContestants, 'Male Contestants') || []),
              ...(renderGenderGroup(femaleContestants, 'Female Contestants') || []),
              ...(renderGenderGroup(otherContestants, 'Other Contestants') || [])
            ];
          })()}
        </tbody>
      </table>
    </div>
  );
}