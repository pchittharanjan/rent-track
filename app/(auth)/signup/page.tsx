"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnterKeySubmit } from "@/lib/hooks/useEnterKeySubmit";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.length > 0) {
      validatePassword(value);
    } else {
      setPasswordError(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setLoading(true);

    if (!validatePassword(password)) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      // Redirect to onboarding
      router.push("/onboarding");
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterKey = useEnterKeySubmit(() => {
    if (!loading && email && password && firstName && lastName) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSignUp(fakeEvent);
    }
  }, loading);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md frosted-glass border-border/20 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-light tracking-tight">Create an account</CardTitle>
        </CardHeader>
        <form onSubmit={handleSignUp} noValidate>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {error}
              </div>
            )}
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName" className="text-sm font-normal">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11 font-light"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName" className="text-sm font-normal">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-11 font-light"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email" className="text-sm font-normal">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 font-light"
                />
              </Field>
              <Field data-invalid={!!passwordError}>
                <FieldLabel htmlFor="password" className="text-sm font-normal">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={handleEnterKey}
                  required
                  aria-invalid={!!passwordError}
                  className="h-11 font-light"
                />
                {passwordError && (
                  <FieldError>{passwordError}</FieldError>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 font-normal" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground font-light">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground hover:underline font-normal">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
