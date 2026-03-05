"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignInButton() {
  const handleSignIn = async () => {
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
