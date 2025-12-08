// components/tjr/TJRWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { getTJRCommentary } from "@/lib/tjr/tjrCommentary";

export default function TJRWidget({ spiceState }: { spiceState: any }) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!spiceState) return;
    setComment(getTJRCommentary(spiceState));
  }, [spiceState]);

  return (
    <div className="fixed right-4 bottom-4 p-4 bg-black/70 border border-slate-700 rounded-xl w-64 text-white shadow-lg">
      <h3 className="mb-2 text-lg font-bold">
        🧙‍♂️ TJR Says:
      </h3>

      <p className="text-slate-300">
        {comment}
      </p>
    </div>
  );
}
