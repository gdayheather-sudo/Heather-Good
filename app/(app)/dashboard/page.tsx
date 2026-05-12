import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Smoke-test that RLS + the signup trigger + the personal-org bootstrap all
  // wired up correctly. If this query returns the user's auto-created org,
  // the spine is healthy end-to-end.
  const { data: orgs } = await supabase
    .from('organisations')
    .select('id, name')
    .order('created_at', { ascending: true });

  const { data: sops } = await supabase
    .from('sops')
    .select('id, title, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  const org = orgs?.[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal">Your SOPs</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            {org ? `${org.name}` : 'Setting up your workspace…'}
          </p>
        </div>

        <Button size="lg" disabled title="Coming in week 3">
          <Mic className="h-4 w-4" />
          New recording
        </Button>
      </div>

      {sops && sops.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {sops.map((sop) => (
            <li key={sop.id}>
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-charcoal">{sop.title}</p>
                    <p className="text-xs text-charcoal/50">
                      {sop.status} · updated {new Date(sop.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No SOPs yet</CardTitle>
            <CardDescription>
              Phase 1 spine is live. Recording and structuring land in week 3 of the build.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
