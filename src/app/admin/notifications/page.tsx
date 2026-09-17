import { NotificationFeed } from "@/components/notification-bell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow text-sage">Activity</p>
          <h1 className="mt-2 text-3xl">Notifications</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-300">
            Console activity only — new orders, dispatch milestones, client reviews and
            contact messages. Client-account activity never appears here.
          </p>
        </div>
      </header>

      <NotificationFeed scope="admin" />
    </div>
  );
}
