import type { GeoLocation } from "./geo-location";
import type { Orientation } from "./orientation";
import type { TransformationVector } from "./transformation-vector";

export interface TrackNodeModel {
  id: string,
  location: GeoLocation,
  vector: TransformationVector,
  orientation: Orientation
}