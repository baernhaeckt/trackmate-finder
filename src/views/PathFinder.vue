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
      <div class="tile no-padding">
        <img :src="currentImage" alt="Current Image" />
      </div>
      <div class="tile"></div>
      <div class="tile tile-wide"></div>
      <div class="tile tile-wide">
        <h5>Debug</h5>
        <p>Track ID: {{ currentTrackId }}</p>
        <p>{{ status }}</p>
      </div>
    </div>
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
  </div>
</template>

<script lang="ts">
import { ImageCaptureService } from "@/services/image-capture-service";
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';

export default defineComponent({
  name: 'HomeView',

  setup() {
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    let imageCaptureService: ImageCaptureService;

    let imageCaptureInterval: number | null = null;
    let imageQueryInterval: number | null = null;

    const arrived = ref<boolean>(false);
    const currentTrackId = ref<string | null>(null);
    const userStatus = ref<string>("");
    const status = ref<string>("");
    const currentImage = ref<string>("");
    const lastNodeFound = ref<Date | null>(null);
    const imageQueryIntervalMs = ref(500);
    const isQuerying = ref(false);

    const captureImage = async () => {
      const image = await imageCaptureService.extractImage();
      currentImage.value = `data:image/jpeg;base64,${image.imageDataBase64}`;
    }

    const queryImage = async () => {
      if (isQuerying.value) {
        return;
      }

      isQuerying.value = true;
      try {
        const image = await imageCaptureService.extractImage();
        await webSocketService.uploadTrackImage({
          trackId: currentTrackId.value!,
          pictureBase64: image.imageDataBase64,
          mimeType: "image/jpeg",
          imageData: undefined
        });
      } catch (error: any) {
        status.value = error;
      }
      finally {
        isQuerying.value = false;
      }
    }

    const uiUpdateInterval = setInterval(() => {
      if (!lastNodeFound.value) {
        const baseMessage = "Suche nach Startpunkt";
        // Add 3 dots to the message every 500ms
        userStatus.value = baseMessage + ".".repeat(((Date.now() / 500) % 3) + 1);
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

      webSocketService.onHubEvent("TrackPositionPictureMatched", (data: boolean) => {
        status.value = data ? "Position found" : "Position not found";
        if (data) {
          lastNodeFound.value = new Date();
          imageQueryIntervalMs.value = 2000;
        } else {
          imageQueryIntervalMs.value = Math.max(500, imageQueryIntervalMs.value / 2);
        }
      })

      const video = document.getElementById("video") as HTMLCanvasElement;
      imageCaptureService = new ImageCaptureService(video);
      imageCaptureService.requestPermissions();
      imageCaptureService.startCapture();

      currentTrackId.value = await webSocketService.startTrack({
        startTrackNodeId: "01862996-aa15-43d4-b633-434d6582722d",
        goalTrackNodeId: "ba578b15-117e-4ae2-a82d-b01b48279a0d"
      });

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
      currentImage
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
        max-width: 100%;
        max-height: 100%;
        border-radius: 15px;
      }
    }

    .tile-wide {
      grid-column: span 2;
    }
  }
}
</style>
