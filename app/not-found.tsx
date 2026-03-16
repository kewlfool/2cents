import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The route does not exist in the current phase 0 scaffold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ variant: "primary" })} href="/">
            Return to dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
