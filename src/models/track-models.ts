
export interface StartTrackModel {
  startTrackNodeId: string,
  goalTrackNodeId: string
}

export interface UploadTrackStepModel {
  trackId: string,
  mimeType: string,
  pictureBase64: string
  imageData: ImageData | undefined
}

export interface TrackEventData {
  // TODO
}