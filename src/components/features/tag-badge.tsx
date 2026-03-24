"use client";

import { motion } from "framer-motion";
import type { Tag, TagType } from "@/types";

const tagStyles: Record<TagType, string> = {
  mood: "bg-primary/15 text-primary border-primary/20",
  location: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  time: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  subject: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  specialty: "bg-rose-500/15 text-rose-700 border-rose-500/20",
};

const tagIcons: Record<TagType, string> = {
  mood: "💜",
  location: "📍",
  time: "🕐",
  subject: "📷",
  specialty: "🎁",
};

export function TagBadge({ tag, index }: { tag: Tag; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${tagStyles[tag.type]}`}
    >
      <span>{tagIcons[tag.type]}</span>
      {tag.label}
    </motion.span>
  );
}
