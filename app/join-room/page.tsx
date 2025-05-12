// app/join-room/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinRoomPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code.toUpperCase())
      .single();

    if (roomErr || !room) {
      alert("لم يتم العثور على الغرفة");
      setLoading(false);
      return;
    }

    const { error: joinErr } = await supabase.from("players").insert({
      room_id: room.id,
      name,
      is_host: false
    });

    if (joinErr) {
      alert("حدث خطأ أثناء الانضمام");
      setLoading(false);
      return;
    }

    router.push(`/game/${room.id}`);
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">الانضمام إلى غرفة</h1>
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="text"
          placeholder="رمز الغرفة (مثلاً: ABC123)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading || !name.trim() || !code.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading ? "...جارٍ الانضمام" : "انضمام"}
        </button>
      </form>
    </main>
  );
}
