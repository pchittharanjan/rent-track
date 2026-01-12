"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24">
      <div className="max-w-4xl w-full items-center justify-center text-center space-y-14">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-normal tracking-tight leading-[1.1] font-serif">
            Rent Tracking Made Simple
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Group, split and track your rent, utilities
            <br />
            and any housing-payments—all in one place.
          </p>
        </div>

        <div className="space-y-5">
          <Card className="max-w-md mx-auto frosted-glass border-border/20 shadow-xl">
            <CardContent className="pt-6 space-y-3">
              <Link href="/signup" className="block">
                <Button className="w-full h-12 text-base font-normal" size="lg">
                  Create Account
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full h-12 text-base font-normal" size="lg">
                  Log In
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground/70 font-light">
            <p>Free to use • No payment processing • Privacy focused</p>
          </div>
        </div>
      </div>
    </main>
  );
}
