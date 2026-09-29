"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const NewBillLoader = dynamic(() => import("@/components/new-bill").then((mod) => mod.NewBill), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
});
