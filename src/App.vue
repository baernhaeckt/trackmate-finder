<template>
  <main>
    <RouterView />
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

export default defineComponent({
  name: 'App',
  components: {
    RouterLink,
    RouterView,
  },
})
</script>

<style scoped></style>
