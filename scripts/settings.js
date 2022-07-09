import { cacheImages, saveCache } from '../token-variants.mjs';
import { userRequiresImageCache } from './utils.js';
import { ForgeSearchPaths } from '../applications/forgeSearchPaths.js';
import TokenHUDClientSettings from '../applications/tokenHUDClientSettings.js';
import CompendiumMapConfig from '../applications/compendiumMap.js';
import ImportExport from '../applications/importExport.js';
import ConfigureSettings from '../applications/configureSettings.js';

export const TVA_CONFIG = {
  debug: false,
  disableNotifs: false,
  searchPaths: [
    {
      text: 'modules/caeora-maps-tokens-assets/assets/tokens',
      cache: true,
      source: typeof ForgeAPI === 'undefined' ? 'data' : 'forge-bazaar',
      types: ['token'],
    },
  ],
  forgeSearchPaths: {},
  worldHud: {
    displayOnlySharedImages: false,
    disableIfTHWEnabled: false,
    includeKeywords: false,
    updateActorImage: false,
    useNameSimilarity: false,
    includeWildcard: true,
    showFullPath: false,
  },
  hud: {
    enableSideMenu: true,
    displayAsImage: true,
    imageOpacity: 50,
    alwaysShowButton: false,
  },
  keywordSearch: true,
  excludedKeywords: 'and,for',
  actorDirectoryKey: 'Control',
  runSearchOnPath: false,
  searchFilters: {},
  algorithm: {
    exact: true,
    fuzzy: false,
    fuzzyLimit: 50,
    fuzzyThreshold: 0.3,
    fuzzyArtSelectPercentSlider: false,
  },
  tokenConfigs: [],
  randomizer: {
    actorCreate: false,
    tokenCreate: false,
    tokenCopyPaste: false,
    tokenName: true,
    keywords: false,
    shared: false,
    representedActorDisable: false,
    linkedActorDisable: true,
    popupOnDisable: false,
    diffImages: false,
    syncImages: false,
  },
  popup: {
    disableAutoPopupOnActorCreate: false,
    disableAutoPopupOnTokenCreate: false,
    disableAutoPopupOnTokenCopyPaste: false,
    twoPopups: false,
    twoPopupsNoDialog: false,
  },
  imgurClientId: '',
  stackStatusConfig: false,
  staticCache: false,
  staticCacheFile: 'modules/token-variants/token-variants-cache.json',
  tilesEnabled: false,
  compendiumMapper: {
    missingOnly: false,
    diffImages: false,
    showImages: true,
    cache: false,
    autoDisplayArtSelect: true,
    syncImages: false,
    overrideCategory: false,
    category: 'token',
  },
  permissions: {
    popups: {
      1: false,
      2: false,
      3: true,
      4: true,
    },
    portrait_right_click: {
      1: false,
      2: false,
      3: true,
      4: true,
    },
    image_path_button: {
      1: false,
      2: false,
      3: true,
      4: true,
    },
    hud: {
      1: true,
      2: true,
      3: true,
      4: true,
    },
    hudFullAccess: {
      1: false,
      2: false,
      3: true,
      4: true,
    },
    statusConfig: {
      1: false,
      2: false,
      3: true,
      4: true,
    },
  },
  globalMappings: {},
  customImageCategories: [],
};

export async function registerSettings() {
  game.settings.registerMenu('token-variants', 'settings', {
    name: 'Configure Settings',
    hint: 'Configure Token Variant Art settings',
    label: 'Settings',
    scope: 'world',
    icon: 'fas fa-cog',
    type: ConfigureSettings,
    restricted: true,
  });

  game.settings.register('token-variants', 'settings', {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
    onChange: async (val) => {
      // Generate a diff, it will be required when doing post-processing of the modified settings
      const diff = _arrayAwareDiffObject(TVA_CONFIG, val);
      console.log(diff);

      // Check image re-cache required due to permission changes
      let requiresImageCache = false;
      if ('permissions' in diff) {
        if (
          !userRequiresImageCache(TVA_CONFIG.permissions) &&
          userRequiresImageCache(val.permissions)
        )
          requiresImageCache = true;
      }

      // Update live settings
      mergeObject(TVA_CONFIG, val);

      // Check image re-cache required due to search path changes
      if ('searchPaths' in diff || 'forgeSearchPaths' in diff) {
        if (userRequiresImageCache(TVA_CONFIG.permissions)) requiresImageCache = true;
      }

      // Cache/re-cache images if necessary
      if (requiresImageCache) {
        await cacheImages();
      }

      if (diff.staticCache) {
        const cacheFile = diff.staticCacheFile ? diff.staticCacheFile : TVA_CONFIG.staticCacheFile;
        saveCache(cacheFile);
      }
    },
  });

  game.settings.register('token-variants', 'debug', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: TVA_CONFIG.debug,
    onChange: (val) => (TVA_CONFIG.debug = val),
  });

  if (typeof ForgeAPI !== 'undefined') {
    game.settings.registerMenu('token-variants', 'forgeSearchPaths', {
      name: game.i18n.localize('token-variants.settings.forge-search-paths.Name'),
      hint: game.i18n.localize('token-variants.settings.forge-search-paths.Hint'),
      icon: 'fas fa-search',
      type: ForgeSearchPaths,
      scope: 'client',
      restricted: false,
    });
  }

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'searchPaths', {
    scope: 'world',
    config: false,
    type: Array,
    default: TVA_CONFIG.searchPaths,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'forgeSearchPaths', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.forgeSearchPaths,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'worldHudSettings', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.worldHud,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'keywordSearch', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: TVA_CONFIG.keywordSearch,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'excludedKeywords', {
    scope: 'world',
    config: false,
    type: String,
    default: 'and,for',
  });

  // Deprecated 01/06/2022
  if (!isNewerVersion(game.version ?? game.data.version, '0.8.9')) {
    game.settings.register('token-variants', 'actorDirectoryKey', {
      scope: 'world',
      config: false,
      type: String,
      default: TVA_CONFIG.actorDirectoryKey,
    });
  }

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'runSearchOnPath', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: TVA_CONFIG.runSearchOnPath,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'searchFilterSettings', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.searchFilters,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'algorithmSettings', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.algorithm,
  });

  game.settings.register('token-variants', 'tokenConfigs', {
    scope: 'world',
    config: false,
    type: Array,
    default: TVA_CONFIG.tokenConfigs,
    onChange: (val) => (TVA_CONFIG.tokenConfigs = val),
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'randomizerSettings', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.randomizer,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'popupSettings', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.popup,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'imgurClientId', {
    scope: 'world',
    config: false,
    type: String,
    default: TVA_CONFIG.imgurClientId,
  });

  // Deprecated 01/06/2022
  game.settings.register('token-variants', 'disableNotifs', {
    scope: 'world',
    config: false,
    default: TVA_CONFIG.disableNotifs,
    type: Boolean,
  });

  game.settings.registerMenu('token-variants', 'tokenHUDSettings', {
    name: game.i18n.localize('token-variants.settings.token-hud.Name'),
    hint: game.i18n.localize('token-variants.settings.token-hud.Hint'),
    scope: 'client',
    icon: 'fas fa-images',
    type: TokenHUDClientSettings,
    restricted: false,
  });

  game.settings.registerMenu('token-variants', 'compendiumMapper', {
    name: game.i18n.localize('token-variants.settings.compendium-mapper.Name'),
    hint: game.i18n.localize('token-variants.settings.compendium-mapper.Hint'),
    scope: 'world',
    icon: 'fas fa-cogs',
    type: CompendiumMapConfig,
    restricted: true,
  });

  game.settings.register('token-variants', 'compendiumMapper', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.compendiumMapper,
    onChange: (val) => (TVA_CONFIG.compendiumMapper = val),
  });

  game.settings.register('token-variants', 'hudSettings', {
    scope: 'client',
    config: false,
    type: Object,
    default: TVA_CONFIG.hud,
    onChange: (val) => (TVA_CONFIG.hud = val),
  });

  game.settings.register('token-variants', 'permissions', {
    scope: 'world',
    config: false,
    type: Object,
    default: TVA_CONFIG.permissions,
  });

  game.settings.registerMenu('token-variants', 'importExport', {
    name: `${game.i18n.localize('token-variants.common.import')}/${game.i18n.localize(
      'token-variants.common.export'
    )}`,
    hint: game.i18n.localize('token-variants.settings.import-export.Hint'),
    scope: 'world',
    icon: 'fas fa-toolbox',
    type: ImportExport,
    restricted: true,
  });

  // Read settings
  const settings = game.settings.get('token-variants', 'settings');
  mergeObject(TVA_CONFIG, settings);

  // 16/06/2022
  // Perform searchPaths and forgeSearchPaths conversions to new format if needed
  TVA_CONFIG.searchPaths = TVA_CONFIG.searchPaths.map((p) => {
    if (!p.source) {
      if (p.text.startsWith('s3:')) {
        const parts = p.text.split(':');
        if (parts.length > 2) {
          p.text = parts[2];
          p.source = 's3:' + parts[1];
        } else {
          p.source = 's3:';
          p.text = p.text.replace('s3:', '');
        }
      } else if (p.text.startsWith('rolltable:')) {
        p.text = p.text.split(':')[1];
        p.source = 'rolltable';
      } else if (p.text.startsWith('forgevtt:')) {
        p.text = p.text.split(':')[1];
        p.source = 'forgevtt';
      } else if (p.text.startsWith('imgur:')) {
        p.text = p.text.split(':')[1];
        p.source = 'imgur';
      } else {
        p.source = 'data';
      }
    }
    if (!p.types) {
      if (p.tiles) p.types = ['tile'];
      else p.types = ['token'];
    }
    return p;
  });

  // 07/07/2022 Convert filters to new format if old one is still in use
  if (TVA_CONFIG.searchFilters.portraitFilterInclude != null) {
    const filters = TVA_CONFIG.searchFilters;
    TVA_CONFIG.searchFilters = {
      portrait: {
        include: filters.portraitFilterInclude,
        exclude: filters.portraitFilterExclude,
        regex: filters.portraitFilterRegex,
      },
      token: {
        include: filters.tokenFilterInclude,
        exclude: filters.tokenFilterExclude,
        regex: filters.tokenFilterRegex,
      },
      portraitAndToken: {
        include: filters.generalFilterInclude,
        exclude: filters.generalFilterExclude,
        regex: filters.generalFilterRegex,
      },
    };
    TVA_CONFIG.compendiumMapper.searchFilters = {};
  }

  for (let uid in TVA_CONFIG.forgeSearchPaths) {
    TVA_CONFIG.forgeSearchPaths[uid].paths = TVA_CONFIG.forgeSearchPaths[uid].paths.map((p) => {
      if (!p.source) {
        p.source = 'forgevtt';
      }
      if (!p.types) {
        if (p.tiles) p.types = ['tile'];
        else p.types = ['token'];
      }
      return p;
    });
  }

  // Read client settings
  TVA_CONFIG.hud = game.settings.get('token-variants', 'hudSettings');
}

export function exportSettingsToJSON() {
  const settings = deepClone(TVA_CONFIG);
  const filename = `token-variants-settings.json`;
  saveDataToFile(JSON.stringify(settings, null, 2), 'text/json', filename);
}

export async function importSettingsFromJSON(json) {
  if (typeof json === 'string') json = JSON.parse(json);

  // 16/06/2022
  // Perform searchPaths and forgeSearchPaths conversions to new format if needed
  if (json.searchPaths)
    json.searchPaths = json.searchPaths.map((p) => {
      if (!p.source) {
        if (p.text.startsWith('s3:')) {
          const parts = p.text.split(':');
          if (parts.length > 2) {
            p.text = parts[2];
            p.source = 's3:' + parts[1];
          } else {
            p.source = 's3:';
            p.text = p.text.replace('s3:', '');
          }
        } else if (p.text.startsWith('rolltable:')) {
          p.text = p.text.split(':')[1];
          p.source = 'rolltable';
        } else if (p.text.startsWith('forgevtt:')) {
          p.text = p.text.split(':')[1];
          p.source = 'forgevtt';
        } else if (p.text.startsWith('imgur:')) {
          p.text = p.text.split(':')[1];
          p.source = 'imgur';
        } else {
          p.source = 'data';
        }

        if (!p.types) {
          if (p.tiles) p.types = ['tile'];
          else p.types = ['token'];
        }
      }
      return p;
    });

  if (json.forgeSearchPaths)
    for (let uid in json.forgeSearchPaths) {
      json.forgeSearchPaths[uid].paths = json.forgeSearchPaths[uid].paths.map((p) => {
        if (!p.source) {
          p.source = 'forgevtt';
        }
        if (!p.types) {
          if (p.tiles) p.types = ['tile'];
          else p.types = ['token'];
        }
        return p;
      });
    }

  // 07/07/2022 Convert filters to new format if old one is still in use
  if (json.searchFilters && json.searchFilters.portraitFilterInclude != null) {
    const filters = json.searchFilters;
    json.searchFilters = {
      portrait: {
        include: filters.portraitFilterInclude ?? '',
        exclude: filters.portraitFilterExclude ?? '',
        regex: filters.portraitFilterRegex ?? '',
      },
      token: {
        include: filters.tokenFilterInclude ?? '',
        exclude: filters.tokenFilterExclude ?? '',
        regex: filters.tokenFilterRegex ?? '',
      },
      portraitAndToken: {
        include: filters.generalFilterInclude ?? '',
        exclude: filters.generalFilterExclude ?? '',
        regex: filters.generalFilterRegex ?? '',
      },
    };
    json.compendiumMapper = {};
  }

  updateSettings(json);
}

export async function updateSettings(newSettings) {
  const settings = mergeObject(deepClone(TVA_CONFIG), newSettings);

  // Custom image categories might have changed, meaning we may have filters that are no longer relevant
  // or need to be added
  const categories = ['token', 'portrait', 'portraitAndToken', 'item', 'journal', 'tile'].concat(
    settings.customImageCategories
  );
  for (const filter in settings.searchFilters) {
    if (!categories.includes(filter)) delete settings.searchFilters[filter];
  }
  settings.customImageCategories.forEach((type) => {
    if (settings.searchFilters[type] == null) {
      settings.searchFilters[type] = {
        include: '',
        exclude: '',
        regex: '',
      };
    }
  });

  if (newSettings.compendiumMapper?.searchFilters) {
    settings.compendiumMapper.searchFilters = newSettings.compendiumMapper.searchFilters;
  }

  game.settings.set('token-variants', 'settings', settings);
}

export function _arrayAwareDiffObject(original, other, { inner = false } = {}) {
  function _difference(v0, v1) {
    let t0 = getType(v0);
    let t1 = getType(v1);
    if (t0 !== t1) return [true, v1];
    if (t0 === 'Array') return [!_arrayEquality(v0, v1), v1];
    if (t0 === 'Object') {
      if (isObjectEmpty(v0) !== isObjectEmpty(v1)) return [true, v1];
      let d = _arrayAwareDiffObject(v0, v1, { inner });
      return [!isObjectEmpty(d), d];
    }
    return [v0 !== v1, v1];
  }

  // Recursively call the _difference function
  return Object.keys(other).reduce((obj, key) => {
    if (inner && !(key in original)) return obj;
    let [isDifferent, difference] = _difference(original[key], other[key]);
    if (isDifferent) obj[key] = difference;
    return obj;
  }, {});
}

function _arrayEquality(a1, a2) {
  if (!(a2 instanceof Array) || a2.length !== a1.length) return false;
  return a1.every((v, i) => {
    if (getType(v) === 'Object') return Object.keys(_arrayAwareDiffObject(v, a2[i])).length === 0;
    return a2[i] === v;
  });
}

export function getSearchOptions() {
  return {
    keywordSearch: TVA_CONFIG.keywordSearch,
    excludedKeywords: TVA_CONFIG.excludedKeywords,
    runSearchOnPath: TVA_CONFIG.runSearchOnPath,
    algorithm: TVA_CONFIG.algorithm,
    searchFilters: TVA_CONFIG.searchFilters,
  };
}
