import { DataMode } from './runtime';
import { ListeningAudio, Material } from './domain';

export type PracticeSourceType = 'all' | 'library' | 'group';

export interface PracticeGroup {
  id: string;
  mode: DataMode;
  name: string;
  materialIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PracticeGroupsByMode {
  local: PracticeGroup[];
  cloud: PracticeGroup[];
}

export interface PracticeMaterial extends Material {
  audio: ListeningAudio;
  libraryName: string;
}

export interface PracticeQueueState {
  materialIds: string[];
  currentIndex: number;
}

export interface PracticeSource {
  type: PracticeSourceType;
  id?: string;
}
