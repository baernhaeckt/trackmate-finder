<template>
  <div class="container container-fluid">
    <RouterView />
  </div>
</template>

<script lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  components: {
    RouterLink,
    RouterView,
  },
})
</script>

<style scoped></style>
