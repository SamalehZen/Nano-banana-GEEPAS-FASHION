import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function JsonViewer({ data }: { data: any }) {
  return (
    <Card className="bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-xs shadow-inner border-border">
      <ScrollArea className="h-full min-h-[200px]">
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      </ScrollArea>
    </Card>
  );
}
