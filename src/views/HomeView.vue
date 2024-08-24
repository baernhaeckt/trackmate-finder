<template>
  <div class="finder-container">
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
    <div class="overlay">
      <h1>Home</h1>
    </div>
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
    // webSocketService.connect();
    let imageCaptureService: ImageCaptureService;

    const currentTrackId = ref<string | null>(null);

    onMounted(async () => {
      const video = document.getElementById("video") as HTMLCanvasElement;
      imageCaptureService = new ImageCaptureService(video);
      imageCaptureService.requestPermissions();
      imageCaptureService.startCapture();
    });

    onUnmounted(async () => {
      imageCaptureService.stopCapture();
      webSocketService.disconnect();
    });

    return {
      currentTrackId,
    }
  },
})
</script>

<style lang="scss">
.finder-container {
  width: 100vw;
  height: 100vh;
  position: relative;

  .video-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    z-index: 0;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 1.5rem;
    z-index: 1;
  }
}
</style>
