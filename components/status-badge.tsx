import { Badge } from "@/components/ui/badge";
import type { BillStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BillStatus }) {
  if (status === "done") {
    return <Badge className="bg-success/10 text-success">Settled</Badge>;
  }

  if (status === "cancelled") {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        Cancelled
      </Badge>
    );
  }

  return <Badge variant="outline">Open</Badge>;
}
