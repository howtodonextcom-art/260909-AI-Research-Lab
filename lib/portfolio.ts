import { MEGA_645, formatBall, validateNumbers } from "./mega645";
import { choose, outcomes } from "./profit";

/**
 * §31: field names spell out exactly what kind of number this is, since the
 * distinction matters and is easy to get wrong (see `calculatePortfolioOdds`
 * below). `exactProbabilityAtLeast4`/`5`/`Jackpot` are honest names only
 * because of the pairwise-intersection proof documented there — they are
 * NOT a generic `ticketCount * singleTicketProbability` approximation.
 */
export type PortfolioOdds = {
  tickets: number;
  cost: number;
  exactProbabilityAtLeast4: number;
  exactProbabilityAtLeast5: number;
  exactProbabilityJackpot: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function intersectionSize(left: number[], right: number[]): number {
  const rightSet = new Set(right);
  return left.reduce((count, number) => count + Number(rightSet.has(number)), 0);
}

export function validatePortfolio(tickets: number[][]): boolean {
  if (!tickets.length || tickets.length > 30 || tickets.some((ticket) => !validateNumbers(ticket))) return false;
  for (let left = 0; left < tickets.length; left += 1) {
    for (let right = left + 1; right < tickets.length; right += 1) {
      if (intersectionSize(tickets[left], tickets[right]) > 1) return false;
    }
  }
  return true;
}

/**
 * §30 proof (kept next to the construction it proves, not just in the ADR):
 *
 * A projective plane of order 5 has 31 points and 31 lines ("blocks") of 6
 * points each, where ANY TWO DISTINCT BLOCKS SHARE EXACTLY ONE POINT — a
 * combinatorial theorem, not a property of this specific labelling. Relabel
 * the 31 points with 31 of the 45 Mega numbers (any bijection preserves
 * intersection sizes, since it is just a renaming) and each block becomes a
 * valid 6-number ticket. Therefore:
 *
 *   |ticket_i ∩ ticket_j| <= 1  for every i != j
 *
 * Consequence used by `calculatePortfolioOdds`: matching >= 4 of a fixed
 * 6-number draw requires a ticket to share >= 4 numbers with that draw. If
 * ticket_i and ticket_j both matched >= 4, they would share at least
 * 4 + 4 - 6 = 2 numbers with each other (pigeonhole on the 6 drawn
 * numbers) — contradicting the <= 1 bound above. So "ticket_i matches >= 4"
 * and "ticket_j matches >= 4" are mutually exclusive events for this
 * portfolio, for every pair. By inclusion-exclusion, mutually exclusive
 * events make P(union) = sum(P(each)) EXACTLY, with no double-counting term
 * to subtract — this is what makes the linear sum in
 * `calculatePortfolioOdds` an exact probability instead of a union-bound
 * approximation. This does NOT generalize to an arbitrary portfolio (§30);
 * it holds only because of the pairwise <= 1 guarantee proved here.
 */
export function optimizePortfolio(ticketCount: number, seed = 645): number[][] {
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 30) {
    throw new Error("Số vé phải là số nguyên từ 1 đến 30.");
  }
  const random = seededRandom(seed + ticketCount * 97);
  // Projective plane of order 5: 31 blocks of 6 points, each pair of blocks
  // intersects in exactly one point. A seeded relabeling turns points into
  // valid Mega numbers while preserving that provable overlap bound.
  const point = (x: number, y: number) => y * 5 + x;
  const blocks: number[][] = [];
  for (let slope = 0; slope < 5; slope += 1) {
    for (let intercept = 0; intercept < 5; intercept += 1) {
      blocks.push([
        ...Array.from({ length: 5 }, (_, x) => point(x, (slope * x + intercept) % 5)),
        25 + slope,
      ]);
    }
  }
  for (let x = 0; x < 5; x += 1) {
    blocks.push([...Array.from({ length: 5 }, (_, y) => point(x, y)), 30]);
  }
  blocks.push([25, 26, 27, 28, 29, 30]);

  const labels = shuffle(Array.from({ length: 45 }, (_, index) => index + 1), random).slice(0, 31);
  return shuffle(blocks, random)
    .slice(0, ticketCount)
    .map((block) => block.map((index) => labels[index]).sort((a, b) => a - b));
}

/**
 * PRECONDITION: `ticketCount` tickets must come from a portfolio with
 * pairwise intersection <= 1 (i.e. `optimizePortfolio`'s output, or
 * anything that passes `validatePortfolio`) — see the proof on
 * `optimizePortfolio` above. Under that precondition, "at least one ticket
 * matches >= 4/>= 5/= 6" are unions of mutually exclusive per-ticket
 * events, so the linear sum below is the EXACT probability, not an
 * approximation. This function only takes a count (not the actual
 * tickets) because it is always called on `optimizePortfolio`'s output in
 * this codebase; it does not itself verify the precondition, so do not
 * call it with a ticket count from a portfolio that was not built or
 * validated this way (§30/§31).
 */
export function calculatePortfolioOdds(ticketCount: number): PortfolioOdds {
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 30) throw new Error("Số vé không hợp lệ.");
  const total = choose(45, 6);
  const single4 = outcomes.slice(4).reduce((sum, outcome) => sum + outcome.combinations, 0) / total;
  const single5 = outcomes.slice(5).reduce((sum, outcome) => sum + outcome.combinations, 0) / total;
  return {
    tickets: ticketCount,
    cost: ticketCount * MEGA_645.ticketPrice,
    exactProbabilityAtLeast4: ticketCount * single4,
    exactProbabilityAtLeast5: ticketCount * single5,
    exactProbabilityJackpot: ticketCount / total,
  };
}

export function formatPortfolioTickets(tickets: number[][]): string {
  return tickets
    .map((ticket, index) => `${String(index + 1).padStart(2, "0")}: ${ticket.map(formatBall).join(" ")}`)
    .join("\n");
}

export async function copyTickets(
  tickets: number[][],
  writeText: (text: string) => Promise<void>,
): Promise<string> {
  const text = formatPortfolioTickets(tickets);
  await writeText(text);
  return text;
}

export function countCoveredPairs(tickets: number[][]): number {
  const pairs = new Set<string>();
  tickets.forEach((ticket) => {
    for (let left = 0; left < ticket.length; left += 1) {
      for (let right = left + 1; right < ticket.length; right += 1) {
        pairs.add(`${ticket[left]}-${ticket[right]}`);
      }
    }
  });
  return pairs.size;
}
