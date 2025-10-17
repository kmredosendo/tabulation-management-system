"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Eye, Trophy } from "lucide-react";
import { FinalistSelectionTab } from "@/components/FinalistSelectionTab";
import { TalentScoreSheet } from "@/components/TalentScoreSheet";

type Judge = {
  id: number;
  number: number;
  name: string;
  lockedPreliminary: boolean;
  lockedFinal: boolean;
};

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

interface ScoresTabProps {
  judges: Judge[];
  judgesLoading: boolean;
  activeJudges: number[];
  onViewRaw: (judge: Judge, phase: string) => void;
  onJudgeLockToggle: (judgeId: number, locked: boolean, phase: string) => void;
  eventId: string | string[] | undefined;
  currentPhase?: string;
  event?: Event;
  onTieStatusChange?: () => void;
  hasUnresolvedTies?: boolean;
}

export function ScoresTab({ judges, judgesLoading, activeJudges, onViewRaw, onJudgeLockToggle, eventId, currentPhase = "PRELIMINARY", event, onTieStatusChange, hasUnresolvedTies = false }: ScoresTabProps) {
  const [selectedViewPhase, setSelectedViewPhase] = useState<string>(currentPhase);
  const [finalistDialogOpen, setFinalistDialogOpen] = useState(false);
  const [talentSheetOpen, setTalentSheetOpen] = useState(false);
  
  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <ClipboardList className="w-5 h-5 hidden md:flex" />
            <span className="hidden md:inline">Scores Overview</span>
            {event?.hasTwoPhases && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                 {selectedViewPhase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Encode Talent Scores Button - only show when separateTalent is true */}
            {event?.separateTalent && (
              <TalentScoreSheet
                eventId={eventId}
                currentPhase={selectedViewPhase}
                judges={judges}
                event={event}
                open={talentSheetOpen}
                onOpenChange={setTalentSheetOpen}
              />
            )}
            
            {/* Select Finalists Button - only show for manual selection in preliminary phase when there are unresolved ties */}
            {event?.hasTwoPhases && event?.tieBreakingStrategy === 'MANUAL_SELECTION' && event?.currentPhase === 'PRELIMINARY' && hasUnresolvedTies && (
              <Dialog open={finalistDialogOpen} onOpenChange={setFinalistDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Select Finalists
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[80vw] max-h-[85vh] overflow-hidden">
                  <DialogTitle>Select Finalists</DialogTitle>
                  <div className="overflow-hidden" style={{ height: 'calc(85vh - 120px)' }}>
                    {event && <FinalistSelectionTab event={event} onSuccess={() => {
                      setFinalistDialogOpen(false);
                      if (onTieStatusChange) onTieStatusChange();
                    }} />}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {event?.hasTwoPhases && (
              <Select value={selectedViewPhase} onValueChange={setSelectedViewPhase}>
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="View phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {judgesLoading ? (
          <div className="text-center py-8">Loading judges...</div>
        ) : judges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No judges found</div>
        ) : (
          <ul className="space-y-2">
            {judges.map((judge) => (
              <li
                key={judge.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {/* Active indicator */}
                    <span
                      title={activeJudges.map(String).includes(String(judge.id)) ? "Active" : "Inactive"}
                      className={
                        `judge-indicator ${activeJudges.map(String).includes(String(judge.id)) ? "active" : "inactive"}`
                      }
                    />
                    #{judge.number} {judge.name}
                    {Number(judge.number) === 1 && " (Chief Judge)"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedViewPhase === "PRELIMINARY" ? judge.lockedPreliminary : judge.lockedFinal}
                    onCheckedChange={(checked) => onJudgeLockToggle(judge.id, checked, selectedViewPhase)}
                    className="mr-2"
                  />
                  <span className="text-xs mr-4 w-16 text-center hidden md:inline">
                    {selectedViewPhase === "PRELIMINARY" ? (judge.lockedPreliminary ? "Locked" : "Unlocked") : (judge.lockedFinal ? "Locked" : "Unlocked")}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewRaw(judge, selectedViewPhase)}
                    title="View Raw Scores"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                      const processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
                      const url = event?.hasTwoPhases 
                        ? `${basePath}/admin/events/${processedEventId}/scores/print/${judge.id}?phase=${selectedViewPhase}`
                        : `${basePath}/admin/events/${processedEventId}/scores/print/${judge.id}`;
                      window.open(url, '_blank');
                    }}
                    title="Print Raw Scores"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-8 0h8v4H6v-4z" /></svg>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}