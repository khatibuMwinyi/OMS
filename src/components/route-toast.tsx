"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type RouteToastProps = {
  status?: string;
  error?: string;
};

export function RouteToast({ status, error }: RouteToastProps) {
  useEffect(() => {
    if (status) {
      toast.success(status);
    }

    if (error) {
      toast.error(error);
    }
  }, [status, error]);

  return null;
}