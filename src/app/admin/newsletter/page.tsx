"use client";

import { NewsletterView } from "../NewsletterView";
import { useAdmin } from "../AdminShell";

export default function AdminNewsletterPage() {
  const { supabase, clients, showToast } = useAdmin();
  return <NewsletterView supabase={supabase} clients={clients} showToast={showToast} />;
}
