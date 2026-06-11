<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import type { GameSpeed, ResourceType } from '../types/game';

const game = useGameStore();
const resourceLabels: Record<ResourceType, string> = {
  wood: 'Дерево',
  food: 'Еда',
  water: 'Вода',
  stone: 'Камень',
  ore: 'Руда',
  fuel: 'Топливо',
  metal: 'Металл',
  energy: 'Энергия',
};

const resourceOrder = Object.keys(resourceLabels) as ResourceType[];
const seasonLabel = computed(() => {
  const labels = {
    spring: 'Весна',
    summer: 'Лето',
    autumn: 'Осень',
    winter: 'Зима',
  };

  return labels[game.currentSeason];
});

const speedOptions: Array<{ label: string; value: GameSpeed }> = [
  { label: 'Пауза', value: 0 },
  { label: 'x1', value: 1 },
  { label: 'x2', value: 2 },
  { label: 'x3', value: 3 },
];
</script>

<template>
  <header class="top-bar">
    <div class="brand-block">
      <strong>Rootfall</strong>
      <span>День {{ game.currentDay }} · {{ seasonLabel }} · цикл {{ game.seasonCycle }}</span>
    </div>

    <div class="resource-strip" aria-label="Ресурсы">
      <span v-for="resource in resourceOrder" :key="resource" class="resource-pill">
        <b>{{ resourceLabels[resource] }}</b>
        {{ Math.floor(game.resources[resource]) }}
      </span>
    </div>

    <div class="speed-control" aria-label="Скорость игры">
      <button
        v-for="option in speedOptions"
        :key="option.value"
        type="button"
        :class="{ active: game.speed === option.value }"
        @click="game.setSpeed(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </header>
</template>
