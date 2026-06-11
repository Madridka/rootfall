import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { buildingDefinitions } from '../data/buildings';
import { initialObjectives } from '../data/objectives';
import type {
  Building,
  BuildingType,
  Disaster,
  GameEvent,
  GameSpeed,
  GameTile,
  Objective,
  ObjectiveRequirement,
  Position,
  Resident,
  ResidentJob,
  ResourceType,
  Resources,
  Season,
  SelectedTile,
  TileType,
  WorldModifier,
} from '../types/game';

const mapSize = 30;
const dayLengthInTicks = 60;
const seasonLengthInDays = 10;
const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const resourceKeys: ResourceType[] = [
  'wood',
  'food',
  'water',
  'stone',
  'ore',
  'fuel',
  'metal',
  'energy',
];

const residentNames = ['Ольха', 'Мох', 'Рябь', 'Искра', 'Тис'];

const startingResources: Resources = {
  wood: 55,
  food: 28,
  water: 22,
  stone: 18,
  ore: 0,
  fuel: 8,
  metal: 0,
  energy: 0,
};

function createRng(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function createResourcesPatch(): Resources {
  return {
    wood: 0,
    food: 0,
    water: 0,
    stone: 0,
    ore: 0,
    fuel: 0,
    metal: 0,
    energy: 0,
  };
}

function distanceToCenter(position: Position) {
  const center = (mapSize - 1) / 2;
  return Math.abs(position.x - center) + Math.abs(position.y - center);
}

function pickWorldModifiers(seed: number): WorldModifier[] {
  const pool: WorldModifier[] = [
    'scarceWood',
    'distantWater',
    'poorSoil',
    'richOre',
    'earlyCold',
    'frequentRain',
    'fragileFood',
    'rockyGround',
  ];
  const rng = createRng(seed);

  return [...pool]
    .sort(() => rng() - 0.5)
    .slice(0, 3);
}

export const useGameStore = defineStore('game', () => {
  const seed = ref(Date.now() % 100000);
  const worldModifiers = ref<WorldModifier[]>(pickWorldModifiers(seed.value));
  const resources = ref<Resources>({ ...startingResources });
  const producedTotals = ref<Resources>(createResourcesPatch());
  const selectedBuildingType = ref<BuildingType>('hut');
  const selected = ref<SelectedTile | null>(null);
  const tiles = ref<GameTile[]>([]);
  const buildings = ref<Building[]>([]);
  const residents = ref<Resident[]>([]);
  const objectives = ref<Objective[]>(initialObjectives.map((objective) => ({ ...objective })));
  const events = ref<GameEvent[]>([]);
  const disasters = ref<Disaster[]>([]);
  const unlockedBuildings = ref<Set<BuildingType>>(
    new Set(
      Object.values(buildingDefinitions)
        .filter((definition) => definition.unlockedByDefault)
        .map((definition) => definition.type),
    ),
  );
  const tick = ref(0);
  const speed = ref<GameSpeed>(1);
  const survivedDisasters = ref<Record<string, number>>({});
  const discoveredTileCount = ref(0);
  const discoveredByType = ref<Record<TileType, number>>({
    grass: 0,
    forest: 0,
    water: 0,
    stone: 0,
    ore: 0,
    fertileSoil: 0,
    swamp: 0,
    ruins: 0,
  });

  const currentDay = computed(() => Math.floor(tick.value / dayLengthInTicks) + 1);
  const currentSeasonIndex = computed(() =>
    Math.floor((currentDay.value - 1) / seasonLengthInDays) % seasons.length,
  );
  const currentSeason = computed(() => seasons[currentSeasonIndex.value]);
  const seasonCycle = computed(() =>
    Math.floor((currentDay.value - 1) / (seasonLengthInDays * seasons.length)) + 1,
  );
  const tickInDay = computed(() => tick.value % dayLengthInTicks);
  const activeObjectives = computed(() =>
    objectives.value.filter((objective) => objective.status === 'active'),
  );
  const completedObjectives = computed(() =>
    objectives.value.filter((objective) => objective.status === 'completed'),
  );
  const activeDisasters = computed(() =>
    disasters.value.filter((disaster) => disaster.status === 'active'),
  );
  const warningDisasters = computed(() =>
    disasters.value.filter((disaster) => disaster.status === 'warning'),
  );
  const housingCapacity = computed(() => countBuilt('hut') * 3);
  const storageCapacity = computed(() => 120 + countBuilt('storage') * 80);
  const settlementStatus = computed(() => {
    const averageMood = Math.round(
      residents.value.reduce((total, resident) => total + resident.mood, 0) /
        Math.max(1, residents.value.length),
    );
    const averageHealth = Math.round(
      residents.value.reduce((total, resident) => total + resident.health, 0) /
        Math.max(1, residents.value.length),
    );

    return {
      averageMood,
      averageHealth,
      housingCapacity: housingCapacity.value,
      storageCapacity: storageCapacity.value,
      population: residents.value.length,
    };
  });

  function tileAt(x: number, y: number) {
    return tiles.value[y * mapSize + x];
  }

  function countBuilt(type: BuildingType) {
    return buildings.value.filter((building) => building.type === type && building.progress >= 100)
      .length;
  }

  function addEvent(text: string, tone: GameEvent['tone'] = 'info') {
    events.value.unshift({
      id: crypto.randomUUID(),
      day: currentDay.value,
      text,
      tone,
    });
    events.value = events.value.slice(0, 28);
  }

  function generateMap() {
    const rng = createRng(seed.value);
    const modifiers = worldModifiers.value;
    const generated: GameTile[] = [];

    for (let y = 0; y < mapSize; y += 1) {
      for (let x = 0; x < mapSize; x += 1) {
        const roll = rng();
        const distance = distanceToCenter({ x, y });
        const nearCenter = distance < 7;
        let type: TileType = 'grass';

        if (roll < (modifiers.includes('scarceWood') ? 0.11 : 0.2)) type = 'forest';
        else if (roll < (modifiers.includes('rockyGround') ? 0.34 : 0.27)) type = 'stone';
        else if (roll < (modifiers.includes('poorSoil') ? 0.31 : 0.34)) type = 'fertileSoil';
        else if (roll < 0.4) type = 'swamp';
        else if (roll < 0.45) type = 'ruins';
        else if (roll < (modifiers.includes('richOre') ? 0.57 : 0.5)) type = 'ore';

        const waterBias = modifiers.includes('distantWater')
          ? !nearCenter && roll > 0.88
          : roll > 0.86 || (nearCenter && roll > 0.82);
        if (waterBias) type = 'water';

        const discovered = nearCenter;
        generated.push({
          id: `${x}-${y}`,
          x,
          y,
          type,
          discovered,
          resourceAmount: type === 'grass' ? 0 : Math.floor(20 + rng() * 50),
        });
      }
    }

    const center = Math.floor(mapSize / 2);
    const starterTiles: Array<[number, number, TileType]> = [
      [center, center, 'grass'],
      [center + 1, center, 'forest'],
      [center - 1, center, 'stone'],
      [center, center + 1, 'fertileSoil'],
      [center, center - 1, 'grass'],
    ];

    starterTiles.forEach(([x, y, type]) => {
      const tile = generated[y * mapSize + x];
      tile.type = type;
      tile.discovered = true;
      tile.resourceAmount = 35;
    });

    tiles.value = generated;
    recalculateDiscovery();
  }

  function createResidents() {
    const center = Math.floor(mapSize / 2);
    residents.value = residentNames.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      health: 100,
      hunger: 10 + index * 2,
      thirst: 10 + index,
      energy: 90,
      mood: 70,
      job: index === 0 ? 'builder' : 'forager',
      skill: 1 + index,
      x: center,
      y: center,
      currentTask: 'Ожидает задачи',
    }));
  }

  function recalculateDiscovery() {
    const counts: Record<TileType, number> = {
      grass: 0,
      forest: 0,
      water: 0,
      stone: 0,
      ore: 0,
      fertileSoil: 0,
      swamp: 0,
      ruins: 0,
    };

    discoveredTileCount.value = 0;
    tiles.value.forEach((tile) => {
      if (!tile.discovered) return;
      discoveredTileCount.value += 1;
      counts[tile.type] += 1;
    });
    discoveredByType.value = counts;
  }

  function canAfford(cost: Partial<Resources>) {
    return resourceKeys.every((key) => resources.value[key] >= (cost[key] ?? 0));
  }

  function spend(cost: Partial<Resources>) {
    resourceKeys.forEach((key) => {
      resources.value[key] -= cost[key] ?? 0;
    });
  }

  function addResource(type: ResourceType, amount: number) {
    const cappedAmount = Math.min(storageCapacity.value, resources.value[type] + amount);
    resources.value[type] = Math.max(0, cappedAmount);
    if (amount > 0) producedTotals.value[type] += amount;
  }

  function setSpeed(value: GameSpeed) {
    speed.value = value;
  }

  function selectBuilding(type: BuildingType) {
    selectedBuildingType.value = type;
  }

  function selectTile(tile: GameTile) {
    selected.value = {
      tile,
      building: buildings.value.find((building) => building.id === tile.buildingId),
    };
  }

  function buildOnTile(tile: GameTile) {
    const definition = buildingDefinitions[selectedBuildingType.value];

    if (!tile.discovered) {
      addEvent('Сначала исследуй эту область карты.', 'warning');
      return;
    }

    if (tile.buildingId) {
      addEvent('На клетке уже есть постройка.', 'warning');
      return;
    }

    if (!unlockedBuildings.value.has(definition.type)) {
      addEvent('Эта постройка ещё не открыта целями развития.', 'warning');
      return;
    }

    if (definition.requiredTile && !definition.requiredTile.includes(tile.type)) {
      addEvent(`${definition.name} требует другой тип клетки.`, 'warning');
      return;
    }

    if (!canAfford(definition.cost)) {
      addEvent('Не хватает ресурсов для строительства.', 'warning');
      return;
    }

    spend(definition.cost);
    const building: Building = {
      id: crypto.randomUUID(),
      type: definition.type,
      x: tile.x,
      y: tile.y,
      progress: 0,
      active: true,
      assignedResidentIds: [],
    };

    buildings.value.push(building);
    tile.buildingId = building.id;
    selected.value = { tile, building };
    addEvent(`Заложено строительство: ${definition.name}.`, 'info');
    evaluateObjectives();
  }

  function assignJob(residentId: string, job: ResidentJob) {
    const resident = residents.value.find((item) => item.id === residentId);
    if (!resident) return;

    resident.job = job;
    resident.currentTask = `Назначен: ${job}`;
    evaluateObjectives();
  }

  function discoverAround(tile: GameTile) {
    const radius = 2;
    let discovered = 0;

    for (let y = tile.y - radius; y <= tile.y + radius; y += 1) {
      for (let x = tile.x - radius; x <= tile.x + radius; x += 1) {
        if (x < 0 || y < 0 || x >= mapSize || y >= mapSize) continue;
        const target = tileAt(x, y);
        if (!target.discovered) {
          target.discovered = true;
          discovered += 1;
        }
      }
    }

    if (discovered > 0) {
      recalculateDiscovery();
      addEvent(`Исследовано клеток: ${discovered}.`, 'success');
      evaluateObjectives();
    }
  }

  function gatherFromTile(tile: GameTile) {
    if (!tile.discovered) {
      addEvent('Нельзя собирать ресурсы в неизведанной области.', 'warning');
      return;
    }

    if (tile.resourceAmount <= 0) {
      addEvent('На этой клетке больше нечего собрать.', 'warning');
      return;
    }

    const gatherTable: Record<TileType, Partial<Resources>> = {
      grass: {},
      forest: { wood: 8, fuel: 1 },
      water: { water: 8 },
      stone: { stone: 7 },
      ore: { ore: 4, stone: 2 },
      fertileSoil: { food: 5 },
      swamp: { food: 3, water: 3 },
      ruins: { wood: 4, stone: 5, fuel: 2 },
    };
    const result = gatherTable[tile.type];
    const gathered = Object.entries(result).filter(([, amount]) => (amount ?? 0) > 0);

    if (gathered.length === 0) {
      addEvent('Эта клетка не даёт полезных ресурсов.', 'warning');
      return;
    }

    gathered.forEach(([resource, amount]) => {
      addResource(resource as ResourceType, amount ?? 0);
    });
    tile.resourceAmount = Math.max(0, tile.resourceAmount - 10);
    addEvent(
      `Собрано: ${gathered.map(([resource, amount]) => `${amount} ${resource}`).join(', ')}.`,
      'success',
    );
    evaluateObjectives();
  }

  function processConstruction() {
    const builders = residents.value.filter((resident) => resident.job === 'builder');
    const constructionSites = buildings.value.filter((building) => building.progress < 100);

    constructionSites.forEach((building, index) => {
      const builder = builders[index % Math.max(1, builders.length)];
      const speedBonus = builder ? 5 + builder.skill : 2;
      building.progress = Math.min(100, building.progress + speedBonus);

      if (builder) {
        builder.x = building.x;
        builder.y = building.y;
        builder.currentTask = `Строит ${buildingDefinitions[building.type].name}`;
      }

      if (building.progress === 100) {
        addEvent(`Построено: ${buildingDefinitions[building.type].name}.`, 'success');
      }
    });
  }

  function hasInputs(consumes: Partial<Resources> | undefined) {
    if (!consumes) return true;
    return resourceKeys.every((key) => resources.value[key] >= (consumes[key] ?? 0));
  }

  function consumeInputs(consumes: Partial<Resources> | undefined) {
    if (!consumes) return;
    resourceKeys.forEach((key) => {
      resources.value[key] -= consumes[key] ?? 0;
    });
  }

  function productionMultiplier(building: Building) {
    const definition = buildingDefinitions[building.type];
    let multiplier = 1;

    if (currentSeason.value === 'winter' && building.type !== 'greenhouse') multiplier -= 0.2;
    if (activeDisasters.value.some((disaster) => disaster.type === 'drySeason') && building.type === 'well') {
      multiplier -= 0.4;
    }
    if (
      activeDisasters.value.some((disaster) => disaster.type === 'cropBlight') &&
      (building.type === 'forager' || building.type === 'greenhouse')
    ) {
      multiplier -= 0.35;
    }
    if (activeDisasters.value.some((disaster) => disaster.type === 'fog')) multiplier -= 0.15;
    if (definition.workerJob && !residents.value.some((resident) => resident.job === definition.workerJob)) {
      multiplier -= 0.5;
    }

    return Math.max(0.25, multiplier);
  }

  function processProduction() {
    buildings.value
      .filter((building) => building.progress >= 100 && building.active)
      .forEach((building) => {
        const definition = buildingDefinitions[building.type];
        if (!definition.produces || !hasInputs(definition.consumes)) return;

        consumeInputs(definition.consumes);
        Object.entries(definition.produces).forEach(([resource, amount]) => {
          addResource(resource as ResourceType, Math.ceil((amount ?? 0) * productionMultiplier(building)));
        });
      });
  }

  function processResidents() {
    const hasHousing = housingCapacity.value >= residents.value.length;
    const hasHeat =
      countBuilt('campfire') > 0 &&
      (resources.value.fuel > 0 || resources.value.wood > 0) &&
      activeDisasters.value.some((disaster) => disaster.type === 'coldSnap');

    residents.value.forEach((resident) => {
      resident.hunger = Math.min(100, resident.hunger + 2);
      resident.thirst = Math.min(100, resident.thirst + 3);
      resident.energy = Math.max(0, resident.energy - (hasHousing ? 3 : 6));

      if (resources.value.food > 0 && resident.hunger > 35) {
        resources.value.food -= 1;
        resident.hunger = Math.max(0, resident.hunger - 28);
      }

      if (resources.value.water > 0 && resident.thirst > 35) {
        resources.value.water -= 1;
        resident.thirst = Math.max(0, resident.thirst - 32);
      }

      if (hasHeat) {
        if (resources.value.fuel > 0) resources.value.fuel -= 1;
        else resources.value.wood -= 1;
      }

      const stress = resident.hunger + resident.thirst + (100 - resident.energy);
      resident.health = Math.max(0, Math.min(100, resident.health + (stress > 160 ? -3 : 1)));
      resident.mood = Math.max(0, Math.min(100, 82 - Math.floor(stress / 4)));
    });
  }

  function processDisasters() {
    const day = currentDay.value;

    disasters.value.forEach((disaster) => {
      if (disaster.status === 'warning' && day >= disaster.startsOnDay) {
        disaster.status = 'active';
        addEvent(`Началось событие: ${disaster.title}.`, 'danger');
      }

      if (disaster.status === 'active' && day > disaster.endsOnDay) {
        disaster.status = 'resolved';
        survivedDisasters.value[disaster.type] = (survivedDisasters.value[disaster.type] ?? 0) + 1;
        addEvent(`Событие завершено: ${disaster.title}.`, 'success');
      }
    });

    const plannedDays = new Set(disasters.value.map((disaster) => disaster.startsOnDay));
    const earlyColdOffset = worldModifiers.value.includes('earlyCold') ? 2 : 5;
    const frequentRain = worldModifiers.value.includes('frequentRain');
    const schedule: Array<Omit<Disaster, 'id' | 'status'>> = [
      {
        type: 'coldSnap',
        title: 'Ранний холод',
        warningDay: Math.max(1, earlyColdOffset),
        startsOnDay: earlyColdOffset + 2,
        endsOnDay: earlyColdOffset + 3,
        description: 'Через несколько дней станет холоднее. Подготовь топливо и тепло.',
      },
      {
        type: frequentRain ? 'heavyRain' : 'fog',
        title: frequentRain ? 'Затяжной ливень' : 'Густой туман',
        warningDay: 8,
        startsOnDay: 10,
        endsOnDay: 12,
        description: frequentRain
          ? 'Ливень замедлит дороги и ускорит порчу еды.'
          : 'Туман снизит скорость работ и ухудшит здоровье.',
      },
      {
        type: 'drySeason',
        title: 'Сухой период',
        warningDay: 15,
        startsOnDay: 18,
        endsOnDay: 21,
        description: 'Вода будет добываться медленнее. Нужен запас.',
      },
    ];

    schedule.forEach((item) => {
      if (day < item.warningDay || plannedDays.has(item.startsOnDay)) return;

      disasters.value.push({
        ...item,
        id: crypto.randomUUID(),
        status: 'warning',
      });
      addEvent(`Предупреждение: ${item.title}. ${item.description}`, 'warning');
    });
  }

  function processFoodSpoilage() {
    const rain = activeDisasters.value.some((disaster) => disaster.type === 'heavyRain');
    const fragileFood = worldModifiers.value.includes('fragileFood');
    const loss = rain ? 3 : fragileFood ? 1 : 0;
    if (loss > 0 && resources.value.food > 0) {
      resources.value.food = Math.max(0, resources.value.food - loss);
    }
  }

  function advanceTick() {
    if (speed.value === 0) return;

    for (let step = 0; step < speed.value; step += 1) {
      tick.value += 1;
      processConstruction();
      processProduction();

      if (tickInDay.value === 0) {
        processResidents();
        processDisasters();
        processFoodSpoilage();
        addEvent(`День ${currentDay.value}: ${currentSeason.value}.`, 'info');
      }

      evaluateObjectives();
    }
  }

  function requirementProgress(requirement: ObjectiveRequirement) {
    if (requirement.type === 'build') return countBuilt(requirement.target as BuildingType);
    if (requirement.type === 'collectResource') return resources.value[requirement.target as ResourceType] ?? 0;
    if (requirement.type === 'produceResource') {
      return producedTotals.value[requirement.target as ResourceType] ?? 0;
    }
    if (requirement.type === 'assignJob') {
      return residents.value.filter((resident) => resident.job === requirement.target).length;
    }
    if (requirement.type === 'surviveDays') return Math.max(0, currentDay.value - 1);
    if (requirement.type === 'surviveDisaster') return survivedDisasters.value[requirement.target] ?? 0;
    if (requirement.type === 'discoverTile') {
      if (requirement.target === 'any') return discoveredTileCount.value;
      return discoveredByType.value[requirement.target as TileType] ?? 0;
    }
    if (requirement.type === 'reachSeason') {
      return currentSeason.value === requirement.target ? seasonCycle.value : 0;
    }

    return 0;
  }

  function isRequirementMet(requirement: ObjectiveRequirement) {
    return requirementProgress(requirement) >= (requirement.amount ?? 1);
  }

  function applyReward(objective: Objective) {
    objective.rewards?.forEach((reward) => {
      if (reward.type === 'unlockBuilding') {
        unlockedBuildings.value.add(reward.target as BuildingType);
        addEvent(`Открыта постройка: ${buildingDefinitions[reward.target as BuildingType].name}.`, 'success');
      }

      if (reward.type === 'addResource') {
        addResource(reward.target as ResourceType, reward.amount ?? 0);
        addEvent(`Награда: +${reward.amount ?? 0} ${reward.target}.`, 'success');
      }

      if (reward.type === 'showHint') {
        addEvent('Новая подсказка добавлена в цепочку целей.', 'info');
      }
    });
  }

  function evaluateObjectives() {
    objectives.value
      .filter((objective) => objective.status === 'active')
      .forEach((objective) => {
        if (!objective.requirements.every(isRequirementMet)) return;

        objective.status = 'completed';
        objective.justUnlocked = false;
        applyReward(objective);
        addEvent(`Цель выполнена: ${objective.title}.`, 'success');

        objective.nextObjectiveIds.forEach((nextId) => {
          const next = objectives.value.find((item) => item.id === nextId);
          if (!next || next.status !== 'locked') return;
          next.status = 'active';
          next.justUnlocked = true;
        });
      });
  }

  function objectiveProgress(objective: Objective) {
    const current = objective.requirements.reduce(
      (total, requirement) => total + Math.min(requirementProgress(requirement), requirement.amount ?? 1),
      0,
    );
    const target = objective.requirements.reduce(
      (total, requirement) => total + (requirement.amount ?? 1),
      0,
    );

    return {
      current,
      target,
      percent: target === 0 ? 100 : Math.round((current / target) * 100),
    };
  }

  function resetGame() {
    seed.value = Date.now() % 100000;
    worldModifiers.value = pickWorldModifiers(seed.value);
    resources.value = { ...startingResources };
    producedTotals.value = createResourcesPatch();
    buildings.value = [];
    objectives.value = initialObjectives.map((objective) => ({ ...objective }));
    events.value = [];
    disasters.value = [];
    unlockedBuildings.value = new Set(
      Object.values(buildingDefinitions)
        .filter((definition) => definition.unlockedByDefault)
        .map((definition) => definition.type),
    );
    tick.value = 0;
    speed.value = 1;
    survivedDisasters.value = {};
    selected.value = null;
    selectedBuildingType.value = 'hut';
    generateMap();
    createResidents();
    addEvent('Лагерь основан в тёмном лесу. Первые цели доступны слева.', 'info');
  }

  resetGame();

  return {
    mapSize,
    dayLengthInTicks,
    resources,
    producedTotals,
    selectedBuildingType,
    selected,
    tiles,
    buildings,
    residents,
    objectives,
    events,
    disasters,
    unlockedBuildings,
    worldModifiers,
    tick,
    speed,
    currentDay,
    currentSeason,
    seasonCycle,
    tickInDay,
    activeObjectives,
    completedObjectives,
    activeDisasters,
    warningDisasters,
    settlementStatus,
    addEvent,
    advanceTick,
    assignJob,
    buildOnTile,
    discoverAround,
    gatherFromTile,
    objectiveProgress,
    resetGame,
    selectBuilding,
    selectTile,
    setSpeed,
  };
});
