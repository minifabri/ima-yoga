import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { SurveyPublicView } from "./SurveyPublicView";
import type { PublicSurveyData, PublicSurveyQuestion } from "./types";

type SurveyRpcRow = {
  id: string;
  slug: string;
  title: string;
  description_html: string;
  cover_image_light_url: string | null;
  cover_image_dark_url: string | null;
  cover_image_fit: "contain" | "cover";
  published: boolean;
  starts_at: string | null;
  ends_at: string | null;
  questions: {
    id: string;
    question_text: string;
    required: boolean;
    allow_other: boolean;
    options: { id: string; label: string }[];
  }[];
  my_response_id: string | null;
};

export default async function SurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_survey", { p_slug: slug }).maybeSingle<SurveyRpcRow>();

  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
        <div
          className="w-full p-6 rounded-2xl text-center"
          style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="mb-2 flex justify-center">
            <Image
              src="/courtesy/evento-candela.png"
              alt=""
              width={426}
              height={640}
              className="w-full h-auto"
              style={{ maxWidth: 150 }}
            />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--heading)" }} className="mb-2">
            Sondaggio non trovato
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
            Non esiste, non è ancora stato pubblicato, oppure è già stato chiuso.
          </div>
        </div>
      </main>
    );
  }

  const { user, profile } = await getCurrentUserAndProfile();

  const questions: PublicSurveyQuestion[] = (data.questions || []).map((q) => ({
    id: q.id,
    questionText: q.question_text,
    required: q.required,
    allowOther: q.allow_other,
    options: (q.options || []).map((o) => ({ id: o.id, label: o.label })),
  }));

  const survey: PublicSurveyData = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    descriptionHtml: data.description_html,
    coverImageLightUrl: data.cover_image_light_url,
    coverImageDarkUrl: data.cover_image_dark_url,
    coverImageFit: data.cover_image_fit,
    published: data.published,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    questions,
    myResponseId: data.my_response_id,
  };

  return (
    <SurveyPublicView survey={survey} loggedIn={!!user} profileRole={profile?.role ?? null} clientFullName={profile?.full_name || ""} />
  );
}
