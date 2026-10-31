import { isDemoMode } from "@/src/lib/supabase";
import { demoRepository } from "@/src/lib/repository/demo-repository";
import { supabaseRepository } from "@/src/lib/repository/supabase-repository";

export function getRepository() {
  return isDemoMode() ? demoRepository : supabaseRepository;
}

export * from "@/src/lib/repository/types";
