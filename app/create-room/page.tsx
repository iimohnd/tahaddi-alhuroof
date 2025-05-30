// app/create-room/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function generateRoomCode(length = 4) {
  const digits = "0123456789";
  return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
}

export default function CreateRoomPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const code = generateRoomCode();
    const { data: roomData, error: roomErr } = await supabase
      .from("rooms")
      .insert({ code, created_by: name })
      .select("id")
      .single();

    if (roomErr || !roomData) {
      alert("خطأ في إنشاء الغرفة");
      setLoading(false);
      return;
    }

    const { error: playerErr } = await supabase.from("players").insert({
      room_id: roomData.id,
      name,
      is_host: true
    });

    if (playerErr) {
      alert("خطأ في إضافة اللاعب");
      setLoading(false);
      return;
    }

    router.push(`/game/${roomData.id}`);
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">إنشاء غرفة جديدة</h1>
      <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !name.trim()}
        >
          {loading ? "...جاري الإنشاء" : "إنشاء الغرفة"}
        </button>
      </form>
    </main>
  );
}
