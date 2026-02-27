import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const error = searchParams.get("error");
  const didLogout = searchParams.get("logout") === "true";
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (didLogout) return;
    if (isAuthenticated) {
      window.location.href = redirect;
      return;
    }
    const delay = error ? 1500 : 200;
    const timer = setTimeout(() => {
      login(redirect);
    }, delay);
    return () => clearTimeout(timer);
  }, [didLogout, error, redirect, login, isAuthenticated]);

  if (didLogout) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-muted-foreground">
          You&apos;ve been signed out.
        </p>
        <Button onClick={() => login("/")}>Sign in again</Button>
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
      <p className="text-muted-foreground">Redirecting to TokenSmart sign-in…</p>
      <Button onClick={() => login(redirect)}>Sign in with TokenSmart</Button>
    </main>
  );
};

export default LoginPage;

