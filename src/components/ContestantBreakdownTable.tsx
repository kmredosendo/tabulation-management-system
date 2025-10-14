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

interface Contestant {
  id: number;
  name: string;
  number?: number;
  sex?: string;
}

interface Criteria {
  id: number;
  name: string;
  parentId?: number | null;
  identifier?: string;
}

interface ContestantBreakdownTableProps {
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

export const ContestantBreakdownTable: React.FC<ContestantBreakdownTableProps> = ({ eventId, phase = "PRELIMINARY", eventSettings }) => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<RawScore[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);

  useEffect(() => {
    fetch(getApiUrl(`/api/raw-scores?eventId=${eventId}&phase=${phase}`))
      .then((res) => res.json())
      .then((data) => {
        setScores(data.scores);
        setContestants(
          data.contestants
            .map((c: { id: number, name: string, number: number, sex?: string }) => ({ id: c.id, name: c.name, number: c.number, sex: c.sex }))
        );
        setCriteria(data.criteria);
        setLoading(false);
      });
  }, [eventId, phase]);

  if (loading) return <div className="py-8 text-center">Loading...</div>;

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

  // Get all main criteria (parent categories)
  const mainCriteria = criteria.filter((c) => !c.parentId);
  const subCriteria = criteria.filter((c) => c.parentId);

  // Helper function to create contestant data
  const createContestantData = (contestantList: typeof contestants) => {
    return contestantList.map((contestant) => {
      const contestantScores = filteredScores.filter((s) => s.contestantId === contestant.id);

      // Get scores for each main criteria (sum of sub-criteria)
      const criteriaScores = mainCriteria.map((criteria) => {
        const criteriaSubCriteria = subCriteria.filter((c) => c.parentId === criteria.id);
        const totalScore = contestantScores
          .filter((s) => criteriaSubCriteria.some((sub) => sub.id === s.criteriaId))
          .reduce((sum, s) => sum + s.value, 0);
        return {
          criteriaId: criteria.id,
          criteriaName: criteria.name,
          score: totalScore,
        };
      });

      return {
        ...contestant,
        criteriaScores,
      };
    });
  };

  // Create contestant data
  let contestantData;
  let maleContestantData;
  let femaleContestantData;

  if (eventSettings?.separateGenders) {
    const maleContestants = eligibleContestants.filter(c => c.sex === "MALE");
    const femaleContestants = eligibleContestants.filter(c => c.sex === "FEMALE");

    maleContestantData = createContestantData(maleContestants);
    femaleContestantData = createContestantData(femaleContestants);
    contestantData = null;
  } else {
    contestantData = createContestantData(eligibleContestants);
    maleContestantData = null;
    femaleContestantData = null;
  }

  // Helper function to render a breakdown table
  const renderBreakdownTable = (data: typeof contestantData, title?: string) => {
    if (!data) return null;

    // Sort by contestant number ascending
    data.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

    // Calculate ranks for each criteria
    const criteriaRanks: Record<number, Record<number, number>> = {};
    mainCriteria.forEach((criteria) => {
      const scores = data.map((contestant) => ({
        contestantId: contestant.id,
        score: contestant.criteriaScores.find((cs) => cs.criteriaId === criteria.id)?.score ?? 0,
      }));

      // Sort by score descending for ranking
      scores.sort((a, b) => b.score - a.score);

      // Assign dense ranks (ties get same rank)
      criteriaRanks[criteria.id] = {};
      let currentRank = 1;
      for (let i = 0; i < scores.length; ) {
        const currentScore = scores[i].score;
        let tieCount = 0;
        while (i + tieCount < scores.length && scores[i + tieCount].score === currentScore) {
          criteriaRanks[criteria.id][scores[i + tieCount].contestantId] = currentRank;
          tieCount++;
        }
        currentRank += tieCount;
        i += tieCount;
      }
    });

    return (
      <div className="mb-6">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Contestant #</th>
                {mainCriteria.flatMap((criteria) => [
                  <th key={`score-${criteria.id}`} className="border px-2 py-1 text-center">
                    {criteria.name}
                  </th>,
                  <th key={`rank-${criteria.id}`} className="border px-2 py-1 text-center">
                    Rank
                  </th>
                ])}
              </tr>
            </thead>
            <tbody>
              {data.map((contestant, idx) => (
                <tr key={contestant.id}>
                  <td className="border px-2 py-1 text-center">{contestant.number || idx + 1}</td>
                  {mainCriteria.flatMap((criteria) => {
                    const score = contestant.criteriaScores.find((cs) => cs.criteriaId === criteria.id)?.score ?? 0;
                    const rank = criteriaRanks[criteria.id][contestant.id] ?? '';
                    return [
                      <td key={`score-${criteria.id}-${contestant.id}`} className="border px-2 py-1 text-center">
                        {score.toFixed(2)}
                      </td>,
                      <td key={`rank-${criteria.id}-${contestant.id}`} className="border px-2 py-1 text-center">
                        {rank}
                      </td>
                    ];
                  })}
                </tr>
              ))}
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
          {renderBreakdownTable(maleContestantData, "Male Contestants")}
          {renderBreakdownTable(femaleContestantData, "Female Contestants")}
        </>
      ) : (
        renderBreakdownTable(contestantData)
      )}
    </div>
  );
};