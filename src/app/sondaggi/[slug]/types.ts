export type PublicSurveyOption = {
  id: string;
  label: string;
};

export type PublicSurveyQuestion = {
  id: string;
  questionText: string;
  required: boolean;
  allowOther: boolean;
  options: PublicSurveyOption[];
};

export type PublicSurveyData = {
  id: string;
  slug: string;
  title: string;
  descriptionHtml: string;
  coverImageLightUrl: string | null;
  coverImageDarkUrl: string | null;
  coverImageFit: "contain" | "cover";
  published: boolean;
  startsAt: string | null; // ISO
  endsAt: string | null; // ISO
  questions: PublicSurveyQuestion[];
  myResponseId: string | null;
};
