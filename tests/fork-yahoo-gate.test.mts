// 83s1c fork: request-time Yahoo calls fail closed unless the deployment opts in.
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { yahooGate } from '../server/_shared/constants.ts';

const saved = { ctx: process.env.NODE_TEST_CONTEXT, flag: process.env.VITE_MARKET_QUOTES };
afterEach(() => {
  process.env.NODE_TEST_CONTEXT = saved.ctx;
  if (saved.flag === undefined) delete process.env.VITE_MARKET_QUOTES;
  else process.env.VITE_MARKET_QUOTES = saved.flag;
});

describe('fork yahooGate', () => {
  it('refuses when VITE_MARKET_QUOTES is unset or not "1" (production path)', async () => {
    delete process.env.NODE_TEST_CONTEXT;
    for (const value of [undefined, '0', 'true']) {
      if (value === undefined) delete process.env.VITE_MARKET_QUOTES;
      else process.env.VITE_MARKET_QUOTES = value;
      await assert.rejects(yahooGate(), /market quotes disabled/, String(value));
    }
  });

  it('allows the desk deployment (VITE_MARKET_QUOTES=1)', async () => {
    delete process.env.NODE_TEST_CONTEXT;
    process.env.VITE_MARKET_QUOTES = '1';
    await yahooGate();
  });
});
