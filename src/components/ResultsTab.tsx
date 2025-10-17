"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { CategoryRankTable } from "@/components/CategoryRankTable";
import { FinalRankTable } from "@/components/FinalRankTable";
import { RankPerJudgeTable } from "@/components/RankPerJudgeTable";
import { ContestantBreakdownTable } from "@/components/ContestantBreakdownTable";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getApiUrl } from "@/lib/api";
import { Medal, Eye, Printer, Star, Mic, UserCheck, Crown, User, Waves, Sparkles } from "lucide-react";

type Category = {
  id: number;
  name: string;
  identifier: string;
  phase: string;
};

interface CategoryData {
  event: {
    id: number;
    name: string;
    date: string;
    institutionName: string;
    institutionAddress: string;
    venue: string;
  };
  criteria: {
    id: number;
    name: string;
    identifier: string;
  };
  contestants: Array<{
    contestantId: number;
    contestantName: string;
    scores: Array<{
      judgeId: number;
      judgeName: string;
      value: number;
    }>;
  }>;
}

interface ResultsTabProps {
  categories: Category[];
  categoriesLoading: boolean;
  eventId: string | string[] | undefined;
  event: Event;
}

interface Event {
  id: number;
  name: string;
  separateGenders: boolean;
  finalistsCount: number;
  currentPhase: string;
  hasTwoPhases: boolean;
}

export function ResultsTab({ categories, categoriesLoading, eventId, event }: ResultsTabProps) {
  // Results state
  const [categoryDialogs, setCategoryDialogs] = useState<Record<string, boolean>>({});
  const [categoryLoading, setCategoryLoading] = useState<Record<string, boolean>>({});
  const [categoryData, setCategoryData] = useState<Record<string, CategoryData | null>>({});
  const [categoryError, setCategoryError] = useState<Record<string, string>>({});
  const [rankPerJudgeDialog, setRankPerJudgeDialog] = useState(false);
  const [finalRankDialog, setFinalRankDialog] = useState(false);
  const [contestantRankDialog, setContestantRankDialog] = useState(false);
  const [selectedViewPhase, setSelectedViewPhase] = useState<string>(event?.currentPhase || "PRELIMINARY");

  // Map criteria identifier to icon component and color
  const getCategoryIcon = (identifier: string) => {
    const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
      "best-in-talent": { icon: Star, color: "text-yellow-500" },
      "best-in-interview": { icon: Mic, color: "text-blue-500" },
      "best-in-sportswear": { icon: UserCheck, color: "text-green-500" },
      "best-in-gown": { icon: Sparkles, color: "text-purple-500" },
      "best-in-swimsuit": { icon: Waves, color: "text-cyan-500" },
    };
    return iconMap[identifier] || { icon: Crown, color: "text-purple-600" };
  };

  // Handle category dialog open/close and fetch data
  const handleCategoryDialogChange = (identifier: string, open: boolean) => {
    setCategoryDialogs(prev => ({ ...prev, [identifier]: open }));
    if (open && !categoryData[identifier] && !categoryLoading[identifier]) {
      setCategoryLoading(prev => ({ ...prev, [identifier]: true }));
      setCategoryError(prev => ({ ...prev, [identifier]: "" }));
      fetch(getApiUrl(`/api/category-scores?category=${encodeURIComponent(identifier)}&eventId=${Array.isArray(eventId) ? eventId[0] : eventId}&phase=${selectedViewPhase}`))
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setCategoryData(prev => ({ ...prev, [identifier]: data }));
          setCategoryLoading(prev => ({ ...prev, [identifier]: false }));
        })
        .catch((error) => {
          console.error("Error fetching category scores:", error);
          setCategoryError(prev => ({ ...prev, [identifier]: error.message || "Failed to load category scores" }));
          setCategoryLoading(prev => ({ ...prev, [identifier]: false }));
        });
    }
    if (!open) {
      setCategoryData(prev => ({ ...prev, [identifier]: null }));
      setCategoryLoading(prev => ({ ...prev, [identifier]: false }));
      setCategoryError(prev => ({ ...prev, [identifier]: "" }));
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Medal className="w-5 h-5 hidden md:flex" />
            <span className="hidden md:inline">Results Overview</span>
            {event?.hasTwoPhases && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                 {selectedViewPhase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {event?.hasTwoPhases && (
              <Select value={selectedViewPhase} onValueChange={setSelectedViewPhase}>
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="View phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                  {event?.hasTwoPhases && <SelectItem value="FINAL">Final</SelectItem>}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {categoriesLoading ? (
          <div className="text-center py-8">Loading categories...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
            {/* Special categories with identifiers */}
            {categories.filter(cat => cat.phase === selectedViewPhase).map(cat => {
              const iconInfo = getCategoryIcon(cat.identifier);
              const Icon = iconInfo.icon;
              return (
                <Card key={cat.id} className="w-full p-1 rounded shadow-none">
                  <div className="flex flex-row items-center justify-between gap-2 p-1">
                    <div className="flex flex-row items-center gap-1">
                      <Icon className={`w-5 h-5 ${iconInfo.color}`} />
                      <span className="text-base font-semibold">{cat.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Dialog open={categoryDialogs[cat.identifier]} onOpenChange={(open) => handleCategoryDialogChange(cat.identifier, open)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" aria-label="View" title={`View ${cat.name} Results`}>
                            <Eye />
                          </Button>
                        </DialogTrigger>
                        {!!categoryDialogs[cat.identifier] && (
                          <DialogContent className="max-w-7xl w-[75vw]" style={{ maxWidth: '75vw', width: '75vw' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className={`w-5 h-5 ${iconInfo.color}`} />
                              <DialogTitle>{cat.name}</DialogTitle>
                            </div>
                            {categoryLoading[cat.identifier] ? (
                              <div className="py-4 text-center text-muted-foreground">Loading...</div>
                            ) : categoryError[cat.identifier] ? (
                              <div className="py-4 text-center text-destructive">{categoryError[cat.identifier]}</div>
                            ) : categoryData[cat.identifier] && categoryData[cat.identifier]?.contestants?.length ? (
                              <>
                                <CategoryRankTable contestants={categoryData[cat.identifier]!.contestants} eventSettings={event} />
                                <div className="flex justify-end mt-4">
                                  <Button
                                    onClick={() => {
                                      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                                      const url = event?.hasTwoPhases 
                                        ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/category/${cat.identifier}?phase=${selectedViewPhase}`
                                        : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/category/${cat.identifier}`;
                                      window.open(url, '_blank');
                                    }}
                                    aria-label="Print"
                                    title={`Print ${cat.name} Results`}
                                  >
                                    <Printer className="mr-2" /> Print
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="py-4 text-center text-muted-foreground">No scores found.</div>
                            )}
                          </DialogContent>
                        )}
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Print"
                        title={`Print ${cat.name} Results`}
                        onClick={() => {
                          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                          const url = event?.hasTwoPhases 
                            ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/category/${cat.identifier}?phase=${selectedViewPhase}`
                            : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/category/${cat.identifier}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <Printer />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {/* Rank per Judge */}
            <Card className="w-full p-1 rounded shadow-none">
              <div className="flex flex-row items-center justify-between gap-2 p-1">
                <div className="flex flex-row items-center gap-1">
                  <UserCheck className="w-5 h-5 text-green-500" />
                  <span className="text-base font-semibold">Rank per Judge</span>
                </div>
                <div className="flex gap-1">
                  <Dialog open={rankPerJudgeDialog} onOpenChange={setRankPerJudgeDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="View" title="View Rank per Judge">
                        <Eye />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="max-w-7xl w-[75vw]"
                      style={{ maxWidth: '75vw', width: '75vw' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-5 h-5 text-green-500" />
                        <DialogTitle>Rank per Judge</DialogTitle>
                      </div>
                      <RankPerJudgeTable eventId={parseInt(Array.isArray(eventId) ? eventId[0] : eventId!)} phase={selectedViewPhase} eventSettings={event} />
                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={() => {
                            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                            const url = event?.hasTwoPhases 
                              ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/rank-per-judge?phase=${selectedViewPhase}`
                              : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/rank-per-judge`;
                            window.open(url, '_blank');
                          }}
                          aria-label="Print"
                          title="Print Rank per Judge"
                        >
                          <Printer className="mr-2" /> Print
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Print"
                    title="Print Rank per Judge"
                    onClick={() => {
                      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                      const url = event?.hasTwoPhases 
                        ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/rank-per-judge?phase=${selectedViewPhase}`
                        : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/rank-per-judge`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Printer />
                  </Button>
                </div>
              </div>
            </Card>
            {/* Contestant Rank */}
            <Card className="w-full p-1 rounded shadow-none">
              <div className="flex flex-row items-center justify-between gap-2 p-1">
                <div className="flex flex-row items-center gap-1">
                  <User className="w-5 h-5 text-pink-500" />
                  <span className="text-base font-semibold">Contestant Rank</span>
                </div>
                <div className="flex gap-1">
                  <Dialog open={contestantRankDialog} onOpenChange={setContestantRankDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="View" title="View Contestant Rank">
                        <Eye />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="max-w-7xl w-[75vw]"
                      style={{ maxWidth: '75vw', width: '75vw' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-pink-500" />
                        <DialogTitle>Contestant Rank</DialogTitle>
                      </div>
                      <ContestantBreakdownTable eventId={parseInt(Array.isArray(eventId) ? eventId[0] : eventId!)} phase={selectedViewPhase} eventSettings={event} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>
            {/* Overall Rank */}
            <Card className="w-full p-1 rounded shadow-none">
              <div className="flex flex-row items-center justify-between gap-2 p-1">
                <div className="flex flex-row items-center gap-1">
                  <Crown className={`w-5 h-5 ${selectedViewPhase === "PRELIMINARY" ? "text-yellow-500" : "text-red-500"}`} />
                  <span className="text-base font-semibold">{event?.hasTwoPhases ? (selectedViewPhase === "PRELIMINARY" ? "Preliminary" : "Final") : "Final"} Rank</span>
                </div>
                <div className="flex gap-1">
                  <Dialog open={finalRankDialog} onOpenChange={setFinalRankDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="View" title={`View ${event?.hasTwoPhases ? (selectedViewPhase === "PRELIMINARY" ? "Preliminary" : "Final") : "Final"} Rank`}>
                        <Eye />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="max-w-7xl w-[75vw]"
                      style={{ maxWidth: '75vw', width: '75vw' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className={`w-5 h-5 ${selectedViewPhase === "PRELIMINARY" ? "text-yellow-500" : "text-red-500"}`} />
                        <DialogTitle>{event?.hasTwoPhases ? (selectedViewPhase === "PRELIMINARY" ? "Preliminary" : "Final") : "Final"} Rank</DialogTitle>
                      </div>
                      <FinalRankTable eventId={parseInt(Array.isArray(eventId) ? eventId[0] : eventId!)} phase={selectedViewPhase} eventSettings={event} />
                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={() => {
                            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                            const url = event?.hasTwoPhases 
                              ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/final-rank?phase=${selectedViewPhase}`
                              : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/final-rank`;
                            window.open(url, '_blank');
                          }}
                          aria-label="Print"
                          title={`Print ${event?.hasTwoPhases ? (selectedViewPhase === "PRELIMINARY" ? "Preliminary" : "Final") : "Final"} Rank`}
                        >
                          <Printer className="mr-2" /> Print
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Print"
                    title={`Print ${event?.hasTwoPhases ? (selectedViewPhase === "PRELIMINARY" ? "Preliminary" : "Final") : "Final"} Rank`}
                    onClick={() => {
                      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                      const url = event?.hasTwoPhases 
                        ? `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/final-rank?phase=${selectedViewPhase}`
                        : `${basePath}/admin/events/${Array.isArray(eventId) ? eventId[0] : eventId}/results/print/final-rank`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Printer />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          </>
        )}
      </div>
    </div>
  );
}