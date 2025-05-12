// app/game/page.tsx

"use client";

import { useState } from "react";
import { validateAnswer } from "../../lib/utils";

export default function GamePage() {
  const [letter] = useState(() => getRandomLetter());
  const [answers, setAnswers] = useState({
    name: "",
    country: "",
    animal: "",
    plant: "",
    object: ""
  });
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const playerId = "player1"; // مؤقتًا
  const roundId = "round1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res: { [key: string]: string } = {};

    for (const category in answers) {
      const word = answers[category as keyof typeof answers];
      const result = await validateAnswer(word, category as any, playerId, roundId);
      res[category] = result;
    }

    setResults(res);
    setLoading(false);
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">الحرف: {letter.toUpperCase()}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {Object.keys(answers).map((key) => (
          <input
            key={key}
            placeholder={`اكتب ${key} بالحرف ${letter}`}
            value={answers[key as keyof typeof answers]}
            onChange={(e) =>
              setAnswers({ ...answers, [key]: e.target.value })
            }
            className="p-2 border rounded"
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading ? "...جاري التحقق" : "إرسال الإجابات"}
        </button>
      </form>

      {Object.keys(results).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">النتائج:</h2>
          <ul className="space-y-1">
            {Object.entries(results).map(([cat, res]) => (
              <li key={cat}>{cat}: {res === "valid" ? "✅ صحيحة" : "❌ خاطئة"}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function getRandomLetter() {
  const arabicLetters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
  const index = Math.floor(Math.random() * arabicLetters.length);
  return arabicLetters[index];
}
