/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  AdhocColumn,
  buildQueryContext,
  ensureIsArray,
  getMetricLabel,
  hasGenericChartAxes,
  isPhysicalColumn,
  QueryMode,
  QueryObject,
  removeDuplicates,
} from '@superset-ui/core';
import { PostProcessingRule } from '@superset-ui/core/src/query/types/PostProcessing';
import { BuildQuery } from '@superset-ui/core/src/chart/registries/ChartBuildQueryRegistrySingleton';
import { TableChartFormData } from './types';
import { updateExternalFormData } from './DataTable/utils/externalAPIs';
import Query from 'packages/superset-ui-core/src/query/types/Query';


export const buildQuery: BuildQuery<TableChartFormData> = (
  formData: TableChartFormData,
  options,
) => {
  const {
    percent_metrics: percentMetrics,
    order_desc: orderDesc = false,
    extra_form_data,
  } = formData;
  const queryMode = QueryMode.raw;
  const sortByMetric = ensureIsArray(formData.timeseries_limit_metric)[0];
  const time_grain_sqla =
    extra_form_data?.time_grain_sqla || formData.time_grain_sqla;
  let formDataCopy = formData;
  // never include time in raw records mode
  if (queryMode === QueryMode.raw) {
    formDataCopy = {
      ...formData,
      row_limit: Infinity,
      include_time: false,
    };
  }

  return buildQueryContext(formDataCopy, baseQueryObject => {
    let { metrics, orderby = [], columns = [] } = baseQueryObject;
    let postProcessing: PostProcessingRule[] = [];

    const moreProps: Partial<QueryObject> = {};
    const ownState = options?.ownState ?? {};
    if (formDataCopy.server_pagination) {
      moreProps.row_limit =
        ownState.pageSize ?? formDataCopy.server_page_length;
      moreProps.row_offset =
        (ownState.currentPage ?? 0) * (ownState.pageSize ?? 0);
    }

    let queryObject = {
      ...baseQueryObject,
      columns,
      orderby,
      metrics,
      post_processing: postProcessing,
      ...moreProps,
    };
    
    if (
      formData.server_pagination &&
      options?.extras?.cachedChanges?.[formData.slice_id] &&
      JSON.stringify(options?.extras?.cachedChanges?.[formData.slice_id]) !==
        JSON.stringify(queryObject.filters)
    ) {
      queryObject = { ...queryObject, row_offset: 0 };
      updateExternalFormData(
        options?.hooks?.setDataMask,
        0,
        queryObject.row_limit ?? 0,
      );
    }
    // Because we use same buildQuery for all table on the page we need split them by id
    options?.hooks?.setCachedChanges({
      [formData.slice_id]: queryObject.filters,
    });

    const extraQueries: QueryObject[] = [];

    const interactiveGroupBy = formData.extra_form_data?.interactive_groupby;
    if (interactiveGroupBy && queryObject.columns) {
      queryObject.columns = [
        ...new Set([...queryObject.columns, ...interactiveGroupBy]),
      ];
    }


    if (formData.server_pagination) {
      return [
        { ...queryObject },
        {
          ...queryObject,
          row_limit: 0,
          row_offset: 0,
          post_processing: [],
          is_rowcount: true,
        },
        ...extraQueries,
      ];
    }

    return [queryObject, ...extraQueries];
  });
};

// Use this closure to cache changing of external filters, if we have server pagination we need reset page to 0, after
// external filter changed
export const cachedBuildQuery = (): BuildQuery<TableChartFormData> => {
  let cachedChanges: any = {};
  const setCachedChanges = (newChanges: any) => {
    cachedChanges = { ...cachedChanges, ...newChanges };
  };

  return (formData, options) =>
    buildQuery(
      { ...formData },
      {
        extras: { cachedChanges },
        ownState: options?.ownState ?? {},
        hooks: {
          ...options?.hooks,
          setDataMask: () => {},
          setCachedChanges,
        },
      },
    );
};

export default cachedBuildQuery();
