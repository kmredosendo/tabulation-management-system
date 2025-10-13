"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import "./judge-indicator.css";
import { useActiveJudges } from "@/lib/useActiveJudges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  finalistsCount: number;
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
    <div className="min-h-screen bg-muted flex items-start justify-center py-10 px-2 sm:px-4 h-[90vh] overflow-x-hidden">
      {/* Main Content */}
      <div className="w-full max-w-4xl h-full flex flex-col">
        <Card className="h-full min-h-0 flex flex-col overflow-hidden gap-2">
          <CardHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b flex-shrink-0">
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
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()} • {event.venue}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {event.hasTwoPhases && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Contest Phase:</span>
                    <Select value={event.currentPhase} onValueChange={handlePhaseChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                        <SelectItem value="FINAL">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {/* Tabs for different sections - Sticky */}
            <Tabs defaultValue="contestants" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
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
                <TabsTrigger value="scores" className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Scores
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  Results
                </TabsTrigger>
              </TabsList>

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
                className="max-w-7xl w-[75vw] p-0"
                style={{ maxWidth: '75vw', width: '75vw' }}
              >
                <DialogHeader className="px-8 pt-8 pb-2">
                  <DialogTitle className="text-lg">
                    Raw Scores for Judge {selectedJudge?.number} - {selectedJudge?.name} ({selectedPhase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"})
                  </DialogTitle>
                </DialogHeader>
                {selectedJudge && (
                  <div className="relative p-8 pt-2 overflow-auto print:p-0 print:pt-0" style={{ maxHeight: '80vh' }}>
                    <div>
                      <RawScoresTable judgeId={selectedJudge.id} eventId={parseInt(Array.isArray(id) ? id[0] : id!)} phase={selectedPhase} />
                    </div>
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