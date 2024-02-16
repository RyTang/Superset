import { DataRecord, QueryFormMetric, Aggregate, QueryFormOrderBy } from '@superset-ui/core';
import { TableChartTransformedProps } from '../types';
import { cachedBuildQuery } from '../buildQuery';

type OrderByMetrics = {
  /**
   * true = ascending
   */
  [key: string]: boolean;
};

/**
 * Creates New Query Structure based on the columns/metrics selected
 * @param props Existing Transform Props used by the table chart
 * @param groupByColumns New Group By Columns that exists in the data source
 * @param aggregateSelected Aggregate Function Wanted
 * @param selectedMetrics Metrics to be aggregated that exists in the data source
 * @returns 
 */
export function createNewQuery<D extends DataRecord = DataRecord>(props: TableChartTransformedProps<D> & { sticky?: boolean | undefined; }, groupByColumns: string[], aggregateSelected: string[], selectedMetrics: string[], orderByMetrics: OrderByMetrics = {}) {
  const queryContext = cachedBuildQuery()(props.formData);
  console.log("Printing out queryContext");
  console.dir(queryContext);
  queryContext.queries[0].columns = groupByColumns;

  const orderByEntries : QueryFormOrderBy[] = Object.entries(orderByMetrics).map(([column, is_asc]) => [column, is_asc]);
  
  queryContext.queries[0].orderby = orderByEntries;

  const GetAggregateLabel = () => {
    let label = "";
    switch (aggregateSelected[0]) {
      case "Sum":
        label = "SUM";
        break;
      case "Average":
        label = "AVG";
        break;
      case "Count":
        label = "COUNT";
        break;
      case "Count Distinct":
        label = "COUNT_DISTINCT";
        break;
      case "Min":
        label = "MIN";
        break;
      case "Max":
        label = "MAX";
        break;
    }
    return label;
  };
  
  queryContext.queries[0].metrics = selectedMetrics.map(
    (metricColumn): QueryFormMetric => {
      return {
        "expressionType": "SIMPLE",
        "column": {
          "advanced_data_type": undefined,
          "column_name": metricColumn,
          "description": undefined,
          "expression": "",
          "filterable": true,
          "groupby": true,
          "id": 363,
          "is_dttm": false,
          "python_date_format": undefined,
          "type": "BIGINT",
          "type_generic": 0,
          "verbose_name": undefined,
        },
        "aggregate": GetAggregateLabel() as Aggregate,
        "hasCustomLabel": false,
        "label": `${GetAggregateLabel()}(${metricColumn})`,
        "optionName": "metric_nzr0xyjj5kf_wtbrv6t9mu"
      };
    }
  );
  return queryContext;
}
