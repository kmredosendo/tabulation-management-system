"use client";

import React from 'react';
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import { useActiveJudges } from "@/lib/useActiveJudges";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

interface Event {
  id: number;
  name: string;
  date: string;
}

interface Judge {
  id: number;
  number: number;
  name: string;
}

export default function Home() {
	const [events, setEvents] = useState<Event[]>([]);
	const [selectedEventId, setSelectedEventId] = useState<string>("");
	const [judges, setJudges] = useState<Judge[]>([]);
	const [selectedJudge, setSelectedJudge] = useState<string>("");
	const activeJudges = useActiveJudges(5000, true).map(String);
	const router = useRouter();

	useEffect(() => {
		async function loadActiveEvents() {
			const res = await fetch(getApiUrl("/api/admin/events/active"));
			const eventsData = await res.json();
			setEvents(eventsData);
		}
		loadActiveEvents();
	}, []);

	const handleEventSelect = async (eventId: string) => {
		setSelectedEventId(eventId);
		setSelectedJudge(""); // Reset judge selection
		if (eventId) {
			const judgesRes = await fetch(getApiUrl(`/api/admin/judges?eventId=${eventId}`));
			const judgesData = await judgesRes.json();
			setJudges(judgesData);
		} else {
			setJudges([]);
		}
	};

	const handleJudgeSelect = async (value: string) => {
		setSelectedJudge(value);
		if (value) {
			if (activeJudges.includes(value)) {
				toast.error("This judge account is already active in another session.");
				return;
			}
			router.push(`/score/${value}`);
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
			<Card className="w-full max-w-4xl mx-auto p-8 flex flex-col items-center gap-8 shadow-xl">
				<h1 className="text-3xl sm:text-4xl font-bold text-center text-primary drop-shadow mb-2">
					Tabulation System
				</h1>
				<div className="w-full flex flex-col items-center gap-4">
					<div className="text-lg font-medium text-center mb-2">Select Event</div>
					{events.length === 0 ? (
						<div className="text-center text-muted-foreground py-8">No active events found.</div>
					) : (
						<div className="flex flex-wrap justify-center gap-4 w-full max-w-3xl">
							{events.map((event) => (
								<Card
									key={event.id}
									className={`transition-all border shadow-sm p-4 cursor-pointer hover:shadow-md w-80
										${selectedEventId === event.id.toString() ? 'border-green-400 bg-green-50/60' : 'bg-background'}
									`}
									onClick={() => handleEventSelect(event.id.toString())}
								>
									<CardHeader className="p-0 gap-0">
										<CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
											<Trophy className="w-5 h-5" />
											<span>{event.name}</span>
										</CardTitle>
									</CardHeader>
								</Card>
							))}
						</div>
					)}
					{selectedEventId && (
						<>
							<div className="text-lg font-medium text-center mb-4">Select Judge</div>
							{judges.length === 0 ? (
								<div className="text-center text-muted-foreground py-8">No judges found for this event.</div>
							) : (
								<div className="flex flex-wrap justify-center gap-4 w-full max-w-3xl">
									{judges.map((judge) => (
										<Card
											key={judge.id}
											className={`transition-all border shadow-sm p-4 cursor-pointer hover:shadow-md w-48
												${selectedJudge === judge.id.toString() ? 'border-green-400 bg-green-50/60' : 'bg-background'}
											`}
											onClick={() => handleJudgeSelect(judge.id.toString())}
										>
											<CardHeader className="p-0 gap-0">
												<CardTitle className="text-base font-semibold text-primary text-center">
													{judge.name}
												</CardTitle>
											</CardHeader>
										</Card>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</Card>
		</div>
	);
}
