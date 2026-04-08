"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignInButton() {
  const handleSignIn = async () => {
    // Preserve referral code through OAuth redirect
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("referral_code", refCode);
      }
    } catch {
      // ignore localStorage errors
    }

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      size="lg"
      className="w-full"
    >
      Sign in with Google
    </Button>
  );
}
