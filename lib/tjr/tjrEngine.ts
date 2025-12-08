// lib/tjr/tjrEngine.ts
import { tjrComments } from "./tjrDictionary";

type SignalInput = {
  liquiditySweep?: boolean;
  bos?: boolean;
  premium?: boolean;
  discount?: boolean;
  chop?: boolean;
  timeOfDay?: "open" | "lunch" | "close";
  riskWarning?: boolean;
};

export function getTJRComment(signals: SignalInput): string {
  if (signals.liquiditySweep)
    return sample(tjrComments.liquidityGrab);

  if (signals.bos)
    return sample(tjrComments.breakOfStructure);

  if (signals.premium)
    return sample(tjrComments.premium);

  if (signals.discount)
    return sample(tjrComments.discount);

  if (signals.chop)
    return sample(tjrComments.chop);

  if (signals.timeOfDay)
    return tjrComments.timeOfDay[signals.timeOfDay];

  if (signals.riskWarning)
    return sample(tjrComments.risk);

  return "Market's talking… listen close bro.";
}

function sample(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
