import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

const SITE_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) ||
  "https://thewipmeetup.com";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/";
  const redirect = redirectParam.startsWith("/") ? redirectParam : "/";
  const error = searchParams.get("error");
  const didLogout = searchParams.get("logout") === "true";
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (didLogout) {
      const timer = setTimeout(() => {
        window.location.href = SITE_URL;
      }, 1600);
      return () => clearTimeout(timer);
    }

    if (isAuthenticated) {
      window.location.href = redirect;
      return;
    }

    // Avoid auth loops: if we already have an auth error, require manual retry.
    if (error) return;

    const timer = setTimeout(() => {
      login(redirect);
    }, 200);
    return () => clearTimeout(timer);
  }, [didLogout, error, redirect, login, isAuthenticated]);

  if (didLogout) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-muted-foreground">
          You&apos;ve been signed out. Redirecting to thewipmeetup.com…
        </p>
        <Button onClick={() => (window.location.href = SITE_URL)}>
          Go to thewipmeetup.com
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      {error && (
        <p className="text-sm font-medium text-destructive">
          Sign-in error: {error}
        </p>
      )}
      <p className="text-muted-foreground">
        {error
          ? "Sign-in paused. Click below to try again."
          : "Redirecting to TokenSmart sign-in…"}
      </p>
      <Button onClick={() => login(redirect)}>Sign in with TokenSmart</Button>
    </main>
  );
};

export default LoginPage;


