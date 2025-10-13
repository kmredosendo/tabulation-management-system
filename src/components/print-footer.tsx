export function PrintFooter({ judgeName, judgeNumber }: { judgeName: string, judgeNumber: string }) {
  return (
    <div className="w-full flex flex-col items-end mt-16 print:mt-12">
      <div className="w-64 border-t border-black mb-1" />
      <div className="w-64 text-right font-medium text-sm">{judgeName}</div>
      <div className="w-64 text-right text-xs text-muted-foreground">
        {judgeNumber === "1" ? "Chief Judge" : `Judge #${judgeNumber}`}
      </div>
    </div>
  );
}