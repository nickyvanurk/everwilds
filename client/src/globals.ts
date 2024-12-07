import { AssetManager } from './asset-manager';

declare global {
  var gAssetManager: AssetManager;
}

globalThis.gAssetManager = new AssetManager('assets/');
