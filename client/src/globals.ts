import '../../shared/src/globals';
import { AssetManager } from './asset-manager';
import type { Game } from './game';

declare global {
  var gAssetManager: AssetManager;
  var game: Game;
}

globalThis.gAssetManager = new AssetManager('assets');
