import {
  spin, freeSpin, collectStickyWilds, winTier,
  LINE_COUNT, type WinTier,
} from './src/game/core';

const SPINS = 2_000_000;
const BET_PER_LINE = 2;
const TOTAL_BET = BET_PER_LINE * LINE_COUNT;

let wagered = 0;
let returned = 0;
let baseReturned = 0;
let freeReturned = 0;
let hitCount = 0;
let bonusTriggers = 0;
let maxWin = 0;

const tiers: Record<WinTier, number> = { none: 0, small: 0, medium: 0, big: 0, mega: 0 };

for (let i = 0; i < SPINS; i++) {
  wagered += TOTAL_BET;
  const r = spin(BET_PER_LINE);
  let spinTotal = r.totalWin;
  baseReturned += r.totalWin;

  if (r.freeSpinsAwarded > 0) {
    bonusTriggers++;
    let sticky = collectStickyWilds(r.grid, new Map());
    let remaining = r.freeSpinsAwarded;

    while (remaining > 0) {
      remaining--;
      const fr = freeSpin(BET_PER_LINE, sticky);
      spinTotal += fr.totalWin;
      freeReturned += fr.totalWin;
      sticky = collectStickyWilds(fr.grid, sticky);
      if (fr.freeSpinsAwarded > 0) remaining += 3; // ретриггер
    }
  }

  returned += spinTotal;
  if (spinTotal > 0) hitCount++;
  if (spinTotal > maxWin) maxWin = spinTotal;
  tiers[winTier(spinTotal, TOTAL_BET)]++;
}

const pct = (n: number) => (n * 100).toFixed(2) + '%';

console.log('─'.repeat(52));
console.log(`Спинов:            ${SPINS.toLocaleString('ru')}`);
console.log(`RTP общий:         ${pct(returned / wagered)}`);
console.log(`  базовая игра:    ${pct(baseReturned / wagered)}`);
console.log(`  фриспины:        ${pct(freeReturned / wagered)}`);
console.log(`Доля выплат из бонуса: ${pct(freeReturned / returned)}`);
console.log(`Частота выигрыша:  ${pct(hitCount / SPINS)}  (1 из ${(SPINS / hitCount).toFixed(1)})`);
console.log(`Частота бонуса:    1 из ${(SPINS / bonusTriggers).toFixed(0)} спинов`);
console.log(`Максимальный занос: ×${(maxWin / TOTAL_BET).toFixed(0)} от ставки`);
console.log('─'.repeat(52));
console.log('Распределение спинов:');
for (const [k, v] of Object.entries(tiers)) {
  console.log(`  ${k.padEnd(8)} ${pct(v / SPINS).padStart(8)}`);
}
console.log('─'.repeat(52));
