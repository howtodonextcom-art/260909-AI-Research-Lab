import { MEGA_645, validateNumbers } from "./mega645";
import { choose, outcomes } from "./profit";

export type PortfolioOdds = {
  tickets: number;
  cost: number;
  atLeast4: number;
  atLeast5: number;
  jackpot: number;
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

export function calculatePortfolioOdds(ticketCount: number): PortfolioOdds {
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 30) throw new Error("Số vé không hợp lệ.");
  const total = choose(45, 6);
  const single4 = outcomes.slice(4).reduce((sum, outcome) => sum + outcome.combinations, 0) / total;
  const single5 = outcomes.slice(5).reduce((sum, outcome) => sum + outcome.combinations, 0) / total;
  return {
    tickets: ticketCount,
    cost: ticketCount * MEGA_645.ticketPrice,
    atLeast4: ticketCount * single4,
    atLeast5: ticketCount * single5,
    jackpot: ticketCount / total,
  };
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
