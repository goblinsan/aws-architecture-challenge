/**
 * JoinPage
 *
 * Friction-light landing screen optimised for mobile / QR entry.
 * Renders either a single name field (single-player mode) or two name fields
 * (pairs mode). Submits to create an anonymous PlayerEntry and persists the
 * entry ID in localStorage for re-entry resilience.
 */

import { useState, FormEvent } from "react";
import type { GameConfig } from "@content/schema/types";

interface JoinPageProps {
  sessionConfig: GameConfig;
  onJoin: (names: string | [string, string]) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export default function JoinPage({
  sessionConfig,
  onJoin,
  isLoading = false,
  errorMessage,
}: JoinPageProps) {
  const isPairs = sessionConfig.mode === "pairs";

  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function validate(): boolean {
    if (name1.trim() === "") {
      setFieldError("Please enter your name before joining.");
      return false;
    }
    if (isPairs && name2.trim() === "") {
      setFieldError("Please enter both names before joining.");
      return false;
    }
    setFieldError(null);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const names: string | [string, string] = isPairs
      ? [name1.trim(), name2.trim()]
      : name1.trim();
    await onJoin(names);
  }

  return (
    <div className="min-h-screen bg-aws-dark flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="w-full max-w-sm text-center mb-10">
        <div className="inline-block bg-aws-orange rounded-full p-3 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-aws-dark"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14.93V17a1 1 0 11-2 0v-.07A8.001 8.001 0 014 9a1 1 0 012 0 6 6 0 1012 0 1 1 0 012 0 8.001 8.001 0 01-7 8.93zM12 7a1 1 0 110 2 1 1 0 010-2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          AWS Architecture Challenge
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          {isPairs
            ? "Join as a pair – enter both names to get your shared challenge."
            : "Scan, enter your name, and get your architecture challenge."}
        </p>
      </div>

      {/* Join form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm space-y-4"
        noValidate
      >
        {/* Name field(s) */}
        <div>
          <label
            htmlFor="name1"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {isPairs ? "Player 1 name" : "Your name"}
          </label>
          <input
            id="name1"
            type="text"
            autoComplete="given-name"
            autoFocus
            value={name1}
            onChange={(e) => {
              setName1(e.target.value);
              setFieldError(null);
            }}
            placeholder={isPairs ? "First player" : "Enter your name"}
            className="w-full rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500
                       px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-aws-orange"
            disabled={isLoading}
            maxLength={50}
          />
        </div>

        {isPairs && (
          <div>
            <label
              htmlFor="name2"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Player 2 name
            </label>
            <input
              id="name2"
              type="text"
              autoComplete="off"
              value={name2}
              onChange={(e) => {
                setName2(e.target.value);
                setFieldError(null);
              }}
              placeholder="Second player"
              className="w-full rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500
                         px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-aws-orange"
              disabled={isLoading}
              maxLength={50}
            />
          </div>
        )}

        {/* Validation / API error feedback */}
        {(fieldError ?? errorMessage) && (
          <p role="alert" className="text-red-400 text-sm">
            {fieldError ?? errorMessage}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-aws-orange text-aws-dark font-semibold text-lg
                     py-3 px-6 transition-opacity hover:opacity-90 active:opacity-80
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Joining…" : "Start Challenge"}
        </button>
      </form>

      {/* Mode badge */}
      <p className="mt-8 text-xs text-gray-600 uppercase tracking-widest">
        {isPairs ? "Pairs mode" : "Single-player mode"}
      </p>
    </div>
  );
}
