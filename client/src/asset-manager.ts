import * as THREE from 'three';
import { type Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';

export type AssetSource = {
  name: string;
  type: string;
  src: string;
};

type Asset = THREE.Texture | Font;

export class AssetManager {
  private loaders: Map<string, FontLoader | THREE.TextureLoader> = new Map();
  private assets: Map<string, Asset> = new Map();
  private textures: Map<string, THREE.Texture> = new Map();
  private fonts: Map<string, Font> = new Map();

  constructor(dir = '') {
    this.loaders.set('font', new FontLoader());
    this.loaders.set('texture', new THREE.TextureLoader());

    for (const loader of this.loaders.values()) {
      loader.setPath(dir);
    }
  }

  load(sources: AssetSource | AssetSource[], cb?: (assets: Asset[]) => void) {
    const loadedAssets: Asset[] = [];
    let numLoadedAssets = 0;

    const loadAsset = (source: AssetSource) => {
      const loader = this.loaders.get(source.type);
      if (!loader) return;

      loader.load(
        source.src,
        (asset: Asset) => {
          if (source.type === 'texture') {
            this.textures.set(source.name, asset as THREE.Texture);
          } else if (source.type === 'font') {
            this.fonts.set(source.name, asset as Font);
          }

          loadedAssets.push(asset);

          this.assets.set(source.name, asset);

          numLoadedAssets++;
          const totalAssets = Array.isArray(sources) ? sources.length : 1;
          if (numLoadedAssets === totalAssets) {
            cb?.(loadedAssets);
          }
        },
        undefined,
        error => {
          console.log('Error loading', source.type, source.name, ':', error);
        },
      );
    };

    if (Array.isArray(sources)) {
      for (const source of sources) {
        loadAsset(source);
      }
    } else {
      loadAsset(sources);
    }
  }

  getFont(name: string) {
    return this.fonts.get(name);
  }
}
