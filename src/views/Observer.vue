<template>
  <div class="observer-container">
    <div class="tiles">
      <img src="/sbb-logo.svg" class="logo" alt="SBB Logo" />
      <h4 class="heading-title">SBB TrackMate Observer</h4>
      <div class="heading-bar-container">
        <div class="heading-bar">{{ userStatus }}</div>
      </div>
      <div class="tile no-padding position-relative">
      </div>
      <div class="tile">
      </div>
      <div class="tile tile-wide">
        <div class="map-container" id="MapContainer">
          <template v-if="trackNodes.length > 0">
            <div class="map">
              <template v-for="trackNode in trackNodes">
                <div class="track-node" :class="{ selected: currentTrackNodeId === trackNode.id }" :style="getTrackNodeStyles(trackNode, trackNodes)">
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
      <div class="tile tile-wide debug-tile">
        <h5>Debug</h5>
        <p>Track ID: {{ currentTrackId }}</p>
        <p>{{ status }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { FoundTrackNodeModel } from "@/models/found-track-node-model";
import type { TrackNodeModel } from "@/models/track-node-model";
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';

export default defineComponent({
  name: 'ObserverView',

  setup() {
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    webSocketService.connect();

    const joinedTrackIds: string[] = [];

    let joinAllTracksInterval: number | null = null;

    const status = ref<string>('Connecting...');
    const userStatus = ref<string>('User Status: Unknown');

    const currentTrackId = ref<string | null>(null);
    const currentTrackNodeId = ref<string | null>(null);
    const trackNodes = ref<TrackNodeModel[]>([]);

    const loadAllTrackNodes = async () => {
      trackNodes.value = await webSocketService.getAllTrackNodes();
    }

    const getTrackNodeStyles = (trackNode: TrackNodeModel, allTrackNodes: TrackNodeModel[]) => {
      // convert lat/long to x/y
      const mapElement = document.getElementById('MapContainer');
      if (!mapElement) return {};

      const minLatitude = Math.min(...allTrackNodes.map(node => node.location.latitude));
      const maxLatitude = Math.max(...allTrackNodes.map(node => node.location.latitude));
      const minLongitude = Math.min(...allTrackNodes.map(node => node.location.longitude));
      const maxLongitude = Math.max(...allTrackNodes.map(node => node.location.longitude));

      const x = (trackNode.location.longitude - minLongitude) / (maxLongitude - minLongitude) * mapElement.clientWidth;
      const y = (trackNode.location.latitude - minLatitude) / (maxLatitude - minLatitude) * mapElement.clientHeight;

      return {
        left: `${x}px`,
        top: `${y}px`,
      }
    }

    const joinAllRunningTracks = async () => {
      const allRunningTracks = await webSocketService.getRunningTracks();
      allRunningTracks.forEach(trackId => {
        if (!joinedTrackIds.includes(trackId)) {
          webSocketService.joinTrack(trackId);
          joinedTrackIds.push(trackId);
          console.log('Joined track', trackId);
        }
      });

      joinedTrackIds.filter(trackId => !allRunningTracks.includes(trackId)).forEach(trackId => {
        webSocketService.leaveTrack(trackId);
        joinedTrackIds.splice(joinedTrackIds.indexOf(trackId), 1);
      });

      userStatus.value = `User Status: ${allRunningTracks.length} running tracks`;
    }

    onMounted(async () => {
      await webSocketService.connect();
      status.value = 'Connected';

      webSocketService.onHubEvent("TrackPositionPictureMatched", (data: FoundTrackNodeModel) => {
        userStatus.value = data ? "Position found" : "Position not found";

        if (data) {
          currentTrackNodeId.value = data.trackNodeId;
          console.log('TrackPositionPictureMatched', data);

          setTimeout(() => {
            currentTrackNodeId.value = null;
          }, 2000);
        }
      });

      webSocketService.onHubEvent("UserJoined", () => {
        console.log('UserJoined');
      });

      await loadAllTrackNodes();

      joinAllTracksInterval = setInterval(async () => {
        await joinAllRunningTracks();
      }, 5000);
    });

    onUnmounted(async () => {
      joinedTrackIds.forEach(async trackId => {
        await webSocketService.leaveTrack(trackId);
      });

      await webSocketService.disconnect();

      if (joinAllTracksInterval) {
        clearInterval(joinAllTracksInterval);
      }
    });

    return {
      currentTrackId,
      currentTrackNodeId,
      status,
      userStatus,
      trackNodes,
      getTrackNodeStyles,
    }
  },
})
</script>

<style lang="scss">
.observer-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  color: #fff;

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

  .map-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 70vh;

    .map {
      position: relative;
      width: 100%;
      height: 100%;

      .track-node {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #fff;
        color: #000;
        font-size: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;

        &.selected {
          background: #e70000;
          color: #fff;
        }

        .track-node-inner {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }
    }
  }
}
</style>