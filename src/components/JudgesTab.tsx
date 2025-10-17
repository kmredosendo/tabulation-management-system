"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Edit, Trash2, Plus, UserCheck, X } from "lucide-react";
import "../app/admin/events/[id]/judge-indicator.css";

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
};

interface JudgesTabProps {
  event: Event;
  judges: Judge[];
  judgesLoading: boolean;
  onRefreshJudges: () => void;
  activeJudges?: number[];
}

export function JudgesTab({ event, judges, judgesLoading, onRefreshJudges, activeJudges = [] }: JudgesTabProps) {

  const getNextJudgeNumber = () => {
    if (judges.length === 0) return 1;
    const maxNumber = Math.max(...judges.map(j => j.number));
    return maxNumber + 1;
  };

  // Refs for auto-focusing
  const judgeNameInputRef = useRef<HTMLInputElement>(null);

  // Add Judge Dialog
  const [addJudgeOpen, setAddJudgeOpen] = useState(false);
  const [newJudgeNumber, setNewJudgeNumber] = useState("");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [addJudgeError, setAddJudgeError] = useState("");

  // Edit Judge Dialog
  const [editJudgeOpen, setEditJudgeOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [editJudgeNumber, setEditJudgeNumber] = useState("");
  const [editJudgeName, setEditJudgeName] = useState("");
  const [editJudgeError, setEditJudgeError] = useState("");

  // Delete Judge Dialog
  const [deleteJudgeOpen, setDeleteJudgeOpen] = useState(false);
  const [deletingJudge, setDeletingJudge] = useState<Judge | null>(null);

  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddJudgeError("");
    if (!event?.id) return;

    const res = await fetch(getApiUrl(`/api/admin/judges?eventId=${event.id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: newJudgeNumber,
        name: newJudgeName,
        eventId: event.id
      }),
    });

    if (res.ok) {
      const addedNumber = parseInt(newJudgeNumber);
      setNewJudgeNumber((addedNumber + 1).toString());
      setNewJudgeName("");
      setAddJudgeError("");
      onRefreshJudges();
      toast.success("Judge added successfully");
      // Focus the name input for the next judge
      setTimeout(() => judgeNameInputRef.current?.focus(), 100);
    } else {
      setAddJudgeError("Failed to add judge");
      toast.error("Failed to add judge");
    }
  };

  const openEditJudge = (judge: Judge) => {
    setEditingJudge(judge);
    setEditJudgeNumber(judge.number.toString());
    setEditJudgeName(judge.name);
    setEditJudgeOpen(true);
  };

  const handleEditJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJudge) return;
    setEditJudgeError("");

    const res = await fetch(getApiUrl(`/api/admin/judges/${editingJudge.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: editJudgeNumber,
        name: editJudgeName
      }),
    });

    if (res.ok) {
      setEditJudgeOpen(false);
      setEditingJudge(null);
      onRefreshJudges();
      toast.success("Judge updated successfully");
    } else {
      setEditJudgeError("Failed to update judge");
      toast.error("Failed to update judge");
    }
  };

  const handleDeleteJudge = async () => {
    if (!deletingJudge) return;

    const res = await fetch(getApiUrl(`/api/admin/judges/${deletingJudge.id}`), {
      method: "DELETE",
    });

    if (res.ok) {
      setDeleteJudgeOpen(false);
      setDeletingJudge(null);
      onRefreshJudges();
      toast.success("Judge deleted successfully");
    } else {
      toast.error("Failed to delete judge");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <UserCheck className="w-5 h-5 hidden md:flex" />
            <span className="hidden md:inline">Judges ({judges.length})</span>
          </div>
          <Dialog open={addJudgeOpen} onOpenChange={(open) => {
            setAddJudgeOpen(open);
            if (open) {
              setNewJudgeNumber(getNextJudgeNumber().toString());
              setNewJudgeName("");
              setAddJudgeError("");
            } else {
              setNewJudgeNumber("");
              setNewJudgeName("");
              setAddJudgeError("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Judge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Judge
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddJudge} className="space-y-4">
                <div>
                  <Input
                    placeholder="Name"
                    value={newJudgeName}
                    onChange={e => setNewJudgeName(e.target.value)}
                    required
                    ref={judgeNameInputRef}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Number"
                    type="number"
                    value={newJudgeNumber}
                    onChange={e => setNewJudgeNumber(e.target.value)}
                    required
                  />
                </div>
                {addJudgeError && (
                  <div className="text-destructive text-sm">{addJudgeError}</div>
                )}
                <div className="flex gap-2 justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Judge
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {judgesLoading ? (
          <div className="text-center py-8">Loading judges...</div>
        ) : judges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No judges found</div>
        ) : (
          <ul className="space-y-2">
            {judges.map(judge => (
              <li key={judge.id} className="flex items-center justify-between p-3 border rounded">
                <div className="font-semibold flex items-center gap-2">
                  {/* Active indicator */}
                  <span
                    title={activeJudges.includes(judge.id) ? "Active" : "Inactive"}
                    className={
                      `judge-indicator ${activeJudges.includes(judge.id) ? "active" : "inactive"}`
                    }
                  />
                  #{judge.number} {judge.name}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditJudge(judge)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeletingJudge(judge);
                      setDeleteJudgeOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit Judge Dialog */}
      <Dialog open={editJudgeOpen} onOpenChange={(open) => {
        setEditJudgeOpen(open);
        if (!open) {
          setEditingJudge(null);
          setEditJudgeNumber("");
          setEditJudgeName("");
          setEditJudgeError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Judge
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditJudge} className="space-y-4">
            <div>
              <Input
                placeholder="Name"
                value={editJudgeName}
                onChange={e => setEditJudgeName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                placeholder="Number"
                type="number"
                value={editJudgeNumber}
                onChange={e => setEditJudgeNumber(e.target.value)}
                required
              />
            </div>
            {editJudgeError && (
              <div className="text-destructive text-sm">{editJudgeError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                <Edit className="w-4 h-4 mr-2" />
                Update Judge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Judge Dialog */}
      <AlertDialog open={deleteJudgeOpen} onOpenChange={setDeleteJudgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Judge
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p>Are you sure you want to delete judge &quot;{deletingJudge?.name}&quot;?</p>
          <p className="text-destructive font-semibold">This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJudge} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}