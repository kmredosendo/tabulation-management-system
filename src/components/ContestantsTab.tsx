"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Edit, Trash2, Plus, Users, X } from "lucide-react";

type Contestant = {
  id: number;
  number: number;
  name: string;
  sex?: string;
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

interface ContestantsTabProps {
  event: Event;
}

export function ContestantsTab({ event }: ContestantsTabProps) {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [contestantsLoading, setContestantsLoading] = useState(false);

  // Refs for auto-focusing
  const contestantNameInputRef = useRef<HTMLInputElement>(null);

  const getNextContestantNumber = () => {
    if (contestants.length === 0) return 1;
    const maxNumber = Math.max(...contestants.map(c => c.number));
    return maxNumber + 1;
  };

  // Add Contestant Dialog
  const [addContestantOpen, setAddContestantOpen] = useState(false);
  const [newContestantNumber, setNewContestantNumber] = useState("");
  const [newContestantName, setNewContestantName] = useState("");
  const [newContestantSex, setNewContestantSex] = useState("");
  const [addContestantError, setAddContestantError] = useState("");

  // Edit Contestant Dialog
  const [editContestantOpen, setEditContestantOpen] = useState(false);
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null);
  const [editContestantNumber, setEditContestantNumber] = useState("");
  const [editContestantName, setEditContestantName] = useState("");
  const [editContestantSex, setEditContestantSex] = useState("");
  const [editContestantError, setEditContestantError] = useState("");

  // Delete Contestant Dialog
  const [deleteContestantOpen, setDeleteContestantOpen] = useState(false);
  const [deletingContestant, setDeletingContestant] = useState<Contestant | null>(null);

  const fetchContestants = useCallback(() => {
    if (!event?.id) return;
    setContestantsLoading(true);
    fetch(getApiUrl(`/api/admin/contestants?eventId=${event.id}`))
      .then(res => res.json())
      .then(data => {
        setContestants(data);
        setContestantsLoading(false);
      })
      .catch(() => {
        setContestants([]);
        setContestantsLoading(false);
      });
  }, [event?.id]);

  useEffect(() => {
    fetchContestants();
  }, [fetchContestants]);

  const handleAddContestant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddContestantError("");
    if (!event?.id) return;

    const res = await fetch(getApiUrl(`/api/admin/contestants?eventId=${event.id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: newContestantNumber,
        name: newContestantName,
        sex: newContestantSex,
        eventId: event.id
      }),
    });

    if (res.ok) {
      const addedNumber = parseInt(newContestantNumber);
      setNewContestantNumber((addedNumber + 1).toString());
      setNewContestantName("");
      setNewContestantSex("");
      setAddContestantError("");
      fetchContestants();
      toast.success("Contestant added successfully");
      // Focus the name input for the next contestant
      setTimeout(() => contestantNameInputRef.current?.focus(), 100);
    } else {
      setAddContestantError("Failed to add contestant");
      toast.error("Failed to add contestant");
    }
  };

  const openEditContestant = (contestant: Contestant) => {
    setEditingContestant(contestant);
    setEditContestantNumber(contestant.number.toString());
    setEditContestantName(contestant.name);
    setEditContestantSex(contestant.sex || "");
    setEditContestantOpen(true);
  };

  const handleEditContestant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContestant) return;
    setEditContestantError("");

    const res = await fetch(getApiUrl(`/api/admin/contestants/${editingContestant.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: editContestantNumber,
        name: editContestantName,
        sex: editContestantSex
      }),
    });

    if (res.ok) {
      setEditContestantOpen(false);
      setEditingContestant(null);
      fetchContestants();
      toast.success("Contestant updated successfully");
    } else {
      setEditContestantError("Failed to update contestant");
      toast.error("Failed to update contestant");
    }
  };

  const handleDeleteContestant = async () => {
    if (!deletingContestant) return;

    const res = await fetch(getApiUrl(`/api/admin/contestants/${deletingContestant.id}`), {
      method: "DELETE",
    });

    if (res.ok) {
      setDeleteContestantOpen(false);
      setDeletingContestant(null);
      fetchContestants();
      toast.success("Contestant deleted successfully");
    } else {
      toast.error("Failed to delete contestant");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Users className="w-5 h-5" />
            Contestants ({contestants.length})
          </div>
          <Dialog open={addContestantOpen} onOpenChange={(open) => {
            setAddContestantOpen(open);
            if (open) {
              setNewContestantNumber(getNextContestantNumber().toString());
              setNewContestantName("");
              setNewContestantSex("");
              setAddContestantError("");
            } else {
              setNewContestantNumber("");
              setNewContestantName("");
              setNewContestantSex("");
              setAddContestantError("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contestant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Contestant
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddContestant} className="space-y-4">
                <div>
                  <Input
                    placeholder="Name"
                    value={newContestantName}
                    onChange={e => setNewContestantName(e.target.value)}
                    required
                    ref={contestantNameInputRef}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Number"
                    type="number"
                    value={newContestantNumber}
                    onChange={e => setNewContestantNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Select value={newContestantSex} onValueChange={setNewContestantSex}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {addContestantError && (
                  <div className="text-destructive text-sm">{addContestantError}</div>
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
                    Add Contestant
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {contestantsLoading ? (
          <div className="text-center py-8">Loading contestants...</div>
        ) : contestants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No contestants found</div>
        ) : (
          <div className="space-y-2">
            {[...contestants].sort((a, b) => {
              // Sort by sex first (MALE before FEMALE, undefined/null last)
              const sexOrder = { MALE: 0, FEMALE: 1 };
              const aSex = sexOrder[a.sex as keyof typeof sexOrder] ?? 2;
              const bSex = sexOrder[b.sex as keyof typeof sexOrder] ?? 2;
              
              if (aSex !== bSex) {
                return aSex - bSex;
              }
              
              // Then sort by number
              return a.number - b.number;
            }).map(contestant => (
              <div key={contestant.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-semibold">#{contestant.number} {contestant.name}</span>
                  {contestant.sex && <span className="text-sm text-muted-foreground ml-2">({contestant.sex})</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditContestant(contestant)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeletingContestant(contestant);
                      setDeleteContestantOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Contestant Dialog */}
      <Dialog open={editContestantOpen} onOpenChange={(open) => {
        setEditContestantOpen(open);
        if (!open) {
          setEditingContestant(null);
          setEditContestantNumber("");
          setEditContestantName("");
          setEditContestantSex("");
          setEditContestantError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Contestant
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditContestant} className="space-y-4">
            <div>
              <Input
                placeholder="Name"
                value={editContestantName}
                onChange={e => setEditContestantName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                placeholder="Number"
                type="number"
                value={editContestantNumber}
                onChange={e => setEditContestantNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Select value={editContestantSex} onValueChange={setEditContestantSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editContestantError && (
              <div className="text-destructive text-sm">{editContestantError}</div>
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
                Update Contestant
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Contestant Dialog */}
      <AlertDialog open={deleteContestantOpen} onOpenChange={setDeleteContestantOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Contestant
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p>Are you sure you want to delete contestant &quot;{deletingContestant?.name}&quot;?</p>
          <p className="text-destructive font-semibold">This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContestant} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}