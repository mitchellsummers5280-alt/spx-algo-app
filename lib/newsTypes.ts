export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  timestamp: number;
  sentiment?: number; // -1 to +1
  impactScore?: number; // 0–100 impact on SPX
};

export type NewsSettings = {
  isImpactEnabled: boolean;
};
