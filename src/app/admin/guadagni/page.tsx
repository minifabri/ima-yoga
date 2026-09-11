"use client";

import { EarningsView } from "../EarningsView";
import { useAdmin } from "../AdminShell";

export default function AdminGuadagniPage() {
  const { supabase, classes, packages, expenses, addExpense, deleteExpense } = useAdmin();
  return (
    <EarningsView
      supabase={supabase}
      classes={classes}
      packages={packages}
      expenses={expenses}
      onAddExpense={addExpense}
      onDeleteExpense={deleteExpense}
    />
  );
}
