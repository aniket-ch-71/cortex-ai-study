import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXAM_CATEGORIES, SUB_EXAMS, type ExamCategory } from "@/lib/exam-patterns";

export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  target_exam: string | null;
  primary_exam: string | null;
  exams: string[];
  state: string | null;
  city: string | null;
  language: string;
  onboarded: boolean;
  streak: number;
};

function deriveCategory(subExam: string | null | undefined): ExamCategory | null {
  if (!subExam) return null;
  for (const cat of EXAM_CATEGORIES) {
    if (SUB_EXAMS[cat].includes(subExam)) return cat;
  }
  return null;
}

export function useProfile() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["profile"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...(data as any),
        exams: Array.isArray((data as any).exams) ? ((data as any).exams as string[]) : [],
      };
    },
  });

  // Invalidate on auth state change so stale data clears on logout/login
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const primaryExam = query.data?.primary_exam || query.data?.target_exam || null;
  const examCategory = deriveCategory(primaryExam);

  return {
    profile: query.data ?? null,
    primaryExam,
    examCategory,
    subExam: primaryExam,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
