/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { byTestId, loginToKibana, waitForLoadingToFinish } from './utils';
import { callKibana } from '../../../apm/scripts/create_apm_users_and_roles/helpers/call_kibana';

journey('DataViewPermissions', async ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
    try {
      await callKibana({
        elasticsearch: { username: 'elastic', password: 'changeme' },
        kibana: { hostname: params.kibanaUrl, roleSuffix: '' },
        options: {
          method: 'DELETE',
          url: '/api/saved_objects/index-pattern/synthetics_static_index_pattern_id_heartbeat_?force=false',
        },
      });
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });

  const queryParams = new URLSearchParams({
    dateRangeStart: '2021-11-21T22:06:06.502Z',
    dateRangeEnd: '2021-11-21T22:10:08.203Z',
  }).toString();

  const baseUrl = `${params.kibanaUrl}/app/uptime`;

  step('Go to uptime', async () => {
    await page.goto(`${baseUrl}?${queryParams}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({ page, user: { username: 'obs_read_user', password: 'changeme' } });
  });

  step('Click explore data button', async () => {
    await page.click(byTestId('uptimeExploreDataButton'));
    await waitForLoadingToFinish({ page });
    await page.waitForSelector(`text=${permissionError}`);
    expect(await page.$(`text=${permissionError}`)).toBeTruthy();
  });
});

const permissionError =
  "Unable to create Data View. You don't have the required permission, please contact your admin.";
