import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card>
        <CardHeader>
          <CardTitle>Coming in MVP phases</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            See <code className="rounded bg-muted px-1">docs/MVP_ROADMAP.md</code> for implementation schedule.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
