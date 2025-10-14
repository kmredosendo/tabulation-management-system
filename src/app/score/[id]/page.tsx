"use client";
import { getApiUrl } from "@/lib/api";

import "../score-shake.css";

import { useEffect, useState, useCallback } from "react";
import { connectJudgeSocket, disconnectJudgeSocket, joinEventRoom } from "@/lib/judgeSocket";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Moon, Sun } from "lucide-react";

interface Contestant {
  id: number;
  number: number;
  name: string;
  sex?: string;
}

interface Criteria {
  id: number;
  name: string;
  subCriterias: SubCriteria[];
}

interface SubCriteria {
  id: number;
  name: string;
  weight: number;
  autoAssignToAllContestants: boolean;
}

interface Score {
  contestantId: number;
  value: number;
}

export default function JudgeScorePage() {
  const params = useParams();
  const judgeId = params?.id;
  const [event, setEvent] = useState<{ id: number; name: string; currentPhase: string; separateGenders: boolean; hasTwoPhases: boolean; finalistsCount: number | null; tieBreakingStrategy?: string } | null>(null);
  const [judge, setJudge] = useState<{ id: number; name: string; number: number; lockedPreliminary: boolean; lockedFinal: boolean } | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('judge-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('judge-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  // Function to determine finalists based on preliminary scores
  const determineFinalists = useCallback(async (eventId: number, finalistsCount: number, separateGenders: boolean, allContestants: Contestant[], tieBreakingStrategy?: string) => {
    try {
      // Fetch preliminary scores
      const prelimScoresRes = await fetch(getApiUrl(`/api/raw-scores?eventId=${eventId}&phase=PRELIMINARY`));
      const prelimData = await prelimScoresRes.json();

      if (!prelimData.scores || prelimData.scores.length === 0) {
        // No preliminary scores, show all contestants
        return allContestants;
      }

      // Calculate average and total scores per contestant
      const contestantScores: Record<number, { total: number; count: number; average: number; contestant: Contestant }> = {};

      prelimData.scores.forEach((score: Score) => {
        if (!contestantScores[score.contestantId]) {
          const contestant = allContestants.find((c: Contestant) => c.id === score.contestantId);
          if (contestant) {
            contestantScores[score.contestantId] = { total: 0, count: 0, average: 0, contestant };
          }
        }
        if (contestantScores[score.contestantId]) {
          contestantScores[score.contestantId].total += score.value;
          contestantScores[score.contestantId].count += 1;
        }
      });

      // Calculate averages
      Object.values(contestantScores).forEach(data => {
        data.average = data.total / data.count;
      });

      const averages = Object.entries(contestantScores).map(([id, data]) => ({
        id: parseInt(id),
        average: data.average,
        totalScore: data.total,
        contestant: data.contestant
      }));

      // Helper function to get finalists with configurable tie handling
      const getFinalistsWithStrategy = async (contestants: typeof averages, count: number, strategy: string = 'INCLUDE_TIES') => {
        const sorted = contestants.sort((a, b) => b.average - a.average);
        
        if (sorted.length <= count) {
          return sorted.map(avg => avg.contestant);
        }

        // Get the main qualifiers (definitely advance)
        const definitelyQualified = sorted.slice(0, count);
        const cutoffScore = definitelyQualified[count - 1].average;
        
        // Find contestants tied with the last qualifier
        const tiedContestants = sorted.filter(c => c.average === cutoffScore);
        
        // If no ties, return the exact count
        if (tiedContestants.length === 1) {
          return definitelyQualified.map(avg => avg.contestant);
        }

        // Handle ties based on strategy
        switch (strategy) {
          case 'INCLUDE_TIES':
            // Include all contestants who meet or exceed the cutoff score
            return sorted.filter(avg => avg.average >= cutoffScore).map(avg => avg.contestant);

          case 'TOTAL_SCORE':
            // Use total preliminary score as tiebreaker
            const tiesSorted = tiedContestants.sort((a, b) => b.totalScore - a.totalScore);
            const nonTiedQualified = sorted.filter(c => c.average > cutoffScore);
            const slotsRemaining = count - nonTiedQualified.length;
            return [...nonTiedQualified, ...tiesSorted.slice(0, slotsRemaining)].map(avg => avg.contestant);

          case 'CONTESTANT_NUMBER':
            // Use contestant number as tiebreaker (lower number wins)
            const numberSorted = tiedContestants.sort((a, b) => (a.contestant.number || 999) - (b.contestant.number || 999));
            const nonTiedQualified2 = sorted.filter(c => c.average > cutoffScore);
            const slotsRemaining2 = count - nonTiedQualified2.length;
            return [...nonTiedQualified2, ...numberSorted.slice(0, slotsRemaining2)].map(avg => avg.contestant);

          case 'MANUAL_SELECTION':
            // Check if manual selections exist for this event
            try {
              const manualRes = await fetch(getApiUrl(`/api/admin/manual-finalists?eventId=${eventId}`));
              const manualData = await manualRes.json();
              
              if (manualRes.ok && manualData.selections && manualData.selections.length > 0) {
                // Use manual selections
                const manualIds = manualData.selections.map((s: { contestant: { id: number } }) => s.contestant.id);
                return averages
                  .filter(avg => manualIds.includes(avg.contestant.id))
                  .map(avg => avg.contestant);
              } else {
                // No manual selections yet, include all tied contestants for admin selection
                console.warn('Manual tie-breaking required - including all tied contestants for admin selection');
                return sorted.filter(avg => avg.average >= cutoffScore).map(avg => avg.contestant);
              }
            } catch (error) {
              console.error('Error fetching manual selections:', error);
              // Fallback to including all tied contestants
              return sorted.filter(avg => avg.average >= cutoffScore).map(avg => avg.contestant);
            }

          default:
            // Fallback to including ties
            return sorted.filter(avg => avg.average >= cutoffScore).map(avg => avg.contestant);
        }
      };

      if (separateGenders) {
        // Separate by gender
        const maleContestants = averages.filter(avg => avg.contestant.sex === 'MALE');
        const femaleContestants = averages.filter(avg => avg.contestant.sex === 'FEMALE');

        // Get finalists for each gender using the specified strategy
        const topMales = await getFinalistsWithStrategy(maleContestants, finalistsCount, tieBreakingStrategy);
        const topFemales = await getFinalistsWithStrategy(femaleContestants, finalistsCount, tieBreakingStrategy);

        return [...topMales, ...topFemales];
      } else {
        // Overall top finalists with strategy-based tie handling
        return await getFinalistsWithStrategy(averages, finalistsCount, tieBreakingStrategy);
      }
    } catch (error) {
      console.error('Error determining finalists:', error);
      return allContestants; // Fallback to all contestants
    }
  }, []);

  // Socket connection handlers
  const handleConnect = useCallback(() => {
    console.log("Socket connected successfully");
    setConnectionStatus(prev => {
      // Show success toast if we were previously disconnected
      if (prev === 'disconnected') {
        toast.success("Connection restored!");
      }
      return 'connected';
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log("Socket disconnected");
    setConnectionStatus('disconnected');
    toast.error("Connection lost. Trying to reconnect...");
  }, []);

  const handleConnecting = useCallback(() => {
    console.log("Socket connecting");
    setConnectionStatus('connecting');
  }, []);

  useEffect(() => {
    async function fetchData() {
      // First fetch the judge to get eventId
      const judgeRes = await fetch(getApiUrl(`/api/admin/judges`));
      const judgeData = await judgeRes.json();
      const foundJudge = judgeData.find((j: { id: number }) => j.id.toString() === judgeId);
      if (!foundJudge) return;
      setJudge(foundJudge);

      // Fetch the event for this judge
      const eventRes = await fetch(getApiUrl(`/api/admin/events/active?eventId=${foundJudge.eventId}`));
      const eventData = await eventRes.json();
      if (!eventData.length) return;
      setEvent(eventData[0]);

      const contestantsRes = await fetch(getApiUrl(`/api/admin/contestants?eventId=${foundJudge.eventId}`));
      const allContestants = await contestantsRes.json();
      setContestants(allContestants);

      // Apply finalist filtering if in final phase and conditions are met
      if (eventData[0].currentPhase === 'FINAL' && eventData[0].hasTwoPhases && eventData[0].finalistsCount) {
        const finalists = await determineFinalists(foundJudge.eventId, eventData[0].finalistsCount, eventData[0].separateGenders, allContestants, eventData[0].tieBreakingStrategy);
        setFilteredContestants(finalists);
      } else {
        setFilteredContestants(allContestants);
      }

      const criteriaRes = await fetch(getApiUrl(`/api/admin/criteria?eventId=${foundJudge.eventId}&phase=${eventData[0]?.currentPhase || 'PRELIMINARY'}`));
      setCriteria(await criteriaRes.json());
      setLoading(false);
    }
    if (judgeId) {
      fetchData();
      // Ensure judgeId is string or number, not array
      const id = Array.isArray(judgeId) ? judgeId[0] : judgeId;
      connectJudgeSocket(id);
    }
    // On unmount, disconnect socket
    return () => {
      disconnectJudgeSocket();
    };
  }, [judgeId, determineFinalists]);

  // Join event room and listen for phase changes when event is loaded
  useEffect(() => {
    if (!event?.id || !judgeId) return;

    console.log("Setting up socket for judge:", judgeId, "event:", event.id);
    const socket = connectJudgeSocket(Array.isArray(judgeId) ? judgeId[0] : judgeId);
    joinEventRoom(event.id);

    const handlePhaseChanged = (data: { currentPhase: string }) => {
      console.log("Phase changed event received:", data);
      setEvent(prev => prev ? { ...prev, currentPhase: data.currentPhase } : null);
    };

    const handleJudgeLockChanged = (data: { judgeId: number; phase: string; locked: boolean }) => {
      console.log("Judge lock changed event received:", data);
      // Only update if this event is for the current judge
      if (judgeId && parseInt(judgeId.toString()) === data.judgeId) {
        const fieldName = data.phase === 'PRELIMINARY' ? 'lockedPreliminary' : 'lockedFinal';
        setJudge(prev => prev ? { ...prev, [fieldName]: data.locked } : null);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connecting', handleConnecting);
    socket.on('phase-changed', handlePhaseChanged);
    socket.on('judge-lock-changed', handleJudgeLockChanged);

    // Check if socket is already connected when we set up listeners
    if (socket.connected) {
      console.log("Socket was already connected");
      setConnectionStatus('connected');
    }

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connecting', handleConnecting);
      socket.off('phase-changed', handlePhaseChanged);
      socket.off('judge-lock-changed', handleJudgeLockChanged);
    };
  }, [event?.id, judgeId, handleConnect, handleDisconnect, handleConnecting]);

  // Refetch criteria when phase changes
  useEffect(() => {
    async function fetchCriteria() {
      if (!event?.id) return;
      const criteriaRes = await fetch(getApiUrl(`/api/admin/criteria?eventId=${event.id}&phase=${event.currentPhase}`));
      setCriteria(await criteriaRes.json());
    }
    fetchCriteria();
  }, [event?.currentPhase, event?.id]);

  // Update filtered contestants when event changes
  useEffect(() => {
    if (!event || !contestants.length) return;

    if (event.currentPhase === 'FINAL' && event.hasTwoPhases && event.finalistsCount) {
      determineFinalists(event.id, event.finalistsCount, event.separateGenders, contestants, event.tieBreakingStrategy)
        .then(finalists => setFilteredContestants(finalists));
    } else {
      setFilteredContestants(contestants);
    }
  }, [event, contestants, determineFinalists]);

  // Handle browser close, navigation away, and page visibility changes
  useEffect(() => {
    if (!judgeId) return;

    const handleBeforeUnload = async () => {
      // Call logout API to ensure server-side cleanup
      try {
        await fetch(getApiUrl(`/api/admin/judges/${judgeId}/logout`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true // Important: ensures request completes even if page is closing
        });
      } catch (error) {
        console.error('Error during beforeunload logout:', error);
      }
      disconnectJudgeSocket();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden (switched tabs, minimized, etc.)
        console.log('Page became hidden - judge may have navigated away');
        // Start a timer to logout if page stays hidden too long
        setTimeout(() => {
          if (document.hidden && judgeId) {
            console.log('Page has been hidden for 2 minutes - logging out judge');
            fetch(getApiUrl(`/api/admin/judges/${judgeId}/logout`), {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            }).catch(console.error);
            disconnectJudgeSocket();
          }
        }, 2 * 60 * 1000); // 2 minutes (reduced from 5)
      } else {
        // Page became visible again
        console.log('Page became visible - judge returned');
      }
    };

    const handlePageHide = async () => {
      // Modern browsers prefer 'pagehide' over 'beforeunload'
      try {
        await fetch(getApiUrl(`/api/admin/judges/${judgeId}/logout`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true
        });
      } catch (error) {
        console.error('Error during pagehide logout:', error);
      }
      disconnectJudgeSocket();
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clean up event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [judgeId]);

  // Fetch and prefill existing scores for this judge/event
  useEffect(() => {
    async function fetchScores() {
      if (!judgeId || !event?.id) return;
      const res = await fetch(getApiUrl(`/api/score?judgeId=${judgeId}&eventId=${event.id}&phase=${event.currentPhase}`));
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const prefill: Record<string, string> = {};
        data.forEach((s: { contestantId: number; criteriaId: number; value: number }) => {
          prefill[`${s.contestantId}_${s.criteriaId}`] = s.value.toString();
        });
        setScores(prefill);
      }
    }
    fetchScores();
    // Only run when judgeId, event, or phase changes
  }, [judgeId, event?.id, event?.currentPhase]);

  // Auto set value for auto sub-criteria
  useEffect(() => {
    // Only run after contestants and criteria are loaded
    if (contestants.length && criteria.length) {
      const autoScores: Record<string, string> = {};
      criteria.forEach(main => {
        main.subCriterias.forEach(sub => {
          if (sub.autoAssignToAllContestants) {
            contestants.forEach(contestant => {
              // For now, set to sub.weight as a default (can be changed as needed)
              autoScores[`${contestant.id}_${sub.id}`] = sub.weight.toString();
            });
          }
        });
      });
      setScores(prev => ({ ...autoScores, ...prev }));
    }
  }, [contestants, criteria]);

  // Local storage key for autosave
  const localStorageKey = event && judge ? `score-autosave-event-${event.id}-judge-${judge.id}` : null;

  // Load autosaved scores from localStorage on mount or when event/judge changes
  useEffect(() => {
    if (!localStorageKey) return;
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setScores(prev => ({ ...prev, ...parsed }));
        }
      } catch { }
    }
  }, [localStorageKey]);

  // Autosave scores to localStorage whenever they change
  useEffect(() => {
    if (!localStorageKey) return;
    localStorage.setItem(localStorageKey, JSON.stringify(scores));
  }, [scores, localStorageKey]);

  // Clear autosave on successful submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { contestantId: number; subCriteriaId: number; value: number }[] = [];
    mainGroups.forEach(main => {
      main.subCriterias.forEach(sub => {
        contestants.forEach(contestant => {
          // Only include scores for visible contestants and sub-criteria
          const val = scores[`${contestant.id}_${sub.id}`];
          if (val !== undefined && val !== "") {
            payload.push({
              contestantId: contestant.id,
              subCriteriaId: sub.id,
              value: parseFloat(val),
            });
          }
        });
      });
    });
    // Only send the current payload (visible/active scores)
    const res = await fetch(getApiUrl("/api/score"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judgeId,
        eventId: event?.id,
        scores: payload,
        phase: event?.currentPhase,
      }),
    });
    if (res.ok) {
      if (localStorageKey) localStorage.removeItem(localStorageKey);
      toast.success("Scores submitted!");
    } else {
      toast.error("Failed to submit scores");
    }
  };

  // Remove unused allSubCriterias and fix variable scoping
  // mainGroups and contestants are defined in the render scope
  // Move mainGroups definition inside the render function

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!event || !judge || !criteria.length || !contestants.length) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Group sub-criteria by main criteria for table columns
  const mainGroups = criteria.map(main => ({
    id: main.id,
    name: main.name,
    totalWeight: main.subCriterias.reduce((sum, s) => sum + (s.weight || 0), 0),
    subCriterias: main.subCriterias,
  }));

  // Add back handleScoreChange for input fields
  const handleScoreChange = (contestantId: number, subCriteriaId: number, value: string) => {
    setScores(prev => ({ ...prev, [`${contestantId}_${subCriteriaId}`]: value }));
  };

  // Helper function to get current lock status
  const isJudgeLocked = () => {
    if (!judge || !event) return false;
    return event.currentPhase === 'PRELIMINARY' ? judge.lockedPreliminary : judge.lockedFinal;
  };

  // Logout handler
  const handleLogout = async () => {
    if (judgeId) {
      // Call the logout API to ensure server-side cleanup
      try {
        await fetch(getApiUrl(`/api/admin/judges/${judgeId}/logout`), {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
      
      // Also disconnect the socket locally
      disconnectJudgeSocket();
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      window.location.href = basePath + "/";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-background p-2">
      <Card className="w-full max-w-7xl mx-auto p-4 flex flex-col gap-1 shadow-xl overflow-x-auto h-[95vh]">
        <div className="flex flex-row items-start justify-between w-full mb-4">
          <div className="flex-1 text-left text-base text-muted-foreground font-medium">
            Judge: <span className="text-primary font-semibold">{judge?.name}</span>
          </div>
          <div className="flex-2 flex justify-center">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                {event.name}
              </h1>
              <div className="text-sm text-muted-foreground">
                {event.hasTwoPhases && <>Current Phase: {event.currentPhase === 'PRELIMINARY' ? 'Preliminary Round' : 'Final Round'}</>}
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1 text-xs">
              <div 
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}
                title={
                  connectionStatus === 'connected' ? 'Connected' :
                  connectionStatus === 'connecting' ? 'Connecting...' :
                  'Disconnected'
                }
              />
              <span className={`${
                connectionStatus === 'connected' ? 'text-green-600' : 
                connectionStatus === 'connecting' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? 'Online' : 
                 connectionStatus === 'connecting' ? 'Connecting' : 
                 'Offline'}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
        {isJudgeLocked() && (
          <div className="text-center text-destructive font-semibold text-lg">Your scores are locked and cannot be modified.</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
            <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
              <thead className="sticky top-0 bg-background z-10">
                <tr>
                  <th className="border-b-2 border-muted p-2 text-center align-bottom" rowSpan={2}>Contestant #</th>
                  {mainGroups.map((main, mainIdx) => (
                    <th
                      key={main.id}
                      colSpan={main.subCriterias.length}
                      className={["border-b-2 border-muted p-2 text-center align-bottom", mainIdx === 0 ? "border-l-2 border-muted" : "", mainIdx === mainGroups.length - 1 ? "border-r-2 border-muted" : "", mainIdx !== 0 ? "border-l-2 border-muted" : ""].join(" ")}
                    >
                      <div className="font-semibold">{main.name}</div>
                      <div className="text-xs text-muted-foreground">({main.totalWeight}%)</div>
                    </th>
                  ))}
                  <th className="border-b-2 border-muted p-2 text-center align-bottom" rowSpan={2}>Total Score</th>
                </tr>
                <tr>
                  {mainGroups.map((main, mainIdx) => (
                    main.subCriterias.map((sub, subIdx) => (
                      <th
                        key={sub.id}
                        className={["border-b-2 border-muted p-2 text-center font-normal", (mainIdx === 0 && subIdx === 0) ? "border-l-2 border-muted" : "", (mainIdx === mainGroups.length - 1 && subIdx === main.subCriterias.length - 1) ? "border-r-2 border-muted" : "", mainIdx !== 0 && subIdx === 0 ? "border-l-2 border-muted" : ""].join(" ")}
                      >
                        {sub.name}<br />
                        <span className="text-xs text-muted-foreground">({sub.weight}%)</span>
                        {sub.autoAssignToAllContestants && <span className="text-xs text-primary"> (Auto)</span>}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group contestants by gender if separateGenders is enabled
                  const sortedContestants = [...filteredContestants].sort((a, b) => {
                    // Sort by sex first (MALE before FEMALE, undefined/null last)
                    const sexOrder = { MALE: 0, FEMALE: 1 };
                    const aSex = sexOrder[a.sex as keyof typeof sexOrder] ?? 2;
                    const bSex = sexOrder[b.sex as keyof typeof sexOrder] ?? 2;

                    if (aSex !== bSex) {
                      return aSex - bSex;
                    }

                    // Then sort by number
                    return a.number - b.number;
                  });

                  if (!event?.separateGenders) {
                    // Render without gender grouping
                    return sortedContestants.map(contestant => {
                      // Calculate total score for this contestant (simple sum)
                      let total = 0;
                      mainGroups.forEach(main => {
                        main.subCriterias.forEach(sub => {
                          const val = parseFloat(scores[`${contestant.id}_${sub.id}`] || "0");
                          total += isNaN(val) ? 0 : val;
                        });
                      });

                      // Determine row background based on gender
                      const rowClass = contestant.sex === 'MALE'
                        ? 'bg-blue-50 dark:bg-blue-950/20'
                        : contestant.sex === 'FEMALE'
                          ? 'bg-pink-50 dark:bg-pink-950/20'
                          : '';

                      return (
                        <tr key={contestant.id} className={rowClass}>
                          <td className="border-b-2 border-muted p-1 font-mono whitespace-nowrap text-xs text-center">
                            {event?.separateGenders && contestant.sex ? `${contestant.sex.charAt(0)}-` : ''}#{contestant.number}
                          </td>
                          {mainGroups.map((main, mainIdx) => (
                            main.subCriterias.map((sub, subIdx) => (
                              <td
                                key={sub.id}
                                className={["border-b-2 border-muted p-1 text-center", (mainIdx === 0 && subIdx === 0) ? "border-l-2 border-muted" : "", (mainIdx === mainGroups.length - 1 && subIdx === main.subCriterias.length - 1) ? "border-r-2 border-muted" : "", mainIdx !== 0 && subIdx === 0 ? "border-l-2 border-muted" : ""].join(" ")}
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  max={sub.weight}
                                  step={0.01}
                                  className="w-full h-8 px-1 py-0 text-xs text-center"
                                  value={scores[`${contestant.id}_${sub.id}`] || ""}
                                  onChange={e => {
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
                                  required={!sub.autoAssignToAllContestants}
                                  disabled={sub.autoAssignToAllContestants || isJudgeLocked()}
                                />
                              </td>
                            ))
                          ))}
                          <td className="border-b-2 border-muted p-1 text-center font-bold text-xs">{total.toFixed(2)}</td>
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
                    const contestants = genderGroups[gender] || [];
                    if (contestants.length === 0) return [];

                    const rows = [];

                    // Add gender header row
                    rows.push(
                      <tr key={`header-${gender}`} className="bg-muted/50">
                        <td
                          colSpan={1 + mainGroups.reduce((sum, main) => sum + main.subCriterias.length, 0) + 1}
                          className="border-b-2 border-muted p-3 text-center font-bold text-sm"
                        >
                          {genderLabels[gender as keyof typeof genderLabels]}
                        </td>
                      </tr>
                    );

                    // Add contestant rows
                    contestants.forEach(contestant => {
                      // Calculate total score for this contestant (simple sum)
                      let total = 0;
                      mainGroups.forEach(main => {
                        main.subCriterias.forEach(sub => {
                          const val = parseFloat(scores[`${contestant.id}_${sub.id}`] || "0");
                          total += isNaN(val) ? 0 : val;
                        });
                      });

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
                          {mainGroups.map((main, mainIdx) => (
                            main.subCriterias.map((sub, subIdx) => (
                              <td
                                key={sub.id}
                                className={["border-b-2 border-muted p-1 text-center", (mainIdx === 0 && subIdx === 0) ? "border-l-2 border-muted" : "", (mainIdx === mainGroups.length - 1 && subIdx === main.subCriterias.length - 1) ? "border-r-2 border-muted" : "", mainIdx !== 0 && subIdx === 0 ? "border-l-2 border-muted" : ""].join(" ")}
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  max={sub.weight}
                                  step={0.01}
                                  className="w-full h-8 px-1 py-0 text-xs text-center"
                                  value={scores[`${contestant.id}_${sub.id}`] || ""}
                                  onChange={e => {
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
                                  required={!sub.autoAssignToAllContestants}
                                  disabled={sub.autoAssignToAllContestants || isJudgeLocked()}
                                />
                              </td>
                            ))
                          ))}
                          <td className="border-b-2 border-muted p-1 text-center font-bold text-xs">{total.toFixed(2)}</td>
                        </tr>
                      );
                    });

                    return rows;
                  });
                })()}
              </tbody>
            </table>
          </div>
          <Button type="submit" className="self-end" disabled={isJudgeLocked()}>Submit Scores</Button>
        </form>
      </Card>
    </div>
  );
}