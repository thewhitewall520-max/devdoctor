export interface DetectorRegistry {
  count: number;
}

export function createDetectorRegistry(): DetectorRegistry {
  return { count: 0 };
}
