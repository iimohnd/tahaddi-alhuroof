// app/game/[roomId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { validateAnswer } from "../../../lib/utils";

const categories = ["name", "country", "animal", "plant", "object"];

export default function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [roundStarting, setRoundStarting] = useState(false);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [roundEnded, setRoundEnded] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!roomId) return;
    fetchRoom();
    fetchPlayers();
    listenToRounds();
  }, [roomId]);

  async function fetchRoom() {
    const { data } = await supabase.from("rooms").select("id").eq("id", roomId).single();
    setRoom(data);
  }

  async function fetchPlayers() {
    const { data } = await supabase.from("players").select("*").eq("room_id", roomId);
    setPlayers(data || []);

    const localName = localStorage.getItem("player_name");
    const me = data?.find((p) => p.name === localName);
    setIsHost(me?.is_host || false);

    setLoading(false);
  }

  function listenToRounds() {
    supabase
      .channel("room-rounds")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setCurrentLetter(payload.new.letter);
          setCurrentRoundId(payload.new.id);
          setRoundEnded(false);
          setResults([]);
          setAnswers({});
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          if (payload.new.ended_at) {
            setRoundEnded(true);
            await fetchResults(payload.new.id);
            await updateScores(payload.new.id);
            setTimeout(() => router.push(`/lobby/${roomId}`), 5000);
          }
        }
      )
      .subscribe();
  }

  async function submitAnswers() {
    const localName = localStorage.getItem("player_name");
    const me = players.find((p) => p.name === localName);
    if (!me || !currentRoundId) return;

    const entries = Object.entries(answers).filter(([_, v]) => v.trim() !== "");

    for (const [category, word] of entries) {
      await supabase.from("answers").insert({
        word,
        category,
        round_id: currentRoundId,
        player_id: me.id,
        result: "pending"
      });
      await validateAnswer(word, category, me.id, currentRoundId);
    }

    await endRound();
  }

  async function fetchResults(roundId: string) {
    const { data } = await supabase
      .from("answers")
      .select("player_id, category, word, result")
      .eq("round_id", roundId);
    setResults(data || []);
  }

  async function updateScores(roundId: string) {
    const { data } = await supabase
      .from("answers")
      .select("player_id, word, result")
      .eq("round_id", roundId);

    if (!data) return;

    const scoreMap: { [key: string]: number } = {};
    const wordCount: { [key: string]: number } = {};

    data.forEach((ans) => {
      if (ans.result === "valid") {
        wordCount[ans.word] = (wordCount[ans.word] || 0) + 1;
      }
    });

    data.forEach((ans) => {
      if (ans.result === "valid") {
        const isRepeated = wordCount[ans.word] > 1;
        const score = isRepeated ? 5 : 10;
        scoreMap[ans.player_id] = (scoreMap[ans.player_id] || 0) + score;
      }
    });

    for (const player_id in scoreMap) {
      const points = scoreMap[player_id];

      const { data: existing } = await supabase
        .from("scores")
        .select("id, total_points")
        .eq("player_id", player_id)
        .eq("room_id", roomId)
        .single();

      if (existing) {
        await supabase
          .from("scores")
          .update({ total_points: existing.total_points + points })
          .eq("id", existing.id);
      } else {
        await supabase.from("scores").insert({
          player_id,
          room_id: roomId,
          total_points: points
        });
      }
    }
  }

  async function startRound() {
    const letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const roundNumber = Date.now();

    setRoundStarting(true);

    const { data } = await supabase.from("rounds").insert({
      room_id: roomId,
      letter: randomLetter,
      round_number: roundNumber
    }).select().single();

    if (data) {
      setCurrentRoundId(data.id);
    }

    setRoundStarting(false);
  }

  async function endRound() {
    if (!currentRoundId) return;
    await supabase.from("rounds").update({ ended_at: new Date().toISOString() }).eq("id", currentRoundId);
  }

  if (loading) return <p className="p-4">جارٍ تحميل الغرفة...</p>;
  if (!room) return <p className="p-4 text-red-600">الغرفة غير موجودة</p>;

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">رمز الغرفة: {room.code}</h1>
      <h2 className="text-lg mb-4">اللاعبين:</h2>
      <ul className="list-disc ps-6">
        {players.map((p) => (
          <li key={p.id}>{p.name} {p.is_host && "(مشرف)"}</li>
        ))}
      </ul>

      {currentLetter && !roundEnded && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitAnswers();
          }}
          className="mt-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-green-700">الحرف: {currentLetter}</h2>
          {categories.map((cat) => (
            <input
              key={cat}
              className="w-full p-2 border rounded"
              placeholder={`اكتب ${cat} بحرف ${currentLetter}`}
              value={answers[cat] || ""}
              onChange={(e) => setAnswers({ ...answers, [cat]: e.target.value })}
            />
          ))}
          <button type="submit" className="bg-red-700 text-white px-4 py-2 rounded">
            انتهيت
          </button>
        </form>
      )}

      {roundEnded && results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">النتائج:</h2>
          <ul className="text-sm space-y-1">
            {results.map((res, idx) => (
              <li
                key={idx}
                className={`px-2 py-1 rounded ${
                  res.result === "valid"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                🧍 اللاعب: {res.player_id} | 📝 {res.category}: {res.word} → {res.result === "valid" ? "✅" : "❌"}
              </li>
            ))}
          </ul>
          <p className="text-center mt-4 text-gray-500">🔄 سيتم الرجوع إلى اللوبي خلال ثوانٍ...</p>
        </div>
      )}

      {isHost && (
        <button
          onClick={startRound}
          className="mt-6 bg-blue-700 text-white px-4 py-2 rounded"
          disabled={roundStarting}
        >
          {roundStarting ? "جاري بدء الجولة..." : "بدء الجولة"}
        </button>
      )}
    </main>
  );
}
