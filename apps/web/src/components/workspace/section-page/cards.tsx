import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatusLine } from "@notify/ui";
import type { LucideIcon } from "lucide-react";
import type { LabelValueRow } from "./data";

function ChecklistCard({
  description,
  icon: Icon,
  items,
  title,
}: Readonly<{
  description: string;
  icon: LucideIcon;
  items: LabelValueRow[];
  title: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-sm border bg-secondary">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map(([label, value]) => (
          <StatusLine key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

export { ChecklistCard };
