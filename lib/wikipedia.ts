// lib/wikipedia.ts

export async function checkWordInWikipedia(word: string): Promise<boolean> {
    const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      word
    )}&format=json&origin=*`;
  
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
  
      const data = await res.json();
      return data?.query?.search?.length > 0;
    } catch (error) {
      console.error("Wikipedia API error:", error);
      return false;
    }
  }
  