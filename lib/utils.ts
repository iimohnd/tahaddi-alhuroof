// lib/utils.ts

import { supabase } from "./supabase";

export async function validateAnswer(
  word: string,
  category: string,
  playerId: string,
  roundId: string
): Promise<"valid" | "invalid"> {
  const cleaned = word.trim().replace(/^ال/, "").toLowerCase();

  const { data: local } = await supabase
    .from("words")
    .select("id")
    .eq("word", cleaned)
    .eq("category", category)
    .limit(1)
    .single();

  if (local) return await storeResult("valid");

  const fromWiki = await checkWordInWikipedia(cleaned);
  return await storeResult(fromWiki ? "valid" : "invalid");

  async function storeResult(result: "valid" | "invalid") {
    await supabase.from("answers")
      .update({ result })
      .eq("player_id", playerId)
      .eq("round_id", roundId)
      .eq("word", word)
      .eq("category", category);
    return result;
  }
}

export async function checkWordInWikipedia(word: string): Promise<boolean> {
  const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    word
  )}&format=json&origin=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) return false;

    const data = await res.json();
    return data?.query?.search?.length > 0;
  } catch {
    return false;
  }
}
