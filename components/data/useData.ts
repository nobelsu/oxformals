"use client";

import { useContext } from "react";
import { DataContext, type DataContextValue } from "./DataProvider";

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used inside <DataProvider>");
  }
  return ctx;
}
