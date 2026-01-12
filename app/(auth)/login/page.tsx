"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEnterKeySubmit } from "@/lib/hooks/useEnterKeySubmit";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Login error:", signInError);
        setError(signInError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (!data.user) {
        console.error("No user returned from sign in");
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify session before redirecting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session after login");
        setError("Session not established. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      setError(error.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleEnterKey = useEnterKeySubmit(() => {
    if (!loading && email && password) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleLogin(fakeEvent);
    }
  }, loading);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md frosted-glass border-border/20 shadow-2xl">
        <CardHeader className="space-y-5">
          <CardTitle className="text-2xl font-light tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base font-light">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-normal">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 font-light"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-normal">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleEnterKey}
                required
                disabled={loading}
                className="h-11 font-light"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 font-normal" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground font-light">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-foreground hover:underline font-normal">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
