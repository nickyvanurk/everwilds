import '../../shared/src/globals';
import { AssetManager } from './asset-manager';
import type { Game } from './game';
import { chunkData } from './chunk-data';

declare global {
  var gAssetManager: AssetManager;
  var game: Game;
  var levelData: typeof chunkData;
}

globalThis.gAssetManager = new AssetManager('assets');
globalThis.levelData = chunkData;
