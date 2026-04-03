"use client";

import { useActionState, useEffect } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  return (
    <form className="login-form" action={formAction} suppressHydrationWarning>
      <div>
        <Label className="field-label" htmlFor="username">
          Username
        </Label>
        <div style={{ position: "relative" }}>
          <UserRound
            aria-hidden="true"
            size={18}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8192a7",
            }}
          />
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Enter your username"
            autoComplete="username"
            className="pl-11"
            required
          />
        </div>
      </div>

      <div>
        <Label className="field-label" htmlFor="password">
          Password
        </Label>
        <div style={{ position: "relative" }}>
          <LockKeyhole
            aria-hidden="true"
            size={18}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8192a7",
            }}
          />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            className="pl-11"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {pending ? "Signing in..." : "Sign in"}
          {!pending && <ArrowRight size={18} />}
        </span>
      </Button>

      <p className="auth-panel-note" style={{ marginTop: 4 }}>
        Use your account to access records, approvals, and exports.
      </p>
    </form>
  );
}
