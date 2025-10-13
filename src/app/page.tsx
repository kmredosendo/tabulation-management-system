"use client";

import React from 'react';
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
	const [activeJudges, setActiveJudges] = useState<string[]>([]);
	useEffect(() => {
		fetch(getApiUrl("/api/active-judges"))
			.then((res) => res.json())
			.then((data) => setActiveJudges((data.activeJudges || []).map(String)))
			.catch(() => setActiveJudges([]));
	}, []);
	const router = useRouter();

	useEffect(() => {
		async function loadActiveEvents() {
			const res = await fetch(getApiUrl("/api/admin/events/active"));
			const eventsData = await res.json();
			setEvents(eventsData);
		}
		loadActiveEvents();
	}, []);

	const handleEventSelect = async (value: string) => {
		setSelectedEventId(value);
		setSelectedJudge(""); // Reset judge selection
		if (value) {
			const judgesRes = await fetch(getApiUrl(`/api/admin/judges?eventId=${value}`));
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
			<Card className="w-full max-w-xl mx-auto p-8 flex flex-col items-center gap-8 shadow-xl">
				<h1 className="text-3xl sm:text-4xl font-bold text-center text-primary drop-shadow mb-2">
					Tabulation System
				</h1>
				<div className="w-full flex flex-col items-center gap-4">
					<div className="text-lg font-medium text-center mb-2">Select Event</div>
					<Select value={selectedEventId} onValueChange={handleEventSelect} disabled={events.length === 0}>
						<SelectTrigger className="w-64">
							<SelectValue placeholder="Choose an event..." />
						</SelectTrigger>
						<SelectContent>
							{events.map((event) => (
								<SelectItem key={event.id} value={event.id.toString()}>
									{event.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{selectedEventId && (
						<>
							<div className="text-lg font-medium text-center mb-2">Select Judge</div>
							<Select value={selectedJudge} onValueChange={handleJudgeSelect} disabled={judges.length === 0}>
								<SelectTrigger className="w-64">
									<SelectValue placeholder="Choose a judge..." />
								</SelectTrigger>
								<SelectContent>
									{judges.map((judge) => (
										<SelectItem key={judge.id} value={judge.id.toString()}>
											Judge #{judge.number} - {judge.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</>
					)}
				</div>
			</Card>
		</div>
	);
}
