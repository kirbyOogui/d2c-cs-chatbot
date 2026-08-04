import { ChatWidget } from "@/components/widget/chat-widget";

// Stand-in storefront page for local testing -- represents "the EC site the
// widget gets embedded into". Not part of the deliverable itself.
export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-lg font-bold tracking-tight">D2C BRAND</span>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-16">
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div>
            <h1 className="text-2xl font-semibold">オーガニックコットン Tシャツ</h1>
            <p className="mt-2 text-zinc-500">¥5,800（税込）</p>
            <p className="mt-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              サンプル商品ページです。右下のチャットアイコンから、在庫確認・配送状況・返品ポリシーなどをお問い合わせいただけます。
            </p>
            <button className="mt-8 w-full rounded-full bg-black py-3 text-sm font-semibold text-white dark:bg-white dark:text-black">
              カートに追加
            </button>
          </div>
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}
