import { Nav } from "@/components/nav";
import { NewSeedForm } from "@/components/new-seed-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewSeedPage() {
  return (
    <>
      <Nav />
      <main className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>New seed</CardTitle>
            <CardDescription>
              Capture an idea and choose its track to begin the AI interview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewSeedForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
