"use client";
import { getApiUrl } from "@/lib/api";

import { RawScoresTable } from "@/components/RawScoresTable";
import { PrintHeader } from "@/components/print-header";
import { PrintFooter } from "@/components/print-footer";
import * as React from "react";

export default function PrintRawScoresPage({ params, searchParams }: { params: Promise<{ id: string; judgeId: string }>; searchParams: Promise<{ phase?: string }> }) {
  const { id, judgeId } = React.use(params);
  const { phase } = React.use(searchParams);
  const [event, setEvent] = React.useState<{
    name: string;
    date: string;
    institutionName?: string;
    institutionAddress?: string;
    venue?: string;
  } | null>(null);
  const [judge, setJudge] = React.useState<{ name: string, number: string } | null>(null);

  React.useEffect(() => {
    fetch(getApiUrl(`/api/admin/events/${id}`))
      .then(res => res.json())
      .then(event => {
        if (event) {
          setEvent({
            name: event.name,
            date: event.date,
            institutionName: event.institutionName,
            institutionAddress: event.institutionAddress,
            venue: event.venue,
          });
        } else {
          setEvent(null);
        }
      });
    fetch(getApiUrl(`/api/admin/judges/${judgeId}`))
      .then(res => res.json())
      .then(judge => {
        if (judge && judge.name && judge.number !== undefined) {
          setJudge({ name: judge.name, number: String(judge.number) });
        } else {
          setJudge(null);
        }
      });
  }, [id, judgeId]);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <PrintHeader event={event} />
      <RawScoresTable judgeId={parseInt(judgeId, 10)} eventId={parseInt(id)} tableClassName="min-w-full text-xs border-separate" phase={phase} />
      {judge && <PrintFooter judgeName={judge.name} judgeNumber={judge.number} />}
    </div>
  );
}