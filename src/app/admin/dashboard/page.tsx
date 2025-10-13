"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast, Toaster } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Trophy, Edit, Trash2, Plus } from "lucide-react";

type EventSummary = {
  id: number;
  name: string;
  date: string;
  status: string;
  institutionName?: string;
  institutionAddress?: string;
  venue?: string;
};

export default function AdminDashboard() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventSummary | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editInstitutionName, setEditInstitutionName] = useState("");
  const [editInstitutionAddress, setEditInstitutionAddress] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editHasTwoPhases, setEditHasTwoPhases] = useState(false);
  const [editSeparateGenders, setEditSeparateGenders] = useState(false);
  const [editFinalistsCount, setEditFinalistsCount] = useState("");
  const [editFormError, setEditFormError] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventSummary | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const openEditDialog = async (event: EventSummary) => {
    setEditEvent(event);
    setEditEventName(event.name);
    setEditEventDate(event.date.slice(0, 10));
    setEditInstitutionName(event.institutionName || "");
    setEditInstitutionAddress(event.institutionAddress || "");
    setEditVenue(event.venue || "");
    
    // Fetch full event data to get the new fields
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${event.id}`));
      if (res.ok) {
        const fullEvent = await res.json();
        setEditHasTwoPhases(fullEvent.hasTwoPhases !== undefined ? fullEvent.hasTwoPhases : false);
        setEditSeparateGenders(fullEvent.separateGenders || false);
        setEditFinalistsCount(fullEvent.finalistsCount ? fullEvent.finalistsCount.toString() : "");
      }
    } catch (error) {
      console.error("Failed to fetch event details:", error);
      setEditHasTwoPhases(false);
      setEditSeparateGenders(false);
      setEditFinalistsCount("");
    }
    
    setEditFormError("");
    setEditDialogOpen(true);
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent) return;
    setEditFormError("");
    const res = await fetch(getApiUrl(`/api/admin/events/${editEvent.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: editEventName, 
        date: editEventDate, 
        institutionName: editInstitutionName, 
        institutionAddress: editInstitutionAddress, 
        venue: editVenue,
        hasTwoPhases: editHasTwoPhases,
        separateGenders: editSeparateGenders,
        finalistsCount: editFinalistsCount ? parseInt(editFinalistsCount) : undefined
      }),
    });
    if (res.ok) {
      setEditDialogOpen(false);
      setEditEvent(null);
      toast.success('Event updated successfully');
      setRefreshEvents(k => k + 1);
    } else {
      setEditFormError("Failed to update event");
      toast.error('Failed to update event');
    }
  };

  const handleDeleteClick = (event: EventSummary) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
    setDeleteConfirmInput("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    if (deleteConfirmInput !== eventToDelete.name) {
      setDeleteError("Event name does not match. Please type the event name exactly to confirm deletion.");
      return;
    }
    const res = await fetch(getApiUrl(`/api/admin/events/${eventToDelete.id}`), {
      method: "DELETE",
    });
    if (res.ok) {
      setEvents(events => events.filter(e => e.id !== eventToDelete.id));
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      setDeleteConfirmInput("");
      setDeleteError("");
      toast.success('Event deleted successfully');
      setRefreshEvents(k => k + 1);
    } else {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      setDeleteConfirmInput("");
      setDeleteError("");
      toast.error('Failed to delete event');
    }
  };
  const [refreshEvents, setRefreshEvents] = useState(0);
  const [open, setOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newInstitutionName, setNewInstitutionName] = useState("");
  const [newInstitutionAddress, setNewInstitutionAddress] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newHasTwoPhases, setNewHasTwoPhases] = useState(false);
  const [newSeparateGenders, setNewSeparateGenders] = useState(false);
  const [newFinalistsCount, setNewFinalistsCount] = useState("");
  const [formError, setFormError] = useState("");
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const res = await fetch(getApiUrl("/api/admin/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: newEventName, 
        date: newEventDate, 
        institutionName: newInstitutionName, 
        institutionAddress: newInstitutionAddress, 
        venue: newVenue,
        hasTwoPhases: newHasTwoPhases,
        separateGenders: newSeparateGenders,
        finalistsCount: newFinalistsCount ? parseInt(newFinalistsCount) : undefined
      }),
    });
    if (res.ok) {
      setOpen(false);
      setNewEventName("");
      setNewEventDate("");
      setNewInstitutionName("");
      setNewInstitutionAddress("");
      setNewVenue("");
      setNewHasTwoPhases(false);
      setNewSeparateGenders(false);
      setNewFinalistsCount("");
      setFormError("");
      toast.success('Event created successfully');
      const refreshed = await fetch(getApiUrl("/api/admin/events")).then(r => r.json());
      setEvents(refreshed);
    } else {
      setFormError("Failed to create event");
      toast.error('Failed to create event');
    }
  };
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const res = await fetch(getApiUrl("/api/admin/events")).then(r => r.json());
      setEvents(res);
      setLoading(false);
    }
    fetchEvents();
  }, [refreshEvents]);

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center py-10 px-2 sm:px-4 h-[90vh]">
      {/* Main Content */}
      <div className="w-full max-w-4xl h-full flex flex-col">
        <Card className="h-full min-h-0 flex flex-col">
          <CardHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b flex-shrink-0 flex justify-between items-center">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" /> Dashboard
              </CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <Plus className="w-4 h-4 mr-2" /> New Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-full">
                  <DialogHeader>
                    <DialogTitle>New Event</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEvent} className="space-y-4">
                    <div>
                      <Input
                        placeholder="Event Name"
                        value={newEventName}
                        onChange={e => setNewEventName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Institution Name"
                        value={newInstitutionName}
                        onChange={e => setNewInstitutionName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Institution Address"
                        value={newInstitutionAddress}
                        onChange={e => setNewInstitutionAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Venue"
                        value={newVenue}
                        onChange={e => setNewVenue(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="has-two-phases"
                        checked={newHasTwoPhases}
                        onCheckedChange={setNewHasTwoPhases}
                      />
                      <label htmlFor="has-two-phases" className="text-sm font-medium">
                        Contest has 2 phases (Preliminary and Final)
                      </label>
                    </div>
                    {newHasTwoPhases && (
                      <div>
                        <Input
                          type="number"
                          placeholder="Number of finalists advancing to final phase"
                          value={newFinalistsCount}
                          onChange={e => setNewFinalistsCount(e.target.value)}
                          min="1"
                          max="20"
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="separate-genders"
                        checked={newSeparateGenders}
                        onCheckedChange={setNewSeparateGenders}
                      />
                      <label htmlFor="separate-genders" className="text-sm font-medium">
                        Separate judging by gender (Male/Female)
                      </label>
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={newEventDate}
                        onChange={e => setNewEventDate(e.target.value)}
                        required
                      />
                    </div>
                    {formError && <div className="text-destructive text-sm">{formError}</div>}
                    <div className="flex gap-2 justify-end">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Create Event</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto h-[calc(90vh-180px)]">
            {loading ? (
              <div className="text-center py-8">Loading events...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.length === 0 ? (
                  <div className="col-span-2 text-center text-muted-foreground py-8">No events found.</div>
                ) : (
                  events.map(event => (
                    <Card
                      key={event.id}
                      className={`transition-all border shadow-sm p-2 cursor-pointer
                        ${event.status && event.status.toLowerCase() === 'active'
                          ? 'border-green-400 bg-green-50/60'
                          : 'bg-background'}
                      `}
                      onClick={() => {
                        // Don't navigate if any dialogs are open
                        if (editDialogOpen || deleteDialogOpen) return;
                        const basePath = typeof window !== 'undefined' ? window.location.pathname.split('/admin')[0] : '';
                        window.location.href = `${basePath}/admin/events/${event.id}`;
                      }}
                    >
                      <CardHeader className="p-1 pb-0 relative">
                        <div className="flex items-center gap-1">
                          <CardTitle className={`flex items-center gap-1 text-sm font-semibold
                            ${event.status && event.status.toLowerCase() === 'active' ? 'text-green-700' : 'text-foreground'}
                          `}>
                            {event.status && event.status.toLowerCase() === 'active' ? (
                              <Trophy className="w-4 h-4 text-green-600" />
                            ) : (
                              <Trophy className="w-4 h-4 text-primary" />
                            )}
                            <span>{event.name}</span>
                          </CardTitle>
                        </div>
                        <span
                          className={`absolute top-1 right-1 w-2 h-2 rounded-full
                            ${event.status && event.status.toLowerCase() === 'active'
                              ? 'bg-green-500'
                              : 'bg-gray-300'}
                          `}
                          title={event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : ''}
                        ></span>
                        <div className="mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={event.status && event.status.toUpperCase() === "ACTIVE" ? true : false}
                              onCheckedChange={async (checked) => {
                                try {
                                  const res = await fetch(getApiUrl(`/api/admin/events/${event.id}`), {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      name: event.name,
                                      date: event.date,
                                      status: checked ? "ACTIVE" : "INACTIVE"
                                    })
                                  });
                                  if (!res.ok) {
                                    throw new Error("Failed to update event status");
                                  }
                                  setRefreshEvents(k => k + 1);
                                } catch {
                                  toast.error("Failed to update event status");
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs ml-2">{event.status && event.status.toUpperCase() === "ACTIVE" ? "Active" : "Inactive"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" onClick={e => {e.stopPropagation(); openEditDialog(event);}} className="flex items-center gap-1" size="sm"><Edit className="w-4 h-4" /></Button>
                            <Button variant="destructive" onClick={e => {e.stopPropagation(); handleDeleteClick(event);}} size="sm"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        {/* Edit Event Dialog - only open for selected event */}
                        {editDialogOpen && editEvent?.id === event.id && (
                          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent className="max-w-md w-full">
                              <DialogHeader>
                                <DialogTitle>Edit Event</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleEditEvent} className="space-y-4">
                                <div>
                                  <Input
                                    placeholder="Event Name"
                                    value={editEventName}
                                    onChange={e => setEditEventName(e.target.value)}
                                    required
                                  />
                                </div>
                                <div>
                                  <Input
                                    placeholder="Institution Name"
                                    value={editInstitutionName}
                                    onChange={e => setEditInstitutionName(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Input
                                    placeholder="Institution Address"
                                    value={editInstitutionAddress}
                                    onChange={e => setEditInstitutionAddress(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Input
                                    placeholder="Venue"
                                    value={editVenue}
                                    onChange={e => setEditVenue(e.target.value)}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`edit-has-two-phases-${event.id}`}
                                    checked={editHasTwoPhases}
                                    onCheckedChange={setEditHasTwoPhases}
                                  />
                                  <label htmlFor={`edit-has-two-phases-${event.id}`} className="text-sm font-medium">
                                    Contest has 2 phases (Preliminary and Final)
                                  </label>
                                </div>
                                {editHasTwoPhases && (
                                  <div>
                                    <Input
                                      type="number"
                                      placeholder="Number of finalists advancing to final phase"
                                      value={editFinalistsCount}
                                      onChange={e => setEditFinalistsCount(e.target.value)}
                                      min="1"
                                      max="20"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`edit-separate-genders-${event.id}`}
                                    checked={editSeparateGenders}
                                    onCheckedChange={setEditSeparateGenders}
                                  />
                                  <label htmlFor={`edit-separate-genders-${event.id}`} className="text-sm font-medium">
                                    Separate judging by gender (Male/Female)
                                  </label>
                                </div>
                                <div>
                                  <Input
                                    type="date"
                                    value={editEventDate}
                                    onChange={e => setEditEventDate(e.target.value)}
                                    required
                                  />
                                </div>
                                {editFormError && <div className="text-destructive text-sm">{editFormError}</div>}
                                <div className="flex gap-2 justify-end">
                                  <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button type="submit">Save Changes</Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                        {/* Delete Confirmation Dialog - only open for selected event */}
                        {deleteDialogOpen && eventToDelete?.id === event.id && (
                          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <AlertDialogContent className="max-w-md w-full">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                              </AlertDialogHeader>
                              <div className="mb-2">
                                Are you sure you want to delete the event <span className="font-semibold">{eventToDelete?.name}</span>?<br />
                                <span className="text-destructive font-semibold">This will also permanently delete all contestants, judges, criteria, and scores for this event. This action cannot be undone.</span>
                              </div>
                              <div className="mb-2">
                                Please type <span className="font-mono font-semibold">{eventToDelete?.name}</span> to confirm:
                              </div>
                              <Input
                                value={deleteConfirmInput}
                                onChange={e => setDeleteConfirmInput(e.target.value)}
                                placeholder="Type event name to confirm"
                                autoFocus
                                className="mb-2"
                                disabled={!eventToDelete}
                              />
                              {deleteError && <div className="text-destructive text-sm mb-2">{deleteError}</div>}
                              <div className="flex gap-2 justify-end mt-2">
                                <AlertDialogCancel asChild>
                                  <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleConfirmDelete}
                                    disabled={!eventToDelete || deleteConfirmInput !== eventToDelete?.name}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}