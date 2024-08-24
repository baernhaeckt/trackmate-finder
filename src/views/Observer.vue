<template>
  <div class="observer-tiles">
    <div class="pathfinder-tile">

    </div>
  </div>
</template>

<script lang="ts">
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onUnmounted, ref } from 'vue';

export default defineComponent({
  name: 'ObserverView',

  setup() {
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    webSocketService.connect();

    const currentTrackId = ref<string | null>(null);

    onUnmounted(async () => {
      webSocketService.disconnect();
    });

    return {
      currentTrackId,
    }
  },
})
</script>

<style lang="scss"></style>