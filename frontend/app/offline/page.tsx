export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#FAFAF8] px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176B4D]">
        Offline
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-[#17211D]">
        You are not connected
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
        Kova needs a network connection for live data. Your sign-in session
        is still saved — reconnect and open the app again.
      </p>
      <a
        href="/workspace"
        className="mt-8 bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white"
      >
        Try again
      </a>
    </main>
  );
}
