/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {INITIAL_SETTINGS, type Settings} from './appSettings';

export default (() => {
  if (typeof window !== 'undefined') {
    const urlSearchParams = new URLSearchParams(window.location.search);

    for (const param of Object.keys(INITIAL_SETTINGS)) {
      if (urlSearchParams.has(param)) {
        try {
          const value = JSON.parse(urlSearchParams.get(param) ?? 'true');
          INITIAL_SETTINGS[param as keyof Settings] = Boolean(value);
        } catch (_error) {
          console.warn(`Unable to parse query parameter "${param}"`);
        }
      }
    }
  }

  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.EXCALIDRAW_ASSET_PATH = process.env.NEXT_PUBLIC_EXCALIDRAW_ASSET_PATH || '/';
  }

  return INITIAL_SETTINGS;
})();
