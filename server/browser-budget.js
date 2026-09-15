const fs = require('fs/promises');
const path = require('path');

// Reserve two 30-second units for each connection, including failed attempts.
function createBrowserBudget({ file = path.join(process.env.ARTWORK_CACHE_DIR || path.join(__dirname, '.cache'), 'browser-budget.json'), daily = Number(process.env.BROWSER_DAILY_UNIT_LIMIT ?? 20), monthly = Number(process.env.BROWSER_MONTHLY_UNIT_LIMIT ?? 600), now = () => new Date() } = {}) {
  let busy = false;
  return {
    async run(task) {
      if (busy) throw new Error('Banner extraction is busy. Please try again shortly.');
      if (!Number.isFinite(daily) || !Number.isFinite(monthly) || daily < 2 || monthly < 2) throw new Error('Banner extraction is temporarily paused. Cover downloads are still available.');
      busy = true;
      try {
        let usage;
        try { usage = JSON.parse(await fs.readFile(file, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw error; usage = {}; }
        const day = now().toISOString().slice(0,10), month = day.slice(0,7);
        if (usage.day !== day) { usage.day = day; usage.daily = 0; }
        if (usage.month !== month) { usage.month = month; usage.monthly = 0; }
        if (!Number.isFinite(usage.daily) || !Number.isFinite(usage.monthly)) throw new Error('Invalid browser budget ledger.');
        if (usage.daily + 2 > daily || usage.monthly + 2 > monthly) throw new Error('Banner extraction has reached its usage limit. Cover downloads are still available.');
        usage.daily += 2; usage.monthly += 2;
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file + '.tmp', JSON.stringify(usage));
        await fs.rename(file + '.tmp', file);
        return await task();
      } finally { busy = false; }
    }
  };
}
module.exports = { createBrowserBudget };
