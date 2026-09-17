import { NotificationFeed } from "@/components/notification-bell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

export default function AccountNotificationsPage() {
  return (
    <div>
      <p className="eyebrow text-sage">Activity</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Notifications</h1>
      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-300">
        Only your account — order confirmations, delivery updates and pieces waiting for
        your review. Store-console activity stays with the owner.
      </p>

      <div className="mt-8">
        <NotificationFeed scope="customer" />
      </div>
    </div>
  );
}
