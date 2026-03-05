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
        scopes:
          "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
      },
    });
  };

  return (
    <Button onClick={handleSignIn} variant="outline" size="lg">
      Sign in with Google
    </Button>
  );
}
