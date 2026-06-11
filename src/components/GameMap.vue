<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { buildingDefinitions } from '../data/buildings';
import type { GameTile, TileType } from '../types/game';

const game = useGameStore();

const tileLabels: Record<TileType, string> = {
  grass: 'Трава',
  forest: 'Лес',
  water: 'Вода',
  stone: 'Камень',
  ore: 'Руда',
  fertileSoil: 'Плодородная земля',
  swamp: 'Болото',
  ruins: 'Руины',
};

const mapStyle = computed(() => ({
  gridTemplateColumns: `repeat(${game.mapSize}, 32px)`,
  gridTemplateRows: `repeat(${game.mapSize}, 32px)`,
}));

function tileTitle(tile: GameTile) {
  if (!tile.discovered) return 'Неизведанная область';
  const building = tile.buildingId
    ? game.buildings.find((item) => item.id === tile.buildingId)
    : undefined;
  const buildingName = building ? ` · ${buildingDefinitions[building.type].name}` : '';

  return `${tileLabels[tile.type]}${buildingName}`;
}

function buildingMark(tile: GameTile) {
  const building = game.buildings.find((item) => item.id === tile.buildingId);

  return building ? buildingDefinitions[building.type].name[0] : '';
}
</script>

<template>
  <section class="map-area">
    <div class="map-toolbar">
      <span>Карта 30x30</span>
      <span>Клик: выбрать клетку</span>
      <span>Исследование открывает радиус 2</span>
    </div>

    <div class="map-scroll">
      <div class="map-grid" :style="mapStyle">
        <button
          v-for="tile in game.tiles"
          :key="tile.id"
          type="button"
          class="map-tile"
          :class="[
            tile.discovered ? `tile-${tile.type}` : 'tile-hidden',
            { selected: game.selected?.tile.id === tile.id },
          ]"
          :title="tileTitle(tile)"
          @click="game.selectTile(tile)"
          @dblclick="tile.discovered ? game.buildOnTile(tile) : game.discoverAround(tile)"
        >
          <span v-if="tile.discovered && tile.buildingId" class="building-mark">
            {{ buildingMark(tile) }}
          </span>
          <span v-else-if="tile.discovered" class="tile-mark">
            {{ tileLabels[tile.type][0] }}
          </span>
          <span v-else class="fog-mark">?</span>
        </button>
      </div>
    </div>
  </section>
</template>
