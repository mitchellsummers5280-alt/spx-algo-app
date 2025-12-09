// src/lib/spxNarrative.ts

// ---------------------------------------------
// Types
// ---------------------------------------------

export type TimeframeId = "4H" | "30m" | "15m" | "5m" | "3m" | "1m";

export type TimeframeSummary = {
  timeframe: TimeframeId;
  bias: string;
  status?: "Watching" | "Arming" | "Live" | "Invalidated";
  trend: string;
  liquidity: string;
  playbook: string;
  tag?: string;
  tagColor?: string;
};

export type MarketOverview = {
  direction: string;
  context: string;
  liquidity: string;
  expectation: string;
};

export type ExecutionView = {
  currentState: string;
  above: string;
  below: string;
  signal: string;
  action: string;
};

export type ModeView = {
  title: string;
  body: string;
};

export type SpxPrice = {
  last: number;
  change: number;
  changePct: number;
  session: "Pre" | "Regular" | "Post";
};

export type SpxAlgoState = {
  symbol: string;
  asOf: string;
  price: SpxPrice;
  marketOverview: MarketOverview;
  timeframes: TimeframeSummary[];
  executionView: ExecutionView;
  modes: {
    ict: ModeView;
    tjr: ModeView;
  };
};

// ---------------------------------------------
// Mock example data for current SPX context
// ---------------------------------------------

export const mockSpxAlgoState: SpxAlgoState = {
  symbol: "SPX",
  asOf: "2025-12-08T15:30:00Z",

  price: {
    last: 6870.39,
    change: 13.26,
    changePct: 0.19,
    session: "Regular",
  },

  marketOverview: {
    direction: "Bullish on higher timeframes.",
    context:
      "Price is above the 200 EMA on 4H and 30m with a series of higher highs and higher lows.",
    liquidity:
      "Buyside liquidity is resting above recent range highs; sellside liquidity sits near the rising 200 EMA and prior swing lows.",
    expectation:
      "Market is likely to target highs and sweep buyside liquidity before any deeper pullback into the 200 EMA zone.",
  },

  timeframes: [
    {
      timeframe: "4H",
      bias: "Bullish",
      status: "Watching",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
    {
      timeframe: "30m",
      bias: "Bullish Consolidation",
      status: "Live",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
    {
      timeframe: "15m",
      bias: "Bullish Compression",
      status: "Arming",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
    {
      timeframe: "5m",
      bias: "Bullish but Losing Momentum",
      status: "Invalidated",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
    {
      timeframe: "3m",
      bias: "Compression / Liquidity Build-Up",
      status: "Watching",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
    {
      timeframe: "1m",
      bias: "Execution – Waiting for Sweep",
      status: "Watching",
      trend: "...",
      liquidity: "...",
      playbook: "..."
    },
  ],

  executionView: {
    currentState:
      "Price is above the 200 EMA and chopping around the 20 EMA after a strong earlier move.",
    liquidity: {
      above: "Local 1m highs that have not yet been fully cleared.",
      below:
        "Equal lows near 6,860 with confluence at the 200 EMA and small imbalances.",
    },
    signal: "No confirmed entry yet – liquidity is still building.",
    action:
      "Wait for a sweep of either the highs or lows, then look for a 1m CHoCH and reclaim of the 20 EMA before entering. Avoid random scalps in the middle of the range.",
  },

  modes: {
    ict: {
      title: "ICT View",
      body:
        "Liquidity is stacked above recent range highs and below the rising 200 EMA on intraday charts. Buyside liquidity is likely to be taken before any meaningful sellside move. Look for a sweep of highs, a displacement candle away from that level, then a retrace into the fair value gap or 20 EMA to frame a long. If price trades below the 200 EMA on 5m and fails to reclaim it, treat this as a potential shift in narrative.",
    },
    tjr: {
      title: "What TJR Would Do",
      body:
        "Right now I see a market that’s still bullish overall but stuck in a tight range intraday. I’d wait for a clear sweep of liquidity – either a pop above the recent highs or a flush into the 200 EMA – and then a clean reclaim of the 20 EMA on 1m or 3m before taking a trade. I’m not shorting while we’re above the 200 EMA, and I’m not forcing entries in the middle of this chop.",
    },
  },
};
