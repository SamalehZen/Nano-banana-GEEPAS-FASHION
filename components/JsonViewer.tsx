export function JsonViewer({ data }: { data: any }) {
  return (
    <div className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl font-mono text-xs overflow-auto h-full min-h-[200px] shadow-inner border border-border">
      <pre className="whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
