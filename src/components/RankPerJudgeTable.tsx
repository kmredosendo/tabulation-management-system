import React, { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

interface RawScore {
  contestantId: number;
  contestantName: string;
  judgeId: number;
  judgeNumber: number;
  judgeName: string;
  criteriaId: number;
  value: number;
}

interface Judge {
  id: number;
  name: string;
  number: number;
}

interface Contestant {
  id: number;
  name: string;
  number?: number;
  sex?: string;
}

interface RankPerJudgeTableProps {
  eventId?: number;
  phase?: string;
  eventSettings?: {
    separateGenders: boolean;
    finalistsCount: number;
    currentPhase: string;
    hasTwoPhases: boolean;
    tieBreakingStrategy?: string;
  } | null;
}

export const RankPerJudgeTable: React.FC<RankPerJudgeTableProps> = ({ eventId, phase = "PRELIMINARY", eventSettings }) => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<RawScore[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [criteria, setCriteria] = useState<{ id: number; parentId?: number | null }[]>([]);

  // Helper function to render ordinal rank
  const getOrdinalRank = (rank: number): string => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  };

  useEffect(() => {
    const url = eventId ? `/api/raw-scores?eventId=${eventId}&phase=${phase}` : `/api/raw-scores?phase=${phase}`;
    fetch(getApiUrl(url))
      .then((res) => res.json())
      .then((data) => {
        setScores(data.scores);
        setJudges(
          data.judges
            .map((j: { id: number, name: string, number: number }) => ({ id: j.id, name: j.name, number: Number(j.number) }))
            .sort((a: Judge, b: Judge) => a.number - b.number)
        );
        setContestants(
          data.contestants
            .map((c: { id: number, name: string, number: number, sex?: string }) => ({ id: c.id, name: c.name, number: c.number, sex: c.sex }))
        );
        setCriteria(data.criteria);
        setLoading(false);
      });
  }, [eventId, phase]);

  if (loading) return <div className="py-8 text-center">Loading...</div>;

  // Function to calculate rankings for a group of contestants
  const calculateRankings = (contestantGroup: Contestant[], scoreGroup: RawScore[], judgeGroup: Judge[], criteriaGroup: { id: number; parentId?: number | null }[]) => {
    // Only use sub-criteria (criteria with parentId)
    const subCriteriaIds = criteriaGroup.filter((c) => c.parentId).map((c) => c.id);

    // For each judge and contestant, sum all sub-criteria scores
    const judgeScores: Record<number, { contestantId: number; value: number }[]> = {};
    judgeGroup.forEach((judge) => {
      judgeScores[judge.id] = contestantGroup.map((c) => {
        const total = scoreGroup
          .filter((s) => s.judgeId === judge.id && s.contestantId === c.id && subCriteriaIds.includes(s.criteriaId))
          .reduce((sum, s) => sum + s.value, 0);
        return { contestantId: c.id, value: total };
      });
    });

    // For each judge, compute ranks (dense ranking)
    const judgeRanks: Record<number, Record<number, number>> = {};
    judgeGroup.forEach((judge) => {
      const arr = [...judgeScores[judge.id]];
      arr.sort((a, b) => b.value - a.value);
      let rank = 1;
      for (let i = 0; i < arr.length; ) {
        const tieValue = arr[i].value;
        let tieEnd = i;
        while (tieEnd + 1 < arr.length && arr[tieEnd + 1].value === tieValue) {
          tieEnd++;
        }
        for (let j = i; j <= tieEnd; j++) {
          if (!judgeRanks[judge.id]) judgeRanks[judge.id] = {};
          judgeRanks[judge.id][arr[j].contestantId] = rank;
        }
        rank += (tieEnd - i + 1);
        i = tieEnd + 1;
      }
    });

    return judgeRanks;
  };

  // Function to get eligible contestants for the current phase
  const getEligibleContestants = (allContestants: Contestant[], targetPhase: string) => {
    // If contest has only one phase, all contestants are eligible
    if (!eventSettings?.hasTwoPhases) {
      return allContestants;
    }

    if (targetPhase === "PRELIMINARY") {
      return allContestants;
    }

    // For FINAL phase, only include contestants who actually have final scores
    // This follows the "back to zero" scoring principle where only finalists are scored in final phase
    const contestantsWithFinalScores = new Set(scores.map(s => s.contestantId));
    return allContestants.filter(c => contestantsWithFinalScores.has(c.id));
  };

  // Get eligible contestants for this phase
  const eligibleContestants = getEligibleContestants(contestants, phase);
  const eligibleContestantIds = new Set(eligibleContestants.map(c => c.id));
  
  // Filter scores to only include eligible contestants
  const filteredScores = scores.filter(s => eligibleContestantIds.has(s.contestantId));

  // For each contestant, sum their ranks across all judges
  let contestantRows;
  let maleContestantRows;
  let femaleContestantRows;
  
  if (eventSettings?.separateGenders) {
    // Separate by gender - calculate ranks within each gender group
    const maleContestants = eligibleContestants.filter(c => c.sex === "MALE");
    const femaleContestants = eligibleContestants.filter(c => c.sex === "FEMALE");
    
    const maleScores = filteredScores.filter(s => maleContestants.some(mc => mc.id === s.contestantId));
    const femaleScores = filteredScores.filter(s => femaleContestants.some(fc => fc.id === s.contestantId));
    
    // Calculate rankings separately for each gender
    const maleRankings = calculateRankings(maleContestants, maleScores, judges, criteria);
    const femaleRankings = calculateRankings(femaleContestants, femaleScores, judges, criteria);
    
    maleContestantRows = maleContestants.map((c) => {
      const ranks = judges.map((j) => maleRankings[j.id]?.[c.id] ?? "");
      const totalRank = ranks.reduce((sum, r) => sum + (typeof r === "number" ? r : 0), 0);
      return {
        id: c.id,
        name: c.name,
        number: c.number ?? 0,
        ranks,
        totalRank,
      };
    });
    
    femaleContestantRows = femaleContestants.map((c) => {
      const ranks = judges.map((j) => femaleRankings[j.id]?.[c.id] ?? "");
      const totalRank = ranks.reduce((sum, r) => sum + (typeof r === "number" ? r : 0), 0);
      return {
        id: c.id,
        name: c.name,
        number: c.number ?? 0,
        ranks,
        totalRank,
      };
    });
    
    contestantRows = null;
  } else {
    // Unified - calculate ranks for all contestants together
    const rankings = calculateRankings(eligibleContestants, filteredScores, judges, criteria);
    
    contestantRows = eligibleContestants.map((c) => {
      const ranks = judges.map((j) => rankings[j.id]?.[c.id] ?? "");
      const totalRank = ranks.reduce((sum, r) => sum + (typeof r === "number" ? r : 0), 0);
      return {
        id: c.id,
        name: c.name,
        number: c.number ?? 0,
        ranks,
        totalRank,
      };
    });
    maleContestantRows = null;
    femaleContestantRows = null;
  }

  // Helper function to render a ranking table
  const renderRankingTable = (rows: typeof contestantRows, title?: string) => {
    if (!rows) return null;
    
    // Sort by total rank ascending (by rank, not contestant number)
    rows.sort((a, b) => a.totalRank - b.totalRank);

    // Calculate final rank for ALL contestants (handle ties)
    const sortedByRank = [...rows].sort((a, b) => a.totalRank - b.totalRank);
    const finalRankMap: Record<number, number> = {};
    let prevTotal = null;
    let prevRank = 1;
    for (let i = 0; i < sortedByRank.length; i++) {
      if (prevTotal !== null && sortedByRank[i].totalRank === prevTotal) {
        finalRankMap[sortedByRank[i].id] = prevRank;
      } else {
        finalRankMap[sortedByRank[i].id] = i + 1;
        prevRank = i + 1;
      }
      prevTotal = sortedByRank[i].totalRank;
    }

    // Find the 1st, 2nd, and 3rd place for highlighting
    const sortedRanks = Array.from(new Set(rows.map((row) => row.totalRank))).sort((a, b) => a - b);
    const first = sortedRanks[0];
    const second = sortedRanks[1];
    const third = sortedRanks[2];

    return (
      <div className="mb-6">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">No.</th>
                <th className="border px-2 py-1">Name</th>
                {judges.map((judge) => (
                  <th key={judge.id} className="border px-2 py-1 text-center">
                    Judge {judge.number}
                  </th>
                ))}
                <th className="border px-2 py-1">Total Rank</th>
                <th className="border px-2 py-1">Final Rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                let rowClass = "";
                if (row.totalRank === first) {
                  rowClass = "bg-yellow-100 font-bold";
                } else if (row.totalRank === second) {
                  rowClass = "bg-gray-200 font-semibold";
                } else if (row.totalRank === third) {
                  rowClass = "bg-orange-100 font-semibold";
                }
                const finalRank = finalRankMap[row.id];
                return (
                  <tr key={row.id} className={rowClass}>
                    <td className="border px-2 py-1 text-center">{row.number || idx + 1}</td>
                    <td className="border px-2 py-1">{row.name}</td>
                    {row.ranks.map((r, i) => (
                      <td className="border px-2 py-1 text-center" key={i}>{typeof r === "number" ? r : ""}</td>
                    ))}
                    <td className="border px-2 py-1 text-center font-bold">{row.totalRank}</td>
                    <td className="border px-2 py-1 text-center font-bold">{getOrdinalRank(finalRank)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {eventSettings?.separateGenders ? (
        <>
          {renderRankingTable(maleContestantRows, "Male Contestants")}
          {renderRankingTable(femaleContestantRows, "Female Contestants")}
        </>
      ) : (
        renderRankingTable(contestantRows)
      )}
    </div>
  );
};