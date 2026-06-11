export type TileType =
  | 'grass'
  | 'forest'
  | 'water'
  | 'stone'
  | 'ore'
  | 'fertileSoil'
  | 'swamp'
  | 'ruins';

export type ResourceType =
  | 'wood'
  | 'food'
  | 'water'
  | 'stone'
  | 'ore'
  | 'fuel'
  | 'metal'
  | 'energy';

export type BuildingType =
  | 'hut'
  | 'storage'
  | 'road'
  | 'woodcutter'
  | 'forager'
  | 'well'
  | 'campfire'
  | 'mine'
  | 'smelter'
  | 'windmill'
  | 'greenhouse';

export type ResidentJob =
  | 'builder'
  | 'woodcutter'
  | 'forager'
  | 'waterCarrier'
  | 'miner'
  | 'smelter'
  | 'farmer';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type GameSpeed = 0 | 1 | 2 | 3;
export type ObjectiveStatus = 'locked' | 'active' | 'completed';
export type ObjectiveCategory =
  | 'tutorial'
  | 'survival'
  | 'production'
  | 'exploration'
  | 'technology'
  | 'season';

export type DisasterType =
  | 'coldSnap'
  | 'heavyRain'
  | 'drySeason'
  | 'cropBlight'
  | 'fog'
  | 'mineCollapse';

export type WorldModifier =
  | 'scarceWood'
  | 'distantWater'
  | 'poorSoil'
  | 'richOre'
  | 'earlyCold'
  | 'frequentRain'
  | 'fragileFood'
  | 'rockyGround';

export interface Position {
  x: number;
  y: number;
}

export interface GameTile extends Position {
  id: string;
  type: TileType;
  discovered: boolean;
  resourceAmount: number;
  buildingId?: string;
}

export type Resources = Record<ResourceType, number>;

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  cost: Partial<Resources>;
  unlockedByDefault: boolean;
  requiredTile?: TileType[];
  produces?: Partial<Resources>;
  consumes?: Partial<Resources>;
  workerJob?: ResidentJob;
}

export interface Building extends Position {
  id: string;
  type: BuildingType;
  progress: number;
  active: boolean;
  assignedResidentIds: string[];
}

export interface Resident extends Position {
  id: string;
  name: string;
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  mood: number;
  job: ResidentJob;
  skill: number;
  currentTask: string;
}

export interface ObjectiveRequirement {
  type:
    | 'build'
    | 'collectResource'
    | 'assignJob'
    | 'surviveDays'
    | 'surviveDisaster'
    | 'discoverTile'
    | 'produceResource'
    | 'reachSeason';
  target: string;
  amount?: number;
}

export interface ObjectiveReward {
  type:
    | 'unlockBuilding'
    | 'unlockResource'
    | 'unlockPanel'
    | 'addResource'
    | 'showHint';
  target: string;
  amount?: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  status: ObjectiveStatus;
  category: ObjectiveCategory;
  requirements: ObjectiveRequirement[];
  rewards?: ObjectiveReward[];
  nextObjectiveIds: string[];
  justUnlocked?: boolean;
}

export interface Disaster {
  id: string;
  type: DisasterType;
  title: string;
  warningDay: number;
  startsOnDay: number;
  endsOnDay: number;
  status: 'warning' | 'active' | 'resolved';
  description: string;
}

export interface GameEvent {
  id: string;
  day: number;
  text: string;
  tone: 'info' | 'warning' | 'success' | 'danger';
}

export interface SelectedTile {
  tile: GameTile;
  building?: Building;
}
