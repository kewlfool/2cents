import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Highlight = {
  label: string;
  value: string;
};

type FeatureRouteShellProps = {
  deferred: string[];
  dependencies: string[];
  description: string;
  highlights: Highlight[];
  inScope: string[];
  phaseLabel: string;
  title: string;
};

export function FeatureRouteShell({
  deferred,
  dependencies,
  description,
  highlights,
  inScope,
  phaseLabel,
  title,
}: FeatureRouteShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">{phaseLabel}</Badge>}
        description={description}
        eyebrow="Screen plan"
        title={title}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((highlight) => (
          <Card key={highlight.label}>
            <CardHeader className="space-y-2">
              <CardDescription>{highlight.label}</CardDescription>
              <CardTitle className="text-xl">{highlight.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Planned in scope</CardTitle>
            <CardDescription>
              The work this screen is expected to carry when its phase starts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-muted space-y-3 text-sm leading-6">
              {inScope.map((item) => (
                <li
                  className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
              <CardDescription>
                Foundation pieces this screen depends on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted space-y-2 text-sm leading-6">
                {dependencies.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explicitly deferred</CardTitle>
              <CardDescription>
                Features intentionally kept out of the initial implementation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted space-y-2 text-sm leading-6">
                {deferred.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
