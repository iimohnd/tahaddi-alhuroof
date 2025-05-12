// app/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert("أدخل اسمك");
    setLoading(true);

    if (mode === "create") {
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: room } = await supabase
        .from("rooms")
        .insert({ code: roomCode })
        .select()
        .single();

      if (room) {
        await supabase.from("players").insert({
          room_id: room.id,
          name,
          is_host: true
        });

        localStorage.setItem("player_name", name);
        router.push(`/lobby/${room.id}`);
      }
    } else {
      if (!code.trim()) return alert("أدخل رمز الغرفة");

      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", code.trim())
        .single();

      if (room) {
        await supabase.from("players").insert({
          room_id: room.id,
          name,
          is_host: false
        });

        localStorage.setItem("player_name", name);
        router.push(`/lobby/${room.id}`);
      } else {
        alert("رمز الغرفة غير صحيح");
      }
    }

    setLoading(false);
  }

  return (
    <main className="max-w-md mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">تحدي الحروف</h1>
      <div className="flex justify-center gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${mode === "create" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("create")}
        >
          إنشاء غرفة
        </button>
        <button
          className={`px-4 py-2 rounded ${mode === "join" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("join")}
        >
          دخول غرفة
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border rounded"
          placeholder="اكتب اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {mode === "join" && (
          <input
            className="w-full p-2 border rounded"
            placeholder="رمز الغرفة"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          {loading ? "جارٍ المتابعة..." : mode === "create" ? "أنشئ وادخل الغرفة" : "ادخل الغرفة"}
        </button>
      </form>
    </main>
  );
}
