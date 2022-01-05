/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createGetterSetter } from '../../../plugins/kibana_utils/public';

import type { IUiSettingsClient, ThemeServiceStart } from '../../../core/public';
import type { VisEditorsRegistry } from './vis_editors_registry';
import type { UsageCollectionStart } from '../../usage_collection/public';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getUsageCollector, setUsageCollector] = createGetterSetter<UsageCollectionStart>(
  'UsageCollection',
  false
);

export const [getVisEditorsRegistry, setVisEditorsRegistry] =
  createGetterSetter<VisEditorsRegistry>('VisEditorsRegistry');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');
