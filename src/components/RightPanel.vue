<script setup lang="ts">
import { computed } from 'vue';
import { buildingDefinitions, buildingOrder } from '../data/buildings';
import { useGameStore } from '../stores/gameStore';
import type { BuildingType, ResidentJob } from '../types/game';

const game = useGameStore();

const jobOptions: Array<{ value: ResidentJob; label: string }> = [
  { value: 'builder', label: 'Строитель' },
  { value: 'woodcutter', label: 'Лесоруб' },
  { value: 'forager', label: 'Сборщик' },
  { value: 'waterCarrier', label: 'Водонос' },
  { value: 'miner', label: 'Шахтёр' },
  { value: 'smelter', label: 'Плавильщик' },
  { value: 'farmer', label: 'Фермер' },
];

const selectedBuilding = computed(() => game.selected?.building);
const selectedTile = computed(() => game.selected?.tile);

function costText(type: BuildingType) {
  return Object.entries(buildingDefinitions[type].cost)
    .map(([resource, amount]) => `${resource}: ${amount}`)
    .join(', ');
}

function changeResidentJob(residentId: string, event: Event) {
  const target = event.target as HTMLSelectElement;
  game.assignJob(residentId, target.value as ResidentJob);
}
</script>

<template>
  <aside class="side-panel right-panel">
    <section class="panel-section">
      <h2>Постройки</h2>
      <div class="build-list">
        <button
          v-for="type in buildingOrder"
          :key="type"
          type="button"
          class="build-button"
          :class="{ active: game.selectedBuildingType === type }"
          :disabled="!game.unlockedBuildings.has(type)"
          @click="game.selectBuilding(type)"
        >
          <span>
            <b>{{ buildingDefinitions[type].name }}</b>
            <small>{{ costText(type) || 'без стоимости' }}</small>
          </span>
          <em v-if="!game.unlockedBuildings.has(type)">закрыто</em>
        </button>
      </div>

      <button
        type="button"
        class="primary-action"
        :disabled="!selectedTile"
        @click="selectedTile && game.buildOnTile(selectedTile)"
      >
        Построить выбранное
      </button>
    </section>

    <section class="panel-section">
      <h2>Выбрано</h2>
      <div v-if="selectedTile" class="selected-card">
        <div class="stat-grid">
          <span>Координаты</span>
          <b>{{ selectedTile.x }}:{{ selectedTile.y }}</b>
          <span>Тип</span>
          <b>{{ selectedTile.discovered ? selectedTile.type : 'скрыто' }}</b>
          <span>Ресурс</span>
          <b>{{ selectedTile.discovered ? selectedTile.resourceAmount : 0 }}</b>
        </div>

        <div v-if="selectedBuilding" class="building-details">
          <strong>{{ buildingDefinitions[selectedBuilding.type].name }}</strong>
          <p>{{ buildingDefinitions[selectedBuilding.type].description }}</p>
          <div class="progress-track">
            <span :style="{ width: `${selectedBuilding.progress}%` }"></span>
          </div>
          <small>Готовность {{ Math.floor(selectedBuilding.progress) }}%</small>
        </div>

        <div class="inline-actions">
          <button type="button" @click="game.gatherFromTile(selectedTile)">Собрать ресурс</button>
          <button type="button" @click="game.discoverAround(selectedTile)">Исследовать рядом</button>
        </div>
      </div>
      <p v-else class="muted">Выбери клетку на карте.</p>
    </section>

    <section class="panel-section">
      <h2>Жители</h2>
      <article v-for="resident in game.residents" :key="resident.id" class="resident-row">
        <div>
          <strong>{{ resident.name }}</strong>
          <small>{{ resident.currentTask }}</small>
        </div>
        <select :value="resident.job" @change="changeResidentJob(resident.id, $event)">
          <option v-for="job in jobOptions" :key="job.value" :value="job.value">
            {{ job.label }}
          </option>
        </select>
        <div class="resident-bars">
          <span :style="{ width: `${resident.health}%` }" title="Здоровье"></span>
          <span :style="{ width: `${resident.energy}%` }" title="Энергия"></span>
          <span :style="{ width: `${resident.mood}%` }" title="Настроение"></span>
        </div>
      </article>
    </section>
  </aside>
</template>
