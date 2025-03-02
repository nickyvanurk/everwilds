import EventEmitter from 'eventemitter3';
import * as THREE from 'three';
import { type Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';

export type AssetSource = {
  name: string;
  type: string;
  src: string;
};

type Asset = THREE.Texture | Font | AudioBuffer;

export class AssetManager extends EventEmitter {
  private loaders: Map<
    string,
    FontLoader | THREE.TextureLoader | THREE.AudioLoader
  > = new Map();
  private assets: Map<string, Asset> = new Map();
  private textures: Map<string, THREE.Texture> = new Map();
  private fonts: Map<string, Font> = new Map();
  private sounds: Map<string, AudioBuffer> = new Map();

  constructor(dir = '') {
    super();

    this.loaders.set('font', new FontLoader());
    this.loaders.set('texture', new THREE.TextureLoader());
    this.loaders.set('sound', new THREE.AudioLoader());

    for (const [key, loader] of this.loaders) {
      loader.setPath(`${dir}/${key}s/`);
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
          } else if (source.type === 'sound') {
            this.sounds.set(source.name, asset as AudioBuffer);
          }

          loadedAssets.push(asset);

          this.assets.set(source.name, asset);

          numLoadedAssets++;
          const totalAssets = Array.isArray(sources) ? sources.length : 1;
          if (numLoadedAssets === totalAssets) {
            cb?.(loadedAssets);
          }

          this.emit(`load:${source.name}`, asset);
        },
        undefined,
        error => {
          log.error(`Error loading ${source.type} ${source.name} : ${error}`);
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

  getSound(name: string, cb?: (buffer: AudioBuffer) => void) {
    if (this.sounds.has(name)) {
      const sound = this.sounds.get(name)!;
      cb?.(sound);
      return sound;
    }

    this.on(`load:${name}`, (buffer: AudioBuffer) => {
      cb?.(buffer);
    });
  }
}
