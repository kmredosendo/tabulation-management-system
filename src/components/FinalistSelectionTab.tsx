"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
// Card components removed as they're no longer used
import { getApiUrl } from "@/lib/api";
import { toast } from "sonner";
import { Trophy, CheckCircle2 } from "lucide-react";

interface Event {
  id: number;
  name: string;
  separateGenders: boolean;
  finalistsCount: number;
  currentPhase: string;
  hasTwoPhases: boolean;
  tieBreakingStrategy?: string;
}

interface Contestant {
  id: number;
  name: string;
  number: number;
  sex?: string;
}

interface ContestantWithScore {
  contestant: Contestant;
  averageScore: number;
  totalScore: number;
  rank: number;
}

interface FinalistSelectionTabProps {
  event: Event;
  onSuccess?: () => void;
}

export function FinalistSelectionTab({ event, onSuccess }: FinalistSelectionTabProps) {
  const [loading, setLoading] = useState(true);
  const [contestants, setContestants] = useState<ContestantWithScore[]>([]);
  const [selectedFinalists, setSelectedFinalists] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [tiedContestants, setTiedContestants] = useState<ContestantWithScore[]>([]);

  // Fetch contestants and their preliminary scores
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get contestants
        const contestantsRes = await fetch(getApiUrl(`/api/admin/contestants?eventId=${event.id}`));
        const contestantData = await contestantsRes.json();

        // Get preliminary scores
        const scoresRes = await fetch(getApiUrl(`/api/raw-scores?eventId=${event.id}&phase=PRELIMINARY`));
        const scoresData = await scoresRes.json();

        if (!scoresData.scores || scoresData.scores.length === 0) {
          setContestants([]);
          setLoading(false);
          return;
        }

        // Calculate average scores per contestant
        const contestantScores: Record<number, { total: number; count: number; contestant: Contestant }> = {};

        scoresData.scores.forEach((score: { contestantId: number; value: number }) => {
          if (!contestantScores[score.contestantId]) {
            const contestant = contestantData.find((c: Contestant) => c.id === score.contestantId);
            if (contestant) {
              contestantScores[score.contestantId] = { total: 0, count: 0, contestant };
            }
          }
          if (contestantScores[score.contestantId]) {
            contestantScores[score.contestantId].total += score.value;
            contestantScores[score.contestantId].count += 1;
          }
        });

        // Convert to array and calculate averages
        const contestantsWithScores: ContestantWithScore[] = Object.entries(contestantScores).map(([, data]) => ({
          contestant: data.contestant,
          averageScore: data.total / data.count,
          totalScore: data.total,
          rank: 0 // Will be calculated after sorting
        }));

        if (event.separateGenders) {
          // Handle gender separation - calculate ranks and selection per gender
          const maleContestants = contestantsWithScores.filter(c => c.contestant.sex === 'MALE');
          const femaleContestants = contestantsWithScores.filter(c => c.contestant.sex === 'FEMALE');

          // Sort and rank each gender group separately
          const processGenderGroup = (contestants: ContestantWithScore[]) => {
            contestants.sort((a, b) => b.averageScore - a.averageScore);
            let currentRank = 1;
            for (let i = 0; i < contestants.length; i++) {
              if (i > 0 && contestants[i].averageScore !== contestants[i - 1].averageScore) {
                currentRank = i + 1;
              }
              contestants[i].rank = currentRank;
            }
            return contestants;
          };

          const rankedMales = processGenderGroup(maleContestants);
          const rankedFemales = processGenderGroup(femaleContestants);

          // Combine all contestants with proper ranks
          const allRanked = [...rankedMales, ...rankedFemales];
          setContestants(allRanked);

          // Find ties for each gender separately
          const allTied: ContestantWithScore[] = [];
          const autoSelected: number[] = [];

          const processGenderTies = (genderContestants: ContestantWithScore[]) => {
            if (genderContestants.length > event.finalistsCount) {
              const cutoffScore = genderContestants[event.finalistsCount - 1].averageScore;
              const tied = genderContestants.filter(c => c.averageScore === cutoffScore);
              
              if (tied.length > 1) {
                allTied.push(...tied);
                // Auto-select non-tied qualifiers for this gender
                const autoQualified = genderContestants.filter(c => c.averageScore > cutoffScore);
                autoSelected.push(...autoQualified.map(c => c.contestant.id));
              } else {
                // No ties, auto-select top finalists for this gender
                autoSelected.push(...genderContestants.slice(0, event.finalistsCount).map(c => c.contestant.id));
              }
            } else {
              // All contestants of this gender qualify
              autoSelected.push(...genderContestants.map(c => c.contestant.id));
            }
          };

          processGenderTies(rankedMales);
          processGenderTies(rankedFemales);

          setTiedContestants(allTied);
          setSelectedFinalists(autoSelected);

        } else {
          // Original logic for non-gender-separated events
          contestantsWithScores.sort((a, b) => b.averageScore - a.averageScore);

          // Assign ranks
          let currentRank = 1;
          for (let i = 0; i < contestantsWithScores.length; i++) {
            if (i > 0 && contestantsWithScores[i].averageScore !== contestantsWithScores[i - 1].averageScore) {
              currentRank = i + 1;
            }
            contestantsWithScores[i].rank = currentRank;
          }

          setContestants(contestantsWithScores);

          // Identify contestants that need manual selection (ties at the cutoff)
          if (contestantsWithScores.length > event.finalistsCount) {
            const cutoffScore = contestantsWithScores[event.finalistsCount - 1].averageScore;
            const tied = contestantsWithScores.filter(c => c.averageScore === cutoffScore);
            
            if (tied.length > 1) {
              setTiedContestants(tied);
              // Auto-select non-tied qualifiers
              const autoQualified = contestantsWithScores.filter(c => c.averageScore > cutoffScore);
              setSelectedFinalists(autoQualified.map(c => c.contestant.id));
            } else {
              // No ties, auto-select top finalists
              setSelectedFinalists(contestantsWithScores.slice(0, event.finalistsCount).map(c => c.contestant.id));
            }
          } else {
            // All contestants qualify
            setSelectedFinalists(contestantsWithScores.map(c => c.contestant.id));
          }
        }

        // Load existing manual selections if they exist
        try {
          const selectionsRes = await fetch(getApiUrl(`/api/admin/manual-finalists?eventId=${event.id}`));
          const selectionsData = await selectionsRes.json();
          
          if (selectionsRes.ok && selectionsData.selections && selectionsData.selections.length > 0) {
            const existingSelections = selectionsData.selections.map((s: { contestant: { id: number } }) => s.contestant.id);
            setSelectedFinalists(existingSelections);
          }
        } catch {
          console.log('No existing manual selections found');
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load contestant data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [event.id, event.finalistsCount, event.separateGenders]);

  const handleFinalistToggle = (contestantId: number) => {
    const contestant = contestants.find(c => c.contestant.id === contestantId);
    if (!contestant) return;

    // Check if this contestant is in the tied group
    const isTied = tiedContestants.some(tc => tc.contestant.id === contestantId);
    
    if (!isTied) {
      // Can't deselect automatically qualified contestants
      return;
    }

    setSelectedFinalists(prev => {
      if (prev.includes(contestantId)) {
        return prev.filter(id => id !== contestantId);
      } else {
        if (event.separateGenders) {
          // For gender-separated events, check limits per gender
          const contestantGender = contestant.contestant.sex;
          
          // Count current selections for this gender
          const currentGenderSelections = prev.filter(id => {
            const c = contestants.find(cont => cont.contestant.id === id);
            return c?.contestant.sex === contestantGender;
          }).length;

          if (currentGenderSelections >= event.finalistsCount) {
            toast.error(`You can only select ${event.finalistsCount} ${contestantGender?.toLowerCase() || 'contestants'} finalists`);
            return prev;
          }

          return [...prev, contestantId];
        } else {
          // Original logic for non-gender-separated events
          const nonTiedSelected = prev.filter(id => 
            !tiedContestants.some(tc => tc.contestant.id === id)
          );
          const tiedSelected = prev.filter(id => 
            tiedContestants.some(tc => tc.contestant.id === id)
          );

          const slotsRemaining = event.finalistsCount - nonTiedSelected.length - tiedSelected.length;
          
          if (slotsRemaining > 0) {
            return [...prev, contestantId];
          } else {
            toast.error(`You can only select ${event.finalistsCount} finalists total`);
            return prev;
          }
        }
      }
    });
  };

  const handleSaveFinalists = async () => {
    if (event.separateGenders) {
      // Validate gender separation: each gender should have exactly finalistsCount selections
      const selectedContestants = contestants.filter(c => selectedFinalists.includes(c.contestant.id));
      const maleSelections = selectedContestants.filter(c => c.contestant.sex === 'MALE');
      const femaleSelections = selectedContestants.filter(c => c.contestant.sex === 'FEMALE');

      if (maleSelections.length !== event.finalistsCount) {
        toast.error(`Please select exactly ${event.finalistsCount} male finalists (currently: ${maleSelections.length})`);
        return;
      }
      if (femaleSelections.length !== event.finalistsCount) {
        toast.error(`Please select exactly ${event.finalistsCount} female finalists (currently: ${femaleSelections.length})`);
        return;
      }
    } else {
      // Original validation for non-gender-separated events
      if (selectedFinalists.length !== event.finalistsCount) {
        toast.error(`Please select exactly ${event.finalistsCount} finalists`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/manual-finalists'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: event.id,
          contestantIds: selectedFinalists
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save selection');
      }

      toast.success(`Successfully selected ${result.selections} finalists for the final round!`);
      
      // Call onSuccess callback to close dialog
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error saving finalists:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save finalist selection');
    } finally {
      setSaving(false);
    }
  };

  const getContestantStatus = (contestant: ContestantWithScore) => {
    const isSelected = selectedFinalists.includes(contestant.contestant.id);
    const isTied = tiedContestants.some(tc => tc.contestant.id === contestant.contestant.id);
    const isAutoQualified = contestant.rank <= event.finalistsCount && !isTied;

    if (isAutoQualified) {
      return { status: 'auto', label: 'Auto Qualified', color: 'text-green-600 bg-green-50' };
    } else if (isTied && isSelected) {
      return { status: 'manual', label: 'Manually Selected', color: 'text-blue-600 bg-blue-50' };
    } else if (isTied) {
      return { status: 'available', label: 'Available for Selection', color: 'text-yellow-600 bg-yellow-50' };
    } else {
      return { status: 'eliminated', label: 'Eliminated', color: 'text-gray-500 bg-gray-50' };
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading contestant data...</div>;
  }

  if (contestants.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No preliminary scores found</div>;
  }

  const nonTiedSelected = selectedFinalists.filter(id => 
    !tiedContestants.some(tc => tc.contestant.id === id)
  ).length;

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h2 className="text-base font-semibold">Manual Finalist Selection</h2>
            {event.separateGenders ? (
              <div className="text-sm text-gray-600">
                {(() => {
                  const selectedContestants = contestants.filter(c => selectedFinalists.includes(c.contestant.id));
                  const maleCount = selectedContestants.filter(c => c.contestant.sex === 'MALE').length;
                  const femaleCount = selectedContestants.filter(c => c.contestant.sex === 'FEMALE').length;
                  return `(Male: ${maleCount}/${event.finalistsCount}, Female: ${femaleCount}/${event.finalistsCount})`;
                })()}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                ({selectedFinalists.length}/{event.finalistsCount} selected)
              </div>
            )}
          </div>
          <Button 
            onClick={handleSaveFinalists}
            disabled={(() => {
              if (saving) return true;
              
              if (event.separateGenders) {
                // For gender-separated events, check if both genders have correct counts
                const selectedContestants = contestants.filter(c => selectedFinalists.includes(c.contestant.id));
                const maleCount = selectedContestants.filter(c => c.contestant.sex === 'MALE').length;
                const femaleCount = selectedContestants.filter(c => c.contestant.sex === 'FEMALE').length;
                return maleCount !== event.finalistsCount || femaleCount !== event.finalistsCount;
              } else {
                // For non-gender-separated events, use original logic
                return selectedFinalists.length !== event.finalistsCount;
              }
            })()}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>
        
        {tiedContestants.length > 0 && (
          <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-xs">
            {event.separateGenders ? (
              <div className="text-yellow-800">
                <strong>Ties detected:</strong> Select finalists from tied contestants for each gender.
                {(() => {
                  const maleTied = tiedContestants.filter(c => c.contestant.sex === 'MALE');
                  const femaleTied = tiedContestants.filter(c => c.contestant.sex === 'FEMALE');
                  return (
                    <div className="mt-1">
                      {maleTied.length > 0 && <div>• Male contestants tied at rank {maleTied[0].rank}</div>}
                      {femaleTied.length > 0 && <div>• Female contestants tied at rank {femaleTied[0].rank}</div>}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-yellow-800">
                <strong>Tie at rank {tiedContestants[0].rank}:</strong> Select {event.finalistsCount - nonTiedSelected} more from tied contestants.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'calc(90vh - 200px)' }}>
        {event.separateGenders ? (
          // Render contestants grouped by gender
          <div className="space-y-4">
            {[
              { gender: 'MALE', label: 'Male Contestants', contestants: contestants.filter(c => c.contestant.sex === 'MALE') },
              { gender: 'FEMALE', label: 'Female Contestants', contestants: contestants.filter(c => c.contestant.sex === 'FEMALE') }
            ].map(({ gender, label, contestants: genderContestants }) => (
              genderContestants.length > 0 && (
                <div key={gender}>
                  <h3 className="font-semibold text-sm mb-2 text-gray-700 border-b pb-1">{label}</h3>
                  <div className="space-y-1">
                    {genderContestants.map((contestant) => {
                      const status = getContestantStatus(contestant);
                      const isTied = tiedContestants.some(tc => tc.contestant.id === contestant.contestant.id);
                      const isSelected = selectedFinalists.includes(contestant.contestant.id);
                      
                      return (
                        <div 
                          key={contestant.contestant.id} 
                          className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-all hover:bg-gray-50 ${
                            isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                          } ${!isTied && status.status !== 'auto' ? 'opacity-60' : ''}`}
                          onClick={() => handleFinalistToggle(contestant.contestant.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-gray-900 min-w-[3rem]">#{contestant.contestant.number}</div>
                              <div className="text-sm text-gray-500">R{contestant.rank}</div>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{contestant.contestant.name}</div>
                              <div className="text-xs text-gray-600">
                                Avg: {contestant.averageScore.toFixed(2)} | Total: {contestant.totalScore.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                              {status.status === 'auto' ? 'Auto' : 
                               status.status === 'manual' ? 'Selected' :
                               status.status === 'available' ? 'Available' : 'Out'}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          // Original single list for non-gender-separated events
          <div className="space-y-1">
            {contestants.map((contestant) => {
              const status = getContestantStatus(contestant);
              const isTied = tiedContestants.some(tc => tc.contestant.id === contestant.contestant.id);
              const isSelected = selectedFinalists.includes(contestant.contestant.id);
              
              return (
                <div 
                  key={contestant.contestant.id} 
                  className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-all hover:bg-gray-50 ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                  } ${!isTied && status.status !== 'auto' ? 'opacity-60' : ''}`}
                  onClick={() => handleFinalistToggle(contestant.contestant.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-gray-900 min-w-[3rem]">#{contestant.contestant.number}</div>
                      <div className="text-sm text-gray-500">R{contestant.rank}</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{contestant.contestant.name}</div>
                      <div className="text-xs text-gray-600">
                        Avg: {contestant.averageScore.toFixed(2)} | Total: {contestant.totalScore.toFixed(1)}
                        {contestant.contestant.sex && <span className="ml-1">({contestant.contestant.sex})</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                      {status.status === 'auto' ? 'Auto' : 
                       status.status === 'manual' ? 'Selected' :
                       status.status === 'available' ? 'Available' : 'Out'}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}