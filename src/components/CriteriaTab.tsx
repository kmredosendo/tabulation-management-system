"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { ListChecks, Edit, Trash2, Plus, X } from "lucide-react";

type Event = {
  id: number;
  name: string;
  date: string;
  institutionName?: string;
  institutionAddress?: string;
  venue?: string;
  status: string;
  hasTwoPhases?: boolean;
};

type SubCriteria = {
  id: number;
  name: string;
  weight: number;
  autoAssignToAllContestants: boolean;
};

type MainCriteria = {
  id: number;
  name: string;
  identifier?: string;
  phase?: string;
  subCriterias: SubCriteria[];
};

interface CriteriaTabProps {
  event: Event;
  currentPhase?: string;
}

export function CriteriaTab({ event, currentPhase = "PRELIMINARY" }: CriteriaTabProps) {
  // Criteria state
  const [criterias, setCriterias] = useState<MainCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [selectedViewPhase, setSelectedViewPhase] = useState<string>(currentPhase);

  // Add Main Criteria Dialog
  const [addMainCriteriaOpen, setAddMainCriteriaOpen] = useState(false);
  const [newMainCriteriaName, setNewMainCriteriaName] = useState("");
  const [newMainCriteriaIdentifier, setNewMainCriteriaIdentifier] = useState("");
  const [newMainCriteriaPhase, setNewMainCriteriaPhase] = useState("PRELIMINARY");
  const [addMainCriteriaError, setAddMainCriteriaError] = useState("");

  // Add Sub Criteria Dialog
  const [addSubCriteriaOpen, setAddSubCriteriaOpen] = useState<number | null>(null);
  const [newSubCriteriaName, setNewSubCriteriaName] = useState("");
  const [newSubCriteriaWeight, setNewSubCriteriaWeight] = useState("");
  const [newSubCriteriaAuto, setNewSubCriteriaAuto] = useState(false);
  const [addSubCriteriaError, setAddSubCriteriaError] = useState("");

  // Edit Main Criteria Dialog
  const [editMainCriteriaOpen, setEditMainCriteriaOpen] = useState(false);
  const [editingMainCriteria, setEditingMainCriteria] = useState<MainCriteria | null>(null);
  const [editMainCriteriaName, setEditMainCriteriaName] = useState("");
  const [editMainCriteriaIdentifier, setEditMainCriteriaIdentifier] = useState("");
  const [editMainCriteriaError, setEditMainCriteriaError] = useState("");

  // Edit Sub Criteria Dialog
  const [editSubCriteriaOpen, setEditSubCriteriaOpen] = useState(false);
  const [editingSubCriteria, setEditingSubCriteria] = useState<SubCriteria | null>(null);
  const [editSubCriteriaName, setEditSubCriteriaName] = useState("");
  const [editSubCriteriaWeight, setEditSubCriteriaWeight] = useState("");
  const [editSubCriteriaAuto, setEditSubCriteriaAuto] = useState(false);
  const [editSubCriteriaError, setEditSubCriteriaError] = useState("");

  // Delete Criteria Dialog
  const [deleteCriteriaOpen, setDeleteCriteriaOpen] = useState(false);
  const [deletingCriteria, setDeletingCriteria] = useState<MainCriteria | null>(null);

  // Delete Sub Criteria Dialog
  const [deleteSubCriteriaOpen, setDeleteSubCriteriaOpen] = useState(false);
  const [deletingSubCriteria, setDeletingSubCriteria] = useState<SubCriteria | null>(null);

  // Fetch all criteria (not filtered by phase)
  const fetchCriteria = useCallback(() => {
    if (!event?.id) return;
    setCriteriaLoading(true);
    fetch(getApiUrl(`/api/admin/criteria?eventId=${event.id}`))
      .then(res => res.json())
      .then(data => {
        setCriterias(Array.isArray(data) ? data : []);
        setCriteriaLoading(false);
      })
      .catch(() => {
        setCriterias([]);
        setCriteriaLoading(false);
      });
  }, [event?.id]);

  // Load criteria when component mounts or event changes
  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  // Calculate total weight for a specific phase
  const getTotalWeightForPhase = (phase: string) => {
    return criterias
      .filter(criteria => criteria.phase === phase)
      .reduce((sum, criteria) => sum + (criteria.subCriterias?.reduce((subSum, sub) => subSum + (sub.weight || 0), 0) || 0), 0);
  };

  const openEditMainCriteria = (criteria: MainCriteria) => {
    setEditingMainCriteria(criteria);
    setEditMainCriteriaName(criteria.name);
    setEditMainCriteriaIdentifier(criteria.identifier || "");
    setEditMainCriteriaOpen(true);
  };

  const openEditSubCriteria = (sub: SubCriteria) => {
    setEditingSubCriteria(sub);
    setEditSubCriteriaName(sub.name);
    setEditSubCriteriaWeight(sub.weight.toString());
    setEditSubCriteriaAuto(sub.autoAssignToAllContestants);
    setEditSubCriteriaOpen(true);
  };

  const handleEditMainCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMainCriteria) return;
    setEditMainCriteriaError("");

    const res = await fetch(getApiUrl(`/api/admin/criteria/${editingMainCriteria.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editMainCriteriaName,
        identifier: editMainCriteriaIdentifier
      }),
    });

    if (res.ok) {
      setEditMainCriteriaOpen(false);
      setEditingMainCriteria(null);
      fetchCriteria();
      toast.success("Main criteria updated successfully");
    } else {
      setEditMainCriteriaError("Failed to update main criteria");
      toast.error("Failed to update main criteria");
    }
  };

  const handleEditSubCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubCriteria) return;
    setEditSubCriteriaError("");

    const res = await fetch(getApiUrl(`/api/admin/criteria/sub/${editingSubCriteria.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editSubCriteriaName,
        weight: parseFloat(editSubCriteriaWeight),
        autoAssignToAllContestants: editSubCriteriaAuto
      }),
    });

    if (res.ok) {
      setEditSubCriteriaOpen(false);
      setEditingSubCriteria(null);
      fetchCriteria();
      toast.success("Sub-criteria updated successfully");
    } else {
      setEditSubCriteriaError("Failed to update sub-criteria");
      toast.error("Failed to update sub-criteria");
    }
  };

  const handleDeleteCriteria = async () => {
    if (!deletingCriteria) return;

    const res = await fetch(getApiUrl(`/api/admin/criteria/${deletingCriteria.id}`), {
      method: "DELETE",
    });

    if (res.ok) {
      setDeleteCriteriaOpen(false);
      setDeletingCriteria(null);
      fetchCriteria();
      toast.success("Criteria deleted successfully");
    } else {
      toast.error("Failed to delete criteria");
    }
  };

  const handleDeleteSubCriteria = async () => {
    if (!deletingSubCriteria) return;

    const res = await fetch(getApiUrl(`/api/admin/criteria/sub/${deletingSubCriteria.id}`), {
      method: "DELETE",
    });

    if (res.ok) {
      setDeleteSubCriteriaOpen(false);
      setDeletingSubCriteria(null);
      fetchCriteria();
      toast.success("Sub-criteria deleted successfully");
    } else {
      toast.error("Failed to delete sub-criteria");
    }
  };

  // Criteria handlers
  const handleAddMainCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMainCriteriaError("");
    if (!event?.id) return;

    const res = await fetch(getApiUrl("/api/admin/criteria"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newMainCriteriaName,
        identifier: newMainCriteriaIdentifier,
        eventId: event.id,
        phase: newMainCriteriaPhase
      }),
    });

    if (res.ok) {
      setAddMainCriteriaOpen(false);
      setNewMainCriteriaName("");
      setNewMainCriteriaIdentifier("");
      fetchCriteria();
      toast.success("Main criteria added successfully");
    } else {
      setAddMainCriteriaError("Failed to add main criteria");
      toast.error("Failed to add main criteria");
    }
  };

  const handleAddSubCriteria = async (e: React.FormEvent, mainCriteriaId: number) => {
    e.preventDefault();
    setAddSubCriteriaError("");

    const res = await fetch(getApiUrl("/api/admin/criteria/sub"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSubCriteriaName,
        weight: parseFloat(newSubCriteriaWeight),
        autoAssignToAllContestants: newSubCriteriaAuto,
        parentId: mainCriteriaId
      }),
    });

    if (res.ok) {
      setAddSubCriteriaOpen(null);
      setNewSubCriteriaName("");
      setNewSubCriteriaWeight("");
      setNewSubCriteriaAuto(false);
      fetchCriteria();
      toast.success("Sub-criteria added successfully");
    } else {
      setAddSubCriteriaError("Failed to add sub-criteria");
      toast.error("Failed to add sub-criteria");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 border-b flex-shrink-0 py-2 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <ListChecks className="w-5 h-5 hidden md:flex" />
            <span className="hidden md:inline">Criteria</span>
            {event?.hasTwoPhases && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                 {selectedViewPhase === "ALL" ? "All Phases" : selectedViewPhase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"}
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
                  <SelectItem value="ALL">All Phases</SelectItem>
                  <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Dialog open={addMainCriteriaOpen} onOpenChange={(open) => {
              setAddMainCriteriaOpen(open);
              if (!open) {
                setNewMainCriteriaName("");
                setNewMainCriteriaIdentifier("");
                setNewMainCriteriaPhase("PRELIMINARY");
                setAddMainCriteriaError("");
              } else {
                // When opening, default to the currently selected view phase
                setNewMainCriteriaPhase(selectedViewPhase === "ALL" ? "PRELIMINARY" : selectedViewPhase);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={getTotalWeightForPhase(selectedViewPhase) >= 100}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Main Criteria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Main Criteria
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMainCriteria} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Criteria Name"
                      value={newMainCriteriaName}
                      onChange={e => setNewMainCriteriaName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Select value={newMainCriteriaIdentifier} onValueChange={setNewMainCriteriaIdentifier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select identifier (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best-in-talent">Best in Talent</SelectItem>
                        <SelectItem value="best-in-interview">Best in Interview</SelectItem>
                        <SelectItem value="best-in-gown">Best in Gown</SelectItem>
                        <SelectItem value="best-in-swimsuit">Best in Swimsuit</SelectItem>
                        <SelectItem value="best-in-sportswear">Best in Sportswear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={newMainCriteriaPhase} onValueChange={setNewMainCriteriaPhase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                        <SelectItem value="FINAL">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {addMainCriteriaError && (
                    <div className="text-destructive text-sm">{addMainCriteriaError}</div>
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
                      Add Criteria
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {criteriaLoading ? (
          <div className="text-center py-8">Loading criteria...</div>
        ) : criterias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No criteria found</div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // Group criteria by phase
              const criteriaByPhase = criterias.reduce((acc, criteria) => {
                const phase = criteria.phase || "PRELIMINARY";
                if (!acc[phase]) acc[phase] = [];
                acc[phase].push(criteria);
                return acc;
              }, {} as Record<string, MainCriteria[]>);

              const phasesToShow = selectedViewPhase === "ALL" 
                ? ["PRELIMINARY", "FINAL"] 
                : [selectedViewPhase];

              return phasesToShow.map(phase => {
                const phaseCriteria = criteriaByPhase[phase] || [];
                if (phaseCriteria.length === 0) return null;

                const totalPercentage = phaseCriteria.reduce((sum, criteria) => sum + (criteria.subCriterias?.reduce((subSum, sub) => subSum + (sub.weight || 0), 0) || 0), 0);
                
                return (
                  <div key={phase} className="space-y-2">
                    {event?.hasTwoPhases && (
                      <h3 className="text-lg font-semibold text-center border-b pb-2">
                        {phase === "PRELIMINARY" ? "Preliminary Round" : "Final Round"} Criteria ({totalPercentage}%)
                      </h3>
                    )}
                    <ul className="space-y-2">
                      {phaseCriteria.map(criteria => {
                        const totalWeight = criteria.subCriterias?.reduce((sum, sub) => sum + (sub.weight || 0), 0) || 0;
                        return (
                          <li key={criteria.id} className="bg-background rounded border p-4">
                            <div className="font-semibold flex items-center justify-between">
                              <span>{criteria.name} {totalWeight > 0 && <span className="text-xs text-muted-foreground">({totalWeight}%)</span>} {criteria.identifier && <span className="text-xs text-muted-foreground">({criteria.identifier})</span>}</span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditMainCriteria(criteria)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingCriteria(criteria);
                                    setDeleteCriteriaOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {criteria.subCriterias && criteria.subCriterias.length > 0 && (
                              <ul className="ml-4 mt-2 space-y-1">
                                {criteria.subCriterias.map(sub => (
                                  <li key={sub.id} className="flex items-center justify-between">
                                    <span>{sub.name} <span className="text-xs text-muted-foreground">({sub.weight}%)</span> {sub.autoAssignToAllContestants && <span className="text-xs text-primary">(Auto)</span>}</span>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditSubCriteria(sub)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          setDeletingSubCriteria(sub);
                                          setDeleteSubCriteriaOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <Dialog open={addSubCriteriaOpen === criteria.id} onOpenChange={(open) => {
                              setAddSubCriteriaOpen(open ? criteria.id : null);
                              if (!open) {
                                setNewSubCriteriaName("");
                                setNewSubCriteriaWeight("");
                                setNewSubCriteriaAuto(false);
                                setAddSubCriteriaError("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="mt-2">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Sub-Criteria
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    Add Sub-Criteria
                                  </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={(e) => handleAddSubCriteria(e, criteria.id)} className="space-y-4">
                                  <div>
                                    <Input
                                      placeholder="Sub-criteria Name"
                                      value={newSubCriteriaName}
                                      onChange={e => setNewSubCriteriaName(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      type="number"
                                      placeholder="Weight (%)"
                                      value={newSubCriteriaWeight}
                                      onChange={e => setNewSubCriteriaWeight(e.target.value)}
                                      required
                                      min="0"
                                      max="100"
                                      step="0.1"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`auto-${criteria.id}`}
                                      checked={newSubCriteriaAuto}
                                      onChange={e => setNewSubCriteriaAuto(e.target.checked)}
                                    />
                                    <label htmlFor={`auto-${criteria.id}`} className="text-sm">
                                      Auto-assign to all contestants
                                    </label>
                                  </div>
                                  {addSubCriteriaError && (
                                    <div className="text-destructive text-sm">{addSubCriteriaError}</div>
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
                                      Add Sub-Criteria
                                    </Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Edit Main Criteria Dialog */}
      <Dialog open={editMainCriteriaOpen} onOpenChange={setEditMainCriteriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Main Criteria
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMainCriteria} className="space-y-4">
            <div>
              <Input
                placeholder="Criteria Name"
                value={editMainCriteriaName}
                onChange={e => setEditMainCriteriaName(e.target.value)}
                required
              />
            </div>
            <div>
              <Select value={editMainCriteriaIdentifier} onValueChange={setEditMainCriteriaIdentifier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select identifier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-in-talent">Best in Talent</SelectItem>
                  <SelectItem value="best-in-interview">Best in Interview</SelectItem>
                  <SelectItem value="best-in-gown">Best in Gown</SelectItem>
                  <SelectItem value="best-in-swimsuit">Best in Swimsuit</SelectItem>
                  <SelectItem value="best-in-sportswear">Best in Sportswear</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editMainCriteriaError && (
              <div className="text-destructive text-sm">{editMainCriteriaError}</div>
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
                Update Criteria
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub Criteria Dialog */}
      <Dialog open={editSubCriteriaOpen} onOpenChange={setEditSubCriteriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Sub-Criteria
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubCriteria} className="space-y-4">
            <div>
              <Input
                placeholder="Sub-criteria Name"
                value={editSubCriteriaName}
                onChange={e => setEditSubCriteriaName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Weight (%)"
                value={editSubCriteriaWeight}
                onChange={e => setEditSubCriteriaWeight(e.target.value)}
                required
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-auto"
                checked={editSubCriteriaAuto}
                onChange={e => setEditSubCriteriaAuto(e.target.checked)}
              />
              <label htmlFor="edit-auto" className="text-sm">
                Auto-assign to all contestants
              </label>
            </div>
            {editSubCriteriaError && (
              <div className="text-destructive text-sm">{editSubCriteriaError}</div>
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
                Update Sub-Criteria
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Main Criteria Dialog */}
      <AlertDialog open={deleteCriteriaOpen} onOpenChange={setDeleteCriteriaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Main Criteria
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete &quot;{deletingCriteria?.name}&quot;?</p>
            <p className="text-destructive font-semibold">This action cannot be undone.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCriteria} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sub Criteria Dialog */}
      <AlertDialog open={deleteSubCriteriaOpen} onOpenChange={setDeleteSubCriteriaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Sub-Criteria
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete &quot;{deletingSubCriteria?.name}&quot;?</p>
            <p className="text-destructive font-semibold">This action cannot be undone.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubCriteria} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
