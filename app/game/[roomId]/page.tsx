// app/game/[roomId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [roundStarting, setRoundStarting] = useState(false);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [roundEnded, setRoundEnded] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;
    fetchRoom();
    fetchPlayers();
    listenToRounds();
  }, [roomId]);

  async function fetchRoom() {
    const { data } = await supabase.from("rooms").select("id, code, created_by").eq("id", roomId).single();
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
          }
        }
      )
      .subscribe();
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

      {currentLetter && (
        <div className="mt-6 text-xl font-bold text-green-700">
          الجولة الحالية بالحرف: {currentLetter}
        </div>
      )}

      {!roundEnded && currentLetter && (
        <button
          onClick={endRound}
          className="mt-6 bg-red-700 text-white px-4 py-2 rounded"
        >
          انتهيت
        </button>
      )}

      {roundEnded && results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">النتائج:</h2>
          <ul className="text-sm space-y-1">
            {results.map((res, idx) => (
              <li key={idx}>
                🧍 اللاعب: {res.player_id} | 📝 {res.category}: {res.word} → {res.result === "valid" ? "✅" : "❌"}
              </li>
            ))}
          </ul>
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
