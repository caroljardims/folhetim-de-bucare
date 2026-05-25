import {
  ALL_BUCARE_LOCATIONS,
  LOCATION_LABEL_PT,
  locationVisitResultShortPt,
  type BucareLocation,
  type LocationVisitResultKind,
} from "folclore-game-engine";

export { ALL_BUCARE_LOCATIONS, LOCATION_LABEL_PT, locationVisitResultShortPt };
export type { BucareLocation, LocationVisitResultKind };

export function pickRandomBucareLocation(): BucareLocation {
  const list = ALL_BUCARE_LOCATIONS;
  return list[Math.floor(Math.random() * list.length)]!;
}
