"use client";

export default function HelpPage() {
  return (
    <div className="px-8 py-6 bg-card/30">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight font-serif mb-2">
          Help & Support
        </h1>
        <p className="text-sm text-muted-foreground">
          Get help with using the app
        </p>
      </div>

      <div className="space-y-6">
        <div className="frosted-glass bg-card/40 p-6 rounded-lg">
          <h2 className="text-lg font-normal mb-4">Getting Started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Welcome to Rent Tracking! This app helps you manage shared expenses, rent, and utilities with your roommates.
          </p>
        </div>

        <div className="frosted-glass bg-card/40 p-6 rounded-lg">
          <h2 className="text-lg font-normal mb-4">Need Help?</h2>
          <p className="text-sm text-muted-foreground">
            If you have questions or need assistance, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
