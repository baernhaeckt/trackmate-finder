
export class ObjectDetectionService {
  private _objectDetectionUrl: string;

  constructor(objectDetectionUrl: string) {
    this._objectDetectionUrl = objectDetectionUrl
  }

  async detectObjects(image: ImageData) {
    // Create a canvas element to draw the image
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    // Get canvas context and draw the image
    const ctx = canvas.getContext('2d');
    ctx!.putImageData(image, 0, 0);

    // Convert the canvas image to a Blob
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));

    // Create FormData and append the Blob
    const formData = new FormData();
    // Change 'image' to 'file' to match what the server expects
    formData.append('file', blob, 'image.png');

    const response = await fetch(this._objectDetectionUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status} ${response.statusText}`);
    }

    const detectedObjects = await response.json();
    return detectedObjects;
  }
}