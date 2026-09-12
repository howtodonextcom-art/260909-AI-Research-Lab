export const MEGA_645 = {
  min: 1,
  max: 45,
  pickCount: 6,
  ticketPrice: 10_000,
  totalCombinations: 8_145_060,
} as const;

/** Fixed prizes only. Jackpot is variable and must not enter a decision metric. */
export const FIXED_PRIZE = {
  FIRST: 10_000_000,
  SECOND: 300_000,
  THIRD: 30_000,
} as const;

export type PrizeTier = "JACKPOT" | "FIRST" | "SECOND" | "THIRD" | "NONE";

export type TicketResult = {
  tier: PrizeTier;
  label: string;
  matches: number;
  payout: number | null;
  matchedNumbers: number[];
};

const PRIZES: Record<PrizeTier, { label: string; payout: number | null }> = {
  JACKPOT: { label: "Jackpot", payout: null },
  FIRST: { label: "Giải Nhất", payout: FIXED_PRIZE.FIRST },
  SECOND: { label: "Giải Nhì", payout: FIXED_PRIZE.SECOND },
  THIRD: { label: "Giải Ba", payout: FIXED_PRIZE.THIRD },
  NONE: { label: "Chưa trúng giải", payout: 0 },
};

export function validateNumbers(numbers: number[]): boolean {
  return (
    numbers.length === MEGA_645.pickCount &&
    new Set(numbers).size === MEGA_645.pickCount &&
    numbers.every(
      (number) =>
        Number.isInteger(number) &&
        number >= MEGA_645.min &&
        number <= MEGA_645.max,
    )
  );
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("Giới hạn ngẫu nhiên phải là số nguyên dương.");
  }

  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);

  while (true) {
    globalThis.crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % maxExclusive;
  }
}

export function generateQuickPick(): number[] {
  const pool = Array.from(
    { length: MEGA_645.max - MEGA_645.min + 1 },
    (_, index) => index + MEGA_645.min,
  );

  for (let index = 0; index < MEGA_645.pickCount; index += 1) {
    const swapIndex = index + secureRandomInt(pool.length - index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, MEGA_645.pickCount).sort((a, b) => a - b);
}

export function evaluateTicket(ticket: number[], draw: number[]): TicketResult {
  if (!validateNumbers(ticket) || !validateNumbers(draw)) {
    throw new Error("Vé và kết quả phải gồm đúng 6 số khác nhau từ 01 đến 45.");
  }

  const drawSet = new Set(draw);
  const matchedNumbers = ticket.filter((number) => drawSet.has(number));
  const matches = matchedNumbers.length;
  const tier: PrizeTier =
    matches === 6
      ? "JACKPOT"
      : matches === 5
        ? "FIRST"
        : matches === 4
          ? "SECOND"
          : matches === 3
            ? "THIRD"
            : "NONE";

  return {
    tier,
    label: PRIZES[tier].label,
    payout: PRIZES[tier].payout,
    matches,
    matchedNumbers,
  };
}

export function formatBall(number: number): string {
  return number.toString().padStart(2, "0");
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
