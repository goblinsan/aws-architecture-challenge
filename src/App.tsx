/**
 * App
 *
 * Root component. Manages page-level routing based on player entry state:
 *
 *  loading  → Full-screen spinner (checking localStorage / fetching session)
 *  join     → JoinPage (QR landing / name entry form)
 *  active   → ChallengePage (assigned challenge card)
 *  error    → Error screen with retry option
 */

import { useEntry } from "./hooks/useEntry";
import JoinPage from "./pages/JoinPage";
import ChallengePage from "./pages/ChallengePage";

export default function App() {
  const {
    status,
    entry,
    sessionConfig,
    roundState,
    errorMessage,
    join,
    clearEntry,
  } = useEntry();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-aws-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-4 border-aws-orange border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading"
          />
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !sessionConfig) {
    return (
      <div className="min-h-screen bg-aws-dark flex flex-col items-center justify-center p-6">
        <p className="text-white text-lg font-semibold mb-2">
          Something went wrong
        </p>
        <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
          {errorMessage ?? "Unable to load the session. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-aws-orange text-aws-dark font-semibold py-3 px-8"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "active" && entry && roundState) {
    return (
      <ChallengePage
        entry={entry}
        roundState={roundState}
        onLeave={clearEntry}
      />
    );
  }

  // Default: show join page
  return (
    <JoinPage
      sessionConfig={sessionConfig}
      onJoin={join}
      isLoading={false}
      errorMessage={errorMessage}
    />
  );
}
