<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import GameMap from './components/GameMap.vue';
import LeftPanel from './components/LeftPanel.vue';
import RightPanel from './components/RightPanel.vue';
import TopBar from './components/TopBar.vue';
import { useGameStore } from './stores/gameStore';

const game = useGameStore();
let loopId: number | undefined;

onMounted(() => {
  loopId = window.setInterval(() => {
    game.advanceTick();
  }, 850);
});

onBeforeUnmount(() => {
  if (loopId) window.clearInterval(loopId);
});
</script>

<template>
  <main class="game-layout">
    <TopBar />
    <section class="game-content">
      <LeftPanel />
      <GameMap />
      <RightPanel />
    </section>
  </main>
</template>
