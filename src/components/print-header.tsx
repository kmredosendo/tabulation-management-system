import Image from "next/image";

export function PrintHeader({ event }: { event: { name: string; date: string; institutionName?: string; institutionAddress?: string; venue?: string } | null }) {
  return (
    // <div className="w-full flex flex-col items-center mb-8 print:mb-4">
    <div className="w-full flex flex-col mb-8 print:mb-4">
      <div className="flex items-center gap-4">
        <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.ico`} alt="Logo" width={72} height={72} className="rounded" />
        {/* <div className="flex flex-col items-center"> */}
        <div className="flex flex-col">
          <span className="text-lg font-bold">{event?.institutionName || "Institution Name"}</span>
          {event?.institutionAddress && (
            <span className="text-base font-semibold">{event.institutionAddress}</span>
          )}
          {event?.venue && (
            <span className="text-base font-normal">{event.venue}</span>
          )}
        </div>
      </div>
      {event && (
        <div className="mt-3 text-center">
          <div className="text-xl font-bold text-primary leading-tight">{event.name}</div>
          <div className="text-sm text-muted-foreground font-normal mt-0.5">
            {new Date(event.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      )}
    </div>
  );
}