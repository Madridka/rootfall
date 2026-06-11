<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';

const game = useGameStore();
const showCompleted = ref(false);

const modifierLabels: Record<string, string> = {
  scarceWood: 'Мало дерева',
  distantWater: 'Далёкая вода',
  poorSoil: 'Бедная почва',
  richOre: 'Богатая руда',
  earlyCold: 'Ранний холод',
  frequentRain: 'Частые ливни',
  fragileFood: 'Хрупкая еда',
  rockyGround: 'Каменистая земля',
};

const eventToneTitle = computed(() => ({
  info: 'Событие',
  warning: 'Предупреждение',
  success: 'Успех',
  danger: 'Опасность',
}));
</script>

<template>
  <aside class="side-panel left-panel">
    <section class="panel-section">
      <div class="section-heading">
        <h2>Цели</h2>
        <button type="button" class="ghost-button" @click="showCompleted = !showCompleted">
          {{ showCompleted ? 'Скрыть' : 'Готовые' }}
        </button>
      </div>

      <article
        v-for="objective in game.activeObjectives"
        :key="objective.id"
        class="objective-card"
        :class="{ fresh: objective.justUnlocked }"
      >
        <div class="objective-title">
          <span>{{ objective.title }}</span>
          <small>{{ objective.category }}</small>
        </div>
        <p>{{ objective.description }}</p>
        <div class="progress-track">
          <span :style="{ width: `${game.objectiveProgress(objective).percent}%` }"></span>
        </div>
        <small>
          {{ game.objectiveProgress(objective).current }} /
          {{ game.objectiveProgress(objective).target }}
        </small>
      </article>

      <div v-if="showCompleted" class="completed-list">
        <article v-for="objective in game.completedObjectives" :key="objective.id" class="completed-row">
          {{ objective.title }}
        </article>
      </div>
    </section>

    <section class="panel-section">
      <h2>Предупреждения</h2>
      <article v-for="disaster in game.warningDisasters" :key="disaster.id" class="warning-card">
        <strong>{{ disaster.title }}</strong>
        <span>День {{ disaster.startsOnDay }}</span>
        <p>{{ disaster.description }}</p>
      </article>
      <article v-for="disaster in game.activeDisasters" :key="disaster.id" class="danger-card">
        <strong>{{ disaster.title }}</strong>
        <span>до дня {{ disaster.endsOnDay }}</span>
        <p>{{ disaster.description }}</p>
      </article>
      <p v-if="game.warningDisasters.length === 0 && game.activeDisasters.length === 0" class="muted">
        Крупных угроз сейчас нет.
      </p>
    </section>

    <section class="panel-section">
      <h2>Поселение</h2>
      <div class="stat-grid">
        <span>Жители</span>
        <b>{{ game.settlementStatus.population }}</b>
        <span>Жильё</span>
        <b>{{ game.settlementStatus.housingCapacity }}</b>
        <span>Склад</span>
        <b>{{ game.settlementStatus.storageCapacity }}</b>
        <span>Здоровье</span>
        <b>{{ game.settlementStatus.averageHealth }}</b>
        <span>Настроение</span>
        <b>{{ game.settlementStatus.averageMood }}</b>
      </div>
    </section>

    <section class="panel-section">
      <h2>Мир</h2>
      <div class="tag-list">
        <span v-for="modifier in game.worldModifiers" :key="modifier">{{ modifierLabels[modifier] }}</span>
      </div>
    </section>

    <section class="panel-section">
      <h2>Журнал</h2>
      <ol class="event-list">
        <li v-for="event in game.events" :key="event.id" :class="event.tone">
          <small>День {{ event.day }} · {{ eventToneTitle[event.tone] }}</small>
          <span>{{ event.text }}</span>
        </li>
      </ol>
    </section>
  </aside>
</template>
