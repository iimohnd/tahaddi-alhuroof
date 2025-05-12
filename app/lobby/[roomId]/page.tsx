// app/lobby/[roomId]/page.tsx

"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function LobbyRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roundId, setRoundId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!roomId) return;
    fetchRoom();
    fetchPlayers();
    listenToRounds();
  }, [roomId]);

  async function fetchRoom() {
    const { data } = await supabase.from("rooms").select().eq("id", roomId).single();
    setRoom(data);
  }

  async function fetchPlayers() {
    const { data } = await supabase.from("players").select("*, scores(total_points)").eq("room_id", roomId);
    setPlayers(data || []);

    const localName = localStorage.getItem("player_name");
    const me = data?.find((p) => p.name === localName);
    setIsHost(me?.is_host || false);

    setLoading(false);
  }

  function listenToRounds() {
    supabase
      .channel("round-watcher")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRoundId(payload.new.id);
          router.push(`/game/${roomId}`);
        }
      )
      .subscribe();
  }

  async function startRound() {
    const letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const roundNumber = Date.now();

    await supabase.from("rounds").insert({
      room_id: roomId,
      letter: randomLetter,
      round_number: roundNumber
    });
  }

  if (loading) return <p className="p-4">جارٍ تحميل الغرفة...</p>;

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">غرفة {room?.code}</h1>
      <h2 className="text-lg mb-2">اللاعبين:</h2>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex justify-between border px-3 py-2 rounded bg-gray-50"
          >
            <span>{p.name}</span>
            <span className="text-sm text-gray-600">{p.scores?.total_points || 0} نقطة</span>
          </li>
        ))}
      </ul>

      {isHost && (
        <button
          onClick={startRound}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
        >
          بدء الجولة
        </button>
      )}
    </main>
  );
}
