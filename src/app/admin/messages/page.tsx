import { desc } from "drizzle-orm";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";

import { markMessageHandledAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminMessages() {
  const messages = await db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(100);

  const open = messages.filter((message) => !message.handled).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow text-sage">Client services</p>
          <h1 className="mt-2 text-3xl">Contact messages</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
            Every message sent from the contact page, newest first.
          </p>
        </div>
        <p className="text-[13px] text-ink-300">
          <span className="text-ink">{open}</span> awaiting reply · {messages.length} total
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="border border-dashed border-ink/20 px-6 py-20 text-center">
          <p className="font-display text-2xl">No messages yet</p>
          <p className="mt-3 text-[13.5px] text-ink-300">
            Messages sent from the contact page appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`border px-6 py-5 ${message.handled ? "border-sand bg-linen" : "border-ink/20 bg-bone"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14.5px]">
                    {message.name}
                    <span className="ml-2 text-[12.5px] text-ink-300">{message.email}</span>
                  </p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-ink-300">
                    {message.subject || "General"} ·{" "}
                    {new Date(message.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <form action={markMessageHandledAction}>
                  <input type="hidden" name="id" value={message.id} />
                  <button
                    type="submit"
                    className={`px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      message.handled
                        ? "border border-ink/15 text-ink-300 hover:border-ink"
                        : "bg-ink text-bone hover:bg-ink-700"
                    }`}
                  >
                    {message.handled ? "Reopen" : "Mark handled"}
                  </button>
                </form>
              </div>

              <p className="mt-4 whitespace-pre-line text-[14px] leading-[1.75] text-ink-500">
                {message.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
