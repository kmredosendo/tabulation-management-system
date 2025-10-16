"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Music } from "lucide-react";

type Judge = {
  id: number;
  number: number;
  name: string;
};

type Contestant = {
  id: number;
  number: number;
  name: string;
  sex?: string;
};

type SubCriteria = {
  id: number;
  name: string;
  weight: number;
};

type TalentCriteria = {
  id: number;
  name: string;
  identifier: string;
  phase: string;
  subCriterias: SubCriteria[];
};

type Score = {
  contestantId: number;
  criteriaId: number;
  value: number;
};

interface TalentScoreSheetProps {
  eventId: string | string[] | undefined;
  currentPhase?: string;
  judges: Judge[];
  event?: {
    separateGenders?: boolean;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TalentScoreSheet({ eventId, currentPhase = "PRELIMINARY", judges, event, open, onOpenChange }: TalentScoreSheetProps) {
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [talentCriteria, setTalentCriteria] = useState<TalentCriteria | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset judge selector when sheet is dismissed
  useEffect(() => {
    if (!open) {
      setSelectedJudge(null);
      setScores({});
    }
  }, [open]);

  // Fetch contestants
  useEffect(() => {
    if (!eventId) return;
    const processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    
    fetch(getApiUrl(`/api/admin/contestants?eventId=${processedEventId}`))
      .then(res => res.json())
      .then(data => setContestants(data))
      .catch(err => console.error("Error fetching contestants:", err));
  }, [eventId]);

  // Fetch talent criteria
  useEffect(() => {
    if (!eventId) return;
    const processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    
    fetch(getApiUrl(`/api/admin/criteria?eventId=${processedEventId}&phase=${currentPhase}`))
      .then(res => res.json())
      .then((data: TalentCriteria[]) => {
        const talent = data.find(c => c.identifier === "best-in-talent");
        setTalentCriteria(talent || null);
      })
      .catch(err => console.error("Error fetching criteria:", err));
  }, [eventId, currentPhase]);

  // Fetch existing scores when judge is selected
  const fetchScores = useCallback(async () => {
    if (!selectedJudge || !eventId) return;
    
    const processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    setLoading(true);

    try {
      const res = await fetch(
        getApiUrl(`/api/admin/talent-scores?judgeId=${selectedJudge.id}&eventId=${processedEventId}&phase=${currentPhase}`)
      );
      
      if (res.ok) {
        const data = await res.json();
        const existingScores: Record<string, string> = {};
        
        data.scores.forEach((score: Score) => {
          const key = `${score.contestantId}-${score.criteriaId}`;
          existingScores[key] = score.value.toString();
        });
        
        setScores(existingScores);
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
      toast.error("Failed to load existing scores");
    } finally {
      setLoading(false);
    }
  }, [selectedJudge, eventId, currentPhase]);

  useEffect(() => {
    if (selectedJudge) {
      fetchScores();
    } else {
      setScores({});
    }
  }, [selectedJudge, fetchScores]);

  const handleScoreChange = (contestantId: number, subCriteriaId: number, value: string) => {
    const key = `${contestantId}-${subCriteriaId}`;
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!selectedJudge || !eventId || !talentCriteria) {
      toast.error("Please select a judge and ensure talent criteria exists");
      return;
    }

    const processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    setSaving(true);

    try {
      // Prepare scores data
      const scoresData = Object.entries(scores)
        .filter(([, value]) => value && value.trim() !== "")
        .map(([key, value]) => {
          const [contestantId, subCriteriaId] = key.split("-").map(Number);
          return {
            contestantId,
            subCriteriaId,
            value: parseFloat(value),
          };
        });

      if (scoresData.length === 0) {
        toast.error("Please enter at least one score");
        setSaving(false);
        return;
      }

      const res = await fetch(getApiUrl("/api/admin/talent-scores"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeId: selectedJudge.id,
          eventId: processedEventId,
          scores: scoresData,
          phase: currentPhase,
        }),
      });

      if (res.ok) {
        toast.success(`Talent scores saved for Judge ${selectedJudge.number}`);
        if (onOpenChange) onOpenChange(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save scores");
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      toast.error("Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const hasScores = Object.keys(scores).length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Music className="w-4 h-4" />
          Encode Talent Scores
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="!max-w-[540px] w-[540px] p-0 flex flex-col">
        {/* Sticky Header */}
        <SheetHeader className="sticky top-0 bg-background z-20 border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Encode Talent Scores - {currentPhase === "PRELIMINARY" ? "Preliminary" : "Final"} Round
          </SheetTitle>
          
          {/* Judge Selector */}
          <div className="mt-4">
            <Select
              value={selectedJudge?.id.toString() || ""}
              onValueChange={(value) => {
                const judge = judges.find(j => j.id.toString() === value);
                setSelectedJudge(judge || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a judge..." />
              </SelectTrigger>
              <SelectContent>
                {judges.map(judge => (
                  <SelectItem key={judge.id} value={judge.id.toString()}>
                    Judge #{judge.number} - {judge.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedJudge ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select a judge to start encoding talent scores.
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading scores...</div>
          ) : !talentCriteria || talentCriteria.subCriterias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No talent criteria found for this event in the {currentPhase.toLowerCase()} phase.
              <br />
              Please add talent criteria first.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
                {/* Sticky Table Header */}
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    <th className="border-b-2 border-muted p-2 text-center align-bottom bg-muted">
                      Contestant #
                    </th>
                    {talentCriteria.subCriterias.map((sub, idx) => (
                      <th
                        key={sub.id}
                        className={`border-b-2 border-muted p-2 text-center font-normal bg-muted ${
                          idx === 0 ? "border-l-2" : ""
                        }`}
                      >
                        {sub.name}
                        <br />
                        <span className="text-xs text-muted-foreground">({sub.weight}%)</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                {/* Table Body */}
                <tbody>
                  {(() => {
                    // Sort contestants by gender first (if separate genders), then by number
                    const sortedContestants = [...contestants].sort((a, b) => {
                      const sexOrder = { MALE: 0, FEMALE: 1 };
                      const aSex = sexOrder[a.sex as keyof typeof sexOrder] ?? 2;
                      const bSex = sexOrder[b.sex as keyof typeof sexOrder] ?? 2;

                      if (aSex !== bSex) {
                        return aSex - bSex;
                      }

                      return a.number - b.number;
                    });

                    if (!event?.separateGenders) {
                      // Render without gender grouping
                      return sortedContestants.map((contestant) => {
                        // Determine row background based on gender
                        const rowClass = contestant.sex === "MALE"
                          ? "bg-blue-50 dark:bg-blue-950/20"
                          : contestant.sex === "FEMALE"
                          ? "bg-pink-50 dark:bg-pink-950/20"
                          : "";

                        return (
                          <tr key={contestant.id} className={rowClass}>
                            <td className="border-b-2 border-muted p-1 font-mono whitespace-nowrap text-xs text-center">
                              {event?.separateGenders && contestant.sex ? `${contestant.sex.charAt(0)}-` : ''}#{contestant.number}
                            </td>
                            {talentCriteria.subCriterias.map((sub, idx) => (
                              <td
                                key={sub.id}
                                className={`border-b-2 border-muted p-1 text-center ${
                                  idx === 0 ? "border-l-2" : ""
                                }`}
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  max={sub.weight}
                                  step={0.01}
                                  className="w-full h-8 px-1 py-0 text-xs text-center"
                                  value={scores[`${contestant.id}-${sub.id}`] || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v && parseFloat(v) > sub.weight) {
                                      handleScoreChange(contestant.id, sub.id, "");
                                      e.target.classList.add("animate-shake");
                                      setTimeout(() => {
                                        e.target.classList.remove("animate-shake");
                                      }, 1200);
                                      return;
                                    }
                                    handleScoreChange(contestant.id, sub.id, v);
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      });
                    }

                    // Group by gender and render with headers
                    const genderGroups = sortedContestants.reduce((groups, contestant) => {
                      const gender = contestant.sex || 'OTHER';
                      if (!groups[gender]) groups[gender] = [];
                      groups[gender].push(contestant);
                      return groups;
                    }, {} as Record<string, typeof sortedContestants>);

                    const genderOrder = ['MALE', 'FEMALE', 'OTHER'];
                    const genderLabels = { MALE: 'Male Contestants', FEMALE: 'Female Contestants', OTHER: 'Other Contestants' };

                    return genderOrder.flatMap(gender => {
                      const genderContestants = genderGroups[gender] || [];
                      if (genderContestants.length === 0) return [];

                      const rows = [];

                      // Add gender header row
                      rows.push(
                        <tr key={`header-${gender}`} className="bg-muted/50">
                          <td
                            colSpan={1 + talentCriteria.subCriterias.length}
                            className="border-b-2 border-muted p-3 text-center font-bold text-sm"
                          >
                            {genderLabels[gender as keyof typeof genderLabels]}
                          </td>
                        </tr>
                      );

                      // Add contestant rows
                      genderContestants.forEach(contestant => {
                        // Determine row background based on gender
                        const rowClass = contestant.sex === 'MALE'
                          ? 'bg-blue-50 dark:bg-blue-950/20'
                          : contestant.sex === 'FEMALE'
                          ? 'bg-pink-50 dark:bg-pink-950/20'
                          : '';

                        rows.push(
                          <tr key={contestant.id} className={rowClass}>
                            <td className="border-b-2 border-muted p-1 font-mono whitespace-nowrap text-xs text-center">
                              {event?.separateGenders && contestant.sex ? `${contestant.sex.charAt(0)}-` : ''}#{contestant.number}
                            </td>
                            {talentCriteria.subCriterias.map((sub, idx) => (
                              <td
                                key={sub.id}
                                className={`border-b-2 border-muted p-1 text-center ${
                                  idx === 0 ? "border-l-2" : ""
                                }`}
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  max={sub.weight}
                                  step={0.01}
                                  className="w-full h-8 px-1 py-0 text-xs text-center"
                                  value={scores[`${contestant.id}-${sub.id}`] || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v && parseFloat(v) > sub.weight) {
                                      handleScoreChange(contestant.id, sub.id, "");
                                      e.target.classList.add("animate-shake");
                                      setTimeout(() => {
                                        e.target.classList.remove("animate-shake");
                                      }, 1200);
                                      return;
                                    }
                                    handleScoreChange(contestant.id, sub.id, v);
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      });

                      return rows;
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {selectedJudge && talentCriteria && talentCriteria.subCriterias.length > 0 && (
          <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange && onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasScores}
            >
              {saving ? "Saving..." : "Save All Scores"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
