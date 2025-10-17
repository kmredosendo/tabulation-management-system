"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import "./judge-indicator.css";
import { useActiveJudges } from "@/lib/useActiveJudges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "sonner";
import { getApiUrl } from "@/lib/api";
import { RawScoresTable } from "@/components/RawScoresTable";
import { ContestantsTab } from "@/components/ContestantsTab";
import { JudgesTab } from "@/components/JudgesTab";
import { CriteriaTab } from "@/components/CriteriaTab";
import { ScoresTab } from "@/components/ScoresTab";
import { ResultsTab } from "@/components/ResultsTab";
import {
  Trophy,
  Users,
  UserCheck,
  ListChecks,
  ClipboardList,
  Medal,
  ArrowLeft
} from "lucide-react";

type Event = {
  id: number;
  name: string;
  date: string;
  institutionName?: string;
  institutionAddress?: string;
  venue?: string;
  status: string;
  currentPhase: string;
  hasTwoPhases: boolean;
  separateGenders: boolean;
  separateTalent: boolean;
  finalistsCount: number;
  tieBreakingStrategy?: string;
};

type Judge = {
  id: number;
  number: number;
  name: string;
  lockedPreliminary: boolean;
  lockedFinal: boolean;
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Judges state
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const activeJudges = useActiveJudges();
  const [selectedPhase, setSelectedPhase] = useState<string>("PRELIMINARY");
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [rawDialogOpen, setRawDialogOpen] = useState(false);

  // Categories state
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; identifier: string; phase: string }>>([]);
  
  // Tie resolution state
  const [hasUnresolvedTies, setHasUnresolvedTies] = useState(false);

  // Fetch event data
  useEffect(() => {
    if (!id) return;
    fetch(getApiUrl(`/api/admin/events/${id}`))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => {
        setEvent(null);
        setLoading(false);
      });
  }, [id]);

  // Fetch categories when event changes
  useEffect(() => {
    if (!event?.id) {
      setCategories([]);
      return;
    }
    setCategoriesLoading(true);
    fetch(getApiUrl(`/api/admin/criteria?eventId=${event.id}`))
      .then(res => res.json())
      .then((data: Array<{ id: number; name: string; identifier: string; phase: string }>) => {
        setCategories(data.filter((c) => c.identifier));
        setCategoriesLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setCategoriesLoading(false);
      });
  }, [event?.id]);

  // Fetch judges
  const fetchJudges = useCallback(() => {
    if (!event?.id) return;
    setJudgesLoading(true);
    fetch(getApiUrl(`/api/admin/judges?eventId=${event.id}`))
      .then(res => res.json())
      .then(data => {
        setJudges(data);
        setJudgesLoading(false);
      })
      .catch(() => {
        setJudges([]);
        setJudgesLoading(false);
      });
  }, [event?.id]);

  // Load data when event is loaded
  useEffect(() => {
    if (event?.id) {
      fetchJudges();
    }
  }, [event?.id, fetchJudges]);

  // Helper function to check if there are unresolved ties that prevent phase advancement
  const checkForUnresolvedTies = useCallback(async (): Promise<boolean> => {
    if (!event || !event.hasTwoPhases || event.currentPhase !== 'PRELIMINARY') return false;

    // For manual selection strategy, check if there are actual ties that need manual resolution
    if (event.tieBreakingStrategy === 'MANUAL_SELECTION') {
      try {
        // Get raw scores to calculate averages and detect ties
        const scoresRes = await fetch(getApiUrl(`/api/raw-scores?eventId=${event.id}&phase=PRELIMINARY`));
        if (!scoresRes.ok) return false; // If can't get scores, assume no ties
        
        const scoresData = await scoresRes.json();
        
        if (!scoresData.scores || scoresData.scores.length === 0) return false; // No scores yet
        
        // Calculate contestant averages (using correct raw-scores API structure)
        const contestantScores: Record<number, { total: number; count: number; average: number; contestant: { id: number; name: string; sex: string; number?: number } }> = {};
        
        // Create a lookup map for contestants from the API response
        const contestantMap = new Map();
        scoresData.contestants.forEach((contestant: { id: number; name: string; sex: string; number?: number }) => {
          contestantMap.set(contestant.id, contestant);
        });
        
        scoresData.scores.forEach((score: { contestantId: number; value: number; contestantName: string }) => {
          const contestant = contestantMap.get(score.contestantId);
          if (!contestant) return;
          
          if (!contestantScores[score.contestantId]) {
            contestantScores[score.contestantId] = {
              total: 0,
              count: 0,
              average: 0,
              contestant: contestant
            };
          }
          contestantScores[score.contestantId].total += score.value;
          contestantScores[score.contestantId].count += 1;
        });

        // Calculate averages
        Object.keys(contestantScores).forEach(id => {
          const data = contestantScores[parseInt(id)];
          data.average = data.count > 0 ? data.total / data.count : 0;
        });

        const averages = Object.entries(contestantScores)
          .map(([id, data]) => ({
            id: parseInt(id),
            average: data.average,
            contestant: data.contestant
          }));

        // Check for ties that actually require manual selection
        const checkForTies = (contestants: typeof averages, finalistsCount: number): boolean => {
          if (contestants.length <= finalistsCount) return false; // Not enough contestants to have ties
          
          const sorted = contestants.sort((a, b) => b.average - a.average);
          const cutoffScore = sorted[finalistsCount - 1].average;
          
          // Find all contestants tied at the cutoff score
          const tiedContestants = sorted.filter(c => c.average === cutoffScore);
          
          // Find contestants better than the cutoff (automatically qualify)
          const betterThanCutoff = sorted.filter(c => c.average > cutoffScore);
          
          // Calculate remaining spots after automatic qualifiers
          const remainingSpots = finalistsCount - betterThanCutoff.length;
          
          // Manual selection only needed if more contestants are tied than remaining spots
          return tiedContestants.length > remainingSpots;
        };

        let hasTies = false;

        if (event.separateGenders) {
          // Check ties for each gender separately
          const maleContestants = averages.filter(avg => avg.contestant.sex === 'MALE');
          const femaleContestants = averages.filter(avg => avg.contestant.sex === 'FEMALE');
          
          hasTies = checkForTies(maleContestants, event.finalistsCount) || 
                   checkForTies(femaleContestants, event.finalistsCount);
        } else {
          // Check ties for all contestants together
          hasTies = checkForTies(averages, event.finalistsCount);
        }
        
        if (!hasTies) return false; // No ties to resolve

        // If there are ties, check if manual selections have been made
        const selectionsRes = await fetch(getApiUrl(`/api/admin/manual-finalists?eventId=${event.id}`));
        const selectionsData = await selectionsRes.json();
        
        return !selectionsRes.ok || !selectionsData.selections || selectionsData.selections.length !== event.finalistsCount;
      } catch (error) {
        console.error('Error checking for ties:', error);
        return false; // Don't block phase change if we can't determine tie status
      }
    }

    return false; // Other tie-breaking strategies are automatically resolved
  }, [event]);

  // Check for unresolved ties when event changes
  useEffect(() => {
    const checkTies = async () => {
      if (event) {
        const unresolvedTies = await checkForUnresolvedTies();
        setHasUnresolvedTies(unresolvedTies);
      }
    };
    checkTies();
  }, [event, checkForUnresolvedTies]);

  // Real-time polling for tie status changes
  useEffect(() => {
    if (!event || !event.hasTwoPhases || event.currentPhase !== 'PRELIMINARY') return;

    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    const pollTieStatus = async () => {
      if (cancelled) return;
      
      try {
        const unresolvedTies = await checkForUnresolvedTies();
        setHasUnresolvedTies(unresolvedTies);
      } catch (error) {
        console.error('Error polling tie status:', error);
      }
      
      if (!cancelled) {
        timer = setTimeout(pollTieStatus, 3000); // Poll every 3 seconds
      }
    };

    pollTieStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [event, checkForUnresolvedTies]);

  // Function to refresh tie status - can be called when manual selections change
  const refreshTieStatus = useCallback(async () => {
    if (event) {
      const unresolvedTies = await checkForUnresolvedTies();
      setHasUnresolvedTies(unresolvedTies);
    }
  }, [event, checkForUnresolvedTies]);

  const handleViewRaw = (judge: Judge, phase: string) => {
    setSelectedJudge(judge);
    setSelectedPhase(phase);
    setRawDialogOpen(true);
  };

  const handleJudgeLockToggle = async (judgeId: number, locked: boolean, phase: string) => {
    // Determine which field to update based on phase
    const fieldName = phase === "PRELIMINARY" ? "lockedPreliminary" : "lockedFinal";

    // Update local state immediately for instant UI feedback
    setJudges(prevJudges =>
      prevJudges.map(judge =>
        judge.id === judgeId ? { ...judge, [fieldName]: locked } : judge
      )
    );

    // Send API request
    const res = await fetch(getApiUrl(`/api/admin/judges/${judgeId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: locked }),
    });

    if (res.ok) {
      // Success - local state already updated
    } else {
      // Revert local state on error
      setJudges(prevJudges =>
        prevJudges.map(judge =>
          judge.id === judgeId ? { ...judge, [fieldName]: !locked } : judge
        )
      );
    }
  };

  const handlePhaseChange = async (newPhase: string) => {
    if (!event) return;

    // If switching to FINAL phase with unresolved ties, silently prevent
    if (newPhase === 'FINAL' && event.currentPhase === 'PRELIMINARY' && hasUnresolvedTies) {
      return; // Disabled items shouldn't trigger this, but just in case
    }

    // Update local state immediately
    setEvent({ ...event, currentPhase: newPhase });

    // Send API request
    const res = await fetch(getApiUrl(`/api/admin/events/${event.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPhase: newPhase }),
    });

    if (!res.ok) {
      // Revert local state on error
      setEvent({ ...event, currentPhase: event.currentPhase });
    } else {
      // Refresh tie status after successful phase change
      const unresolvedTies = await checkForUnresolvedTies();
      setHasUnresolvedTies(unresolvedTies);
    }
  };

  if (loading) {
    return null;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center text-destructive">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center p-2 sm:px-4 h-[90vh] overflow-x-hidden">
      {/* Main Content */}
      <div className="w-full max-w-4xl h-full flex flex-col">
        <Card className="h-full min-h-0 flex flex-col overflow-hidden gap-2">
          <CardHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b flex-shrink-0 gap-0">
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <Link href="/admin/dashboard">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div className="flex items-start gap-2">
                  <Trophy className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-left">
                      {event.name}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground hidden md:block">
                      {new Date(event.date).toLocaleDateString()} • {event.venue}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {event.hasTwoPhases && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium hidden md:inline">Contest Phase:</span>
                      <Select 
                        value={event.currentPhase} 
                        onValueChange={(value) => {
                          // Prevent changing to FINAL if there are unresolved ties
                          if (value === 'FINAL' && hasUnresolvedTies) {
                            return;
                          }
                          handlePhaseChange(value);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                          <SelectItem 
                            value="FINAL" 
                            disabled={hasUnresolvedTies}
                            className={hasUnresolvedTies ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            Final
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {/* Tabs for different sections - Sticky */}
            <Tabs defaultValue="contestants" className="w-full flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
              <TabsList className="flex w-max min-w-full gap-1 px-1">
                <TabsTrigger value="contestants" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contestants
                </TabsTrigger>
                <TabsTrigger value="judges" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Judges
                </TabsTrigger>
                <TabsTrigger value="criteria" className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Criteria
                </TabsTrigger>
                <TabsTrigger 
                  value="scores" 
                  className={`flex items-center gap-2 ${
                    hasUnresolvedTies && event.currentPhase === 'PRELIMINARY' 
                      ? 'pulse-warning' 
                      : ''
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Scores
                  {hasUnresolvedTies && event.currentPhase === 'PRELIMINARY' && (
                    <span className="ml-1 text-amber-600">⚠️</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  Results
                </TabsTrigger>
              </TabsList>
            </div>

              <div className="flex-1 min-h-0">
                {/* Contestants Tab */}
                <TabsContent value="contestants" className="h-full">
                  <ContestantsTab event={event} />
                </TabsContent>

                {/* Judges Tab */}
                <TabsContent value="judges" className="h-full">
                  <JudgesTab event={event} judges={judges} judgesLoading={judgesLoading} onRefreshJudges={fetchJudges} activeJudges={activeJudges} />
                </TabsContent>

                {/* Criteria Tab */}
                <TabsContent value="criteria" className="h-full">
                  <CriteriaTab event={event} currentPhase={event.currentPhase} />
                </TabsContent>

                {/* Scores Tab */}
                <TabsContent value="scores" className="h-full">
                  <ScoresTab
                    judges={judges}
                    judgesLoading={judgesLoading}
                    activeJudges={activeJudges}
                    onViewRaw={handleViewRaw}
                    onJudgeLockToggle={handleJudgeLockToggle}
                    eventId={id || ""}
                    currentPhase={event.currentPhase}
                    event={event}
                    onTieStatusChange={refreshTieStatus}
                    hasUnresolvedTies={hasUnresolvedTies}
                  />
                </TabsContent>

                {/* Results Tab */}
                <TabsContent value="results" className="h-full">
                  <ResultsTab
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    eventId={id}
                    event={event}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Dialog open={rawDialogOpen} onOpenChange={setRawDialogOpen}>
              <DialogContent
                className="w-[95vw] max-w-none sm:max-w-4xl max-h-[90vh] flex flex-col"
              >
                <DialogHeader className="flex-shrink-0 sticky top-0 bg-background border-b pb-4">
                  <DialogTitle className="text-lg">
                    Raw Scores for Judge {selectedJudge?.number} - {selectedJudge?.name} ({selectedPhase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"})
                  </DialogTitle>
                </DialogHeader>
                {selectedJudge && (
                  <div className="flex-1 overflow-y-auto py-4">
                    <RawScoresTable judgeId={selectedJudge.id} eventId={parseInt(Array.isArray(id) ? id[0] : id!)} phase={selectedPhase} />
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Toaster />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}