
export interface StartTrackModel {
  startPoint: string,
  goalTrackNodeId: string
}

export interface UploadTrackStepModel {
  trackId: string,
  mimeType: string,
  imageDataBase64: string
  imageData: ImageData | undefined
}

export interface TrackStepResultModel {
  // TODO
}