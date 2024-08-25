<template>
  <div class="finder-container">
    <div v-if="!arrived" class="sbb-app-view">
      <img src="/sbb_change_screen.jpg" @click="arrived = true" />
    </div>
    <div v-else class="tiles">
      <span class="back-link" @click="arrived = false">&lt;</span>
      <img src="/sbb-logo.svg" class="logo" alt="SBB Logo" />
      <h4 class="heading-title">SBB TrackMate</h4>
      <div class="heading-bar-container">
        <div class="heading-bar">{{ userStatus }}</div>
      </div>
      <div class="tile no-padding position-relative">
        <img :src="currentImage" id="CurrentImage" alt="Current Image" />
        <canvas id="DetectionOverlay" style="position: absolute; top: 0; left: 0; pointer-events: none;"></canvas>
      </div>
      <div class="tile">
        <img class="announcement" :class="{ 'disabled': !announcementAvailable }" :click="repeatAnnouncement" src="/announcement.svg" alt="Announcement" />
      </div>
      <div class="tile tile-wide">{{ announcementText }}</div>
      <div class="tile tile-wide debug-tile">
        <h5>Debug</h5>
        <p>Track ID: {{ currentTrackId }}</p>
        <p v-if="!lastNodeFound">Searching for track-nodes</p>
        <p v-else>Found node: {{ lastNodeFound?.trackNodeId }} (similarity: {{ lastNodeFound?.similarity }}, dist: {{ lastNodeFound?.distance }})</p>
        <p>Images queried: {{ imagesQueried }}</p>
        <p>{{ status }}</p>
      </div>
    </div>
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
  </div>
</template>

<script lang="ts">
import type { FoundTrackNodeModel } from "@/models/found-track-node-model";
import { ImageCaptureService } from "@/services/image-capture-service";
import { ObjectDetectionService } from "@/services/object-detection-service";
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';

export default defineComponent({
  name: 'HomeView',

  setup() {
    const objectDetectionService = new ObjectDetectionService(import.meta.env.VITE_OBJECTDETECTION_URL);
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    let imageCaptureService: ImageCaptureService;

    let imageCaptureInterval: number | null = null;
    let imageQueryInterval: number | null = null;
    let startTrackInterval: number | null = null;
    let lastAnnouncement: string | null = null;

    const startNodeId = "3043adb1-63f2-4786-bf95-723ab0684cd6";
    const goalNodeId = "cca513e5-6209-45d5-9792-351df794e3c0";
    const enableAudioAnouncement = false;

    const arrived = ref<boolean>(false);
    const trackNavigationFinished = ref<boolean>(false);
    const currentTrackId = ref<string | null>(null);
    const userStatus = ref<string>("");
    const status = ref<string>("");
    const currentImage = ref<string>("");
    const lastNodeFound = ref<FoundTrackNodeModel | null>(null);
    const imageQueryIntervalMs = ref(500);
    const isQuerying = ref(false);
    const imagesQueried = ref(0);
    const announcementAvailable = ref(false);
    const announcementText = ref("");
    const isDetecting = ref(false);

    const repeatAnnouncement = () => {
      status.value = "Announcement repeated";
      playAnnouncement();
    }

    const captureImage = async () => {
      if (!arrived.value) {
        return;
      }

      const image = await imageCaptureService.extractImage();
      currentImage.value = `data:image/jpeg;base64,${image.imageDataBase64}`;

      detectObjects(image.imageData!);
    }

    const detectObjects = async (imageData: ImageData) => {
      if (isDetecting.value) {
        return;
      }

      isDetecting.value = true;
      try {
        const objects = await objectDetectionService.detectObjects(imageData);

        if (objects.length === 0) {
          status.value = "No objects detected";
        } else {
          status.value = `Detected ${objects.length} objects`;
        }

        // Get the image and canvas elements
        const imageElement = document.getElementById("CurrentImage") as HTMLImageElement;
        const canvas = document.getElementById("DetectionOverlay") as HTMLCanvasElement;

        // Resize the canvas to match the image size
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

        // Draw rectangles and labels for each detected object
        objects.forEach((object: any) => {
          const x1 = object.coordinates[0];
          const y1 = object.coordinates[1];
          const x2 = object.coordinates[2];
          const y2 = object.coordinates[3];
          const label = object.class_name;
          const distance = object.distance;

          ctx.strokeStyle = "red";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            x1 * imageElement.width / 256,
            y1 * imageElement.height / 256,
            (x2 - x1) * imageElement.width / 256,
            (y2 - y1) * imageElement.height / 256
          );

          ctx.font = "16px Arial";
          ctx.fillStyle = "red";
          ctx.fillText(
            `${label} (${distance.toFixed(2)}m)`,
            x1 * imageElement.width / 256,
            y1 * imageElement.height / 256 - 10
          );
        });
      } catch (error) {
        console.error('Error during object detection:', error);
      } finally {
        isDetecting.value = false;
      }
    };

    const playAnnouncement = () => {
      if (!enableAudioAnouncement) {
        return;
      }

      const audio = new Audio();
      audio.src = `data:audio/wav;base64,${lastAnnouncement}`;
      audio.loop = false;
      audio.play();
    }

    const queryImage = async () => {
      if (isQuerying.value || !arrived.value || trackNavigationFinished.value || !currentTrackId.value) {
        return;
      }

      isQuerying.value = true;
      try {
        const image = await imageCaptureService.extractImage();
        await webSocketService.uploadTrackImage({
          trackId: currentTrackId.value,
          pictureBase64: image.imageDataBase64,
          mimeType: "image/jpeg",
          imageData: undefined
        });
        imagesQueried.value++;
      } catch (error: any) {
        status.value = error;
      }
      finally {
        isQuerying.value = false;
      }
    }

    const startTrack = async () => {
      if (!arrived.value) {
        return;
      }

      if (currentTrackId.value) {
        if (startTrackInterval) {
          clearInterval(startTrackInterval);
        }
        return;
      }

      try {
        currentTrackId.value = await webSocketService.startTrack({
          startTrackNodeId: startNodeId,
          goalTrackNodeId: goalNodeId
        });
      } catch (error: any) {
        status.value = error;
      }
    }

    const uiUpdateInterval = setInterval(async () => {
      if (!lastNodeFound.value) {
        const baseMessage = "Suche nach Startpunkt";
        // Add 3 dots to the message every 500ms
        userStatus.value = baseMessage + ".".repeat(((Date.now() / 500) % 3) + 1);
      } else if (!trackNavigationFinished.value) {
        const baseMessage = "Auf dem Weg zum Ziel";
        // Add 3 dots to the message every 500ms
        userStatus.value = baseMessage + ".".repeat(((Date.now() / 500) % 3) + 1);
      } else {
        userStatus.value = "Ziel erreicht";
        announcementText.value = "Wunderbar, Du hast das Ziel erreicht! Danke dass Du SBB TrackMate benutzt hast.";
        lastAnnouncement = null;

        await webSocketService.endTrack(currentTrackId.value!);
        currentTrackId.value = null;
      }
    }, 500);

    onMounted(async () => {

      await webSocketService.connect();

      webSocketService.onHubEvent("UserJoined", () => {
        console.log("User joined");
      });

      webSocketService.onHubEvent("TrackCompleted", () => {
        console.log("Track completed");
      });

      webSocketService.onHubEvent("TrackPositionPictureMatched", (data: FoundTrackNodeModel) => {
        status.value = data ? "Position found" : "Position not found";
        if (data && data.trackNodeId) {
          lastNodeFound.value = data;
          imageQueryIntervalMs.value = 1000;
        } else {
          imageQueryIntervalMs.value = Math.max(500, imageQueryIntervalMs.value / 2);
        }

        if (data.trackNodeId === goalNodeId) {
          trackNavigationFinished.value = true;
          if (imageQueryInterval) {
            clearInterval(imageQueryInterval);
          }
          return;
        }

        if (imageQueryInterval) {
          clearInterval(imageQueryInterval);
          imageQueryInterval = setInterval(queryImage, imageQueryIntervalMs.value);
        }
      })

      webSocketService.onHubEvent("InstructionAudio", (mp3AudioAsBase64: string) => {
        if (!enableAudioAnouncement) {
          return;
        }

        announcementAvailable.value = true;
        lastAnnouncement = mp3AudioAsBase64;

        playAnnouncement();
      });

      webSocketService.onHubEvent("InstructionText", (text: string) => {
        announcementAvailable.value = true;
        announcementText.value = text;
      });

      const video = document.getElementById("video") as HTMLCanvasElement;
      imageCaptureService = new ImageCaptureService(video);
      imageCaptureService.requestPermissions();
      imageCaptureService.startCapture();

      startTrackInterval = setInterval(startTrack, 1000);

      imageCaptureInterval = setInterval(captureImage, 500);
      imageQueryInterval = setInterval(queryImage, imageQueryIntervalMs.value);
    });

    onUnmounted(async () => {
      imageCaptureService.stopCapture();
      webSocketService.disconnect();
      if (imageCaptureInterval) {
        clearInterval(imageCaptureInterval);
      }
      if (imageQueryInterval) {
        clearInterval(imageQueryInterval);
      }
      if (uiUpdateInterval) {
        clearInterval(uiUpdateInterval);
      }
    });

    return {
      arrived,
      currentTrackId,
      userStatus,
      status,
      currentImage,
      imagesQueried,
      announcementAvailable,
      announcementText,
      lastNodeFound,
      repeatAnnouncement
    }
  },
})
</script>

<style lang="scss">
.finder-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  color: #fff;

  .sbb-app-view {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;

    img {
      width: 100%;
      height: 100%;
      object-fit: fill;

      @media (min-width: 768px) {
        object-fit: contain;
      }
    }
  }

  .video-container {
    display: none;
  }

  .tiles {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 20px;
    width: 100%;
    height: 100%;

    padding: 25px;
    padding-top: 125px;

    background: #000;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 75px;
      background: #e70000;
    }

    .logo {
      position: absolute;
      top: 0;
      right: 10px;
      width: 60px;
      height: 60px;
    }

    .back-link {
      position: absolute;
      top: 0;
      left: 10px;
      font-size: 2.5rem;
      color: #fff;
      cursor: pointer;

      display: inline-block;
      transform: scaleX(0.5);
      font-weight: bold;
    }

    .heading-title {
      position: absolute;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);

      color: #fff;
    }

    .heading-bar-container {
      position: absolute;
      top: 55px;
      left: 0;
      right: 0;
      width: 100%;

      z-index: 2;

      .heading-bar {
        background: #212121;
        border-radius: 15px;

        margin: 0 25px;
        padding: 10px 30px;

        color: #fff;
      }
    }

    .tile {
      background: #212121;
      border-radius: 15px;
      padding: 15px;

      &.no-padding {
        padding: 0;
      }

      img {
        width: 100%;
        height: 100%;
        border-radius: 15px;

        &.announcement {
          width: 100%;
          height: auto;

          &.disabled {
            opacity: 0.2;
          }
        }
      }

      &.debug-tile {
        line-height: 1rem;
      }
    }

    .tile-wide {
      grid-column: span 2;
    }
  }
}
</style>
