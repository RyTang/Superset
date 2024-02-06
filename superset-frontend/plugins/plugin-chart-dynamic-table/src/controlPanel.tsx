/* eslint-disable camelcase */
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
import React from 'react';
import {
  ChartDataResponseResult,
  ensureIsArray,
  FeatureFlag,
  GenericDataType,
  hasGenericChartAxes,
  isAdhocColumn,
  isFeatureEnabled,
  isPhysicalColumn,
  QueryFormColumn,
  QueryMode,
  smartDateFormatter,
  t,
} from '@superset-ui/core';
import {
  ColumnOption,
  ControlConfig,
  ControlPanelConfig,
  ControlPanelsContainerProps,
  ControlStateMapping,
  D3_TIME_FORMAT_OPTIONS,
  QueryModeLabel,
  sections,
  sharedControls,
  ControlPanelState,
  ControlState,
  Dataset,
  ColumnMeta,
  defineSavedMetrics,
  getStandardizedControls,
} from '@superset-ui/chart-controls';

import { PAGE_SIZE_OPTIONS } from './consts';

function getQueryMode(controls: ControlStateMapping): QueryMode {
  // const mode = controls?.query_mode?.value;
  const mode = QueryMode.raw;
  if (mode === QueryMode.aggregate || mode === QueryMode.raw) {
    return mode as QueryMode;
  }
  const rawColumns = controls?.all_columns?.value as
    | QueryFormColumn[]
    | undefined;
  const hasRawColumns = rawColumns && rawColumns.length > 0;
  return hasRawColumns ? QueryMode.raw : QueryMode.aggregate;
}

/**
 * Visibility check
 */
function isQueryMode(mode: QueryMode) {
  return ({ controls }: Pick<ControlPanelsContainerProps, 'controls'>) =>
    getQueryMode(controls) === mode;
}

const isRawMode = isQueryMode(QueryMode.raw);

// TODO: Need to deattach all_columns from Control Panel and attach to Visible Group By Columns
const allColumnsControl: typeof sharedControls.groupby = {
  ...sharedControls.groupby,
  label: t('Visible Group by'),
  description: t('Columns to Group By,\nNOTE: All Metric Columnsneeds to be present here'),
  multi: true,
  freeForm: true,
  allowAll: true,
  commaChoosesOption: false,
  optionRenderer: c => <ColumnOption showType column={c} />,
  valueRenderer: c => <ColumnOption column={c} />,
  valueKey: 'column_name',
  // mapStateToProps: ({ datasource, controls }, controlState) => ({
  //   options: datasource?.columns || [],
  //   queryMode: getQueryMode(controls),
  //   externalValidationErrors:
  //     isRawMode({ controls }) && ensureIsArray(controlState?.value).length === 0
  //       ? [t('must have a value')]
  //       : [],
  // }),
  visibility: isRawMode,
  resetOnHide: false,
};

const config: ControlPanelConfig = {
  controlPanelSections: [
    sections.genericTime,
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'all_columns',
            config: allColumnsControl,
          },
        ],
        [
          {
            name: 'default_groupby_columns',
            config: {
              ...sharedControls.groupby,
              label: t('Default Group'),
              description: t('Default Columns on the Groupby DropDown'),
            },
          },
        ],
        [
          {
            name: 'visible_metrics_columns',
            config: {
              ...sharedControls.columns,
              label: t('Visible Metrics'),
              description: t('Visible Columns on the Metrics DropDown'),
            },
          },
        ],
        [
          {
            name: 'default_metrics_columns',
            config: {
              ...sharedControls.columns,
              label: t('Default Metrics'),
              description: t('Default Columns on the Metrics DropDown'),
            },
          }
        ],
        ['adhoc_filters'],
        [
          {
            name: 'order_by_cols',
            config: {
              type: 'SelectControl',
              label: t('Ordering'),
              description: t('Order results by selected columns'),
              multi: true,
              default: [],
              mapStateToProps: ({ datasource }) => ({
                choices: datasource?.hasOwnProperty('order_by_choices')
                  ? (datasource as Dataset)?.order_by_choices
                  : datasource?.columns || [],
              }),
              visibility: isRawMode,
              resetOnHide: false,
            },
          },
        ],
        isFeatureEnabled(FeatureFlag.DASHBOARD_CROSS_FILTERS) ||
        isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS)
          ? [
              {
                name: 'server_pagination',
                config: {
                  type: 'CheckboxControl',
                  label: t('Server pagination'),
                  description: t(
                    'Enable server side pagination of results (experimental feature)',
                  ),
                  default: false,
                },
              },
            ]
          : [],
        [
          {
            name: 'row_limit',
            override: {
              default: 1000,
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                !controls?.server_pagination?.value,
            },
          },
          {
            name: 'server_page_length',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Server Page Length'),
              default: 10,
              choices: PAGE_SIZE_OPTIONS,
              description: t('Rows per page, 0 means no pagination'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.server_pagination?.value),
            },
          },
        ],
      ],
    },
    {
      label: t('Options'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'table_timestamp_format',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Timestamp format'),
              default: smartDateFormatter.id,
              renderTrigger: true,
              clearable: false,
              choices: D3_TIME_FORMAT_OPTIONS,
              description: t('D3 time format for datetime columns'),
            },
          },
        ],
        [
          {
            name: 'page_length',
            config: {
              type: 'SelectControl',
              freeForm: true,
              renderTrigger: true,
              label: t('Page length'),
              default: null,
              choices: PAGE_SIZE_OPTIONS,
              description: t('Rows per page, 0 means no pagination'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                !controls?.server_pagination?.value,
            },
          },
          null,
        ],
        [
          {
            name: 'include_search',
            config: {
              type: 'CheckboxControl',
              label: t('Search box'),
              renderTrigger: true,
              default: false,
              description: t('Whether to include a client-side search box'),
            },
          },
          {
            name: 'show_cell_bars',
            config: {
              type: 'CheckboxControl',
              label: t('Cell bars'),
              renderTrigger: true,
              default: true,
              description: t(
                'Whether to display a bar chart background in table columns',
              ),
            },
          },
        ],
        [
          {
            name: 'align_pn',
            config: {
              type: 'CheckboxControl',
              label: t('Align +/-'),
              renderTrigger: true,
              default: false,
              description: t(
                'Whether to align background charts with both positive and negative values at 0',
              ),
            },
          },
          {
            name: 'color_pn',
            config: {
              type: 'CheckboxControl',
              label: t('Color +/-'),
              renderTrigger: true,
              default: true,
              description: t(
                'Whether to colorize numeric values by if they are positive or negative',
              ),
            },
          },
        ],
        [
          {
            name: 'allow_rearrange_columns',
            config: {
              type: 'CheckboxControl',
              label: t('Allow columns to be rearranged'),
              renderTrigger: true,
              default: false,
              description: t(
                "Allow end user to drag-and-drop column headers to rearrange them. Note their changes won't persist for the next time they open the chart.",
              ),
            },
          },
        ],
        [
          {
            name: 'column_config',
            config: {
              type: 'ColumnConfigControl',
              label: t('Customize columns'),
              description: t('Further customize how to display each column'),
              width: 400,
              height: 320,
              renderTrigger: true,
              shouldMapStateToProps() {
                return true;
              },
              mapStateToProps(explore, _, chart) {
                return {
                  queryResponse: chart?.queriesResponse?.[0] as
                    | ChartDataResponseResult
                    | undefined,
                };
              },
            },
          },
        ],
        [
          {
            name: 'conditional_formatting',
            config: {
              type: 'ConditionalFormattingControl',
              renderTrigger: true,
              label: t('Conditional formatting'),
              description: t(
                'Apply conditional color formatting to numeric columns',
              ),
              shouldMapStateToProps() {
                return true;
              },
              mapStateToProps(explore, _, chart) {
                const verboseMap = explore?.datasource?.hasOwnProperty(
                  'verbose_map',
                )
                  ? (explore?.datasource as Dataset)?.verbose_map
                  : explore?.datasource?.columns ?? {};
                const chartStatus = chart?.chartStatus;
                const { colnames, coltypes } =
                  chart?.queriesResponse?.[0] ?? {};
                const numericColumns =
                  Array.isArray(colnames) && Array.isArray(coltypes)
                    ? colnames
                        .filter(
                          (colname: string, index: number) =>
                            coltypes[index] === GenericDataType.NUMERIC,
                        )
                        .map(colname => ({
                          value: colname,
                          label: verboseMap[colname] ?? colname,
                        }))
                    : [];
                return {
                  removeIrrelevantConditions: chartStatus === 'success',
                  columnOptions: numericColumns,
                  verboseMap,
                };
              },
            },
          },
        ],
      ],
    },
  ],
  formDataOverrides: formData => ({
    ...formData,
    metrics: getStandardizedControls().popAllMetrics(),
    groupby: getStandardizedControls().popAllColumns(),
  }),
};

export default config;
