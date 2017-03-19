/**
 * angular-elastic-builder
 *
 * /src/services/QueryService.js
 *
 * This file is used to convert filters into queries, and vice versa
 */

(function(angular) {
  'use strict';

  var count;

  angular.module('angular-elastic-builder')
    .factory('elasticQueryService', [
      '$filter',

      function($filter) {

        return {
          toFilters: toFilters,
          toQuery: function(filters, fieldMap) {
            return toQuery(filters, fieldMap, $filter);
          },
        };
      },
    ]);

  function toFilters(data){
    var query = data.query;
    var fieldMap = data.fields;
    var filters = query.map(parseQueryGroup.bind(query, fieldMap));
    return filters;
  }

  function toQuery(filters, data, $filter){
    var fieldMap = data.fields;
    count = 0;
    var query = filters.map(parseFilterGroup.bind(filters, fieldMap, $filter)).filter(function(item) {
      return !!item;
    });
    data.count = count;
    return query;
  }

  function parseQueryGroup(fieldMap, group, truthy) {
    if (truthy !== false) truthy = true;

    var key = Object.keys(group)[0];
    var obj = getFilterItem();

    switch (key) {
      case 'bool':
        // Support ES 5.0 http://stackoverflow.com/a/40755927
        var subKey = Object.keys(group[key])[0];
        switch (subKey) {
          case 'must':
            obj = getFilterGroup();
            obj.rules = group[key][subKey].map(parseQueryGroup.bind(group, fieldMap));
            obj.subType = 'must';
            break;
          case 'should':
            obj = getFilterGroup();
            obj.rules = group[key][subKey].map(parseQueryGroup.bind(group, fieldMap));
            obj.subType = 'should';
            break;
          case 'must_not':
            obj = parseQueryGroup(fieldMap, group[key][subKey], false);
            break;
        }
        break;

      case 'exists':
        obj.field = group[key].field;
        obj.subType = truthy ? 'exists' : 'notExists';
        delete obj.value;
        break;
      case 'term':
      case 'terms':
        obj.field = Object.keys(group[key])[0];
        var fieldData = obj.field in fieldMap ? fieldMap[obj.field] : fieldMap[obj.field.replace('.raw', '')];

        switch (fieldData.type) {
          case 'multi':
            var vals = group[key][obj.field];
            if (typeof vals === 'string') vals = [ vals ];
            obj.values = [];
            fieldData.choices.forEach(function (choice, index) {
              if (vals.indexOf(choice) !== -1) {
                obj.values.push({id: index});
              }
            });
            break;
          case 'date':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.date = new Date(group[key][obj.field]);
            break;
          case 'term':
          case 'number':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.value = group[key][obj.field];
            break;
          case 'boolean':
          case 'select':
            obj.value = group[key][obj.field];
            break;
          case 'contains':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.value = group[key][obj.field];
            obj.field = obj.field.replace('.raw', '');
            break;
          default:
            throw new Error('unexpected type ' + fieldData.type);
        }
        break;
      case 'range':
        obj.field = Object.keys(group[key])[0];
        var fieldData = fieldMap[obj.field];

        switch (fieldData.type) {
          case 'date':
            var date;

            if (Object.keys(group[key][obj.field]).length === 2) {
              date = group[key][obj.field].gte;

              if (~date.indexOf('now-')) {
                obj.subType = 'last';
                obj.value = parseInt(date.split('now-')[1].split('d')[0]);
                break;
              }

              if (~date.indexOf('now')) {
                obj.subType = 'next';
                date = group[key][obj.field].lte;
                obj.value = parseInt(date.split('now+')[1].split('d')[0]);
                break;
              }
            }
            else {
              obj.subType = Object.keys(group[key][obj.field])[0];
              obj.date = group[key][obj.field][obj.subType];
            }
            break;
          case 'number':
            obj.subType = Object.keys(group[key][obj.field])[0];
            obj.value = group[key][obj.field][obj.subType];
            break;
        }
        break;
      case 'match':
        obj.field = Object.keys(group[key])[0];
        if (typeof group[key][obj.field] === 'string') {
          obj.subType = 'matchAny';
          obj.value = group[key][obj.field];
        }
        else if ('operator' in group[key][obj.field]) {
          obj.subType = group[key][obj.field].operator === 'and' ? 'matchAll' : 'matchAny';
          obj.value = group[key][obj.field].query;
        }
        else if ('type' in group[key][obj.field] && group[key][obj.field].type === 'phrase') {
          obj.subType = 'matchPhrase';
          obj.value = group[key][obj.field].query;
        }
        break;
      case 'match_phrase':
        obj.field = Object.keys(group[key])[0];
        var fieldData = fieldMap[obj.field];
        switch (fieldData.type) {
          case 'match':
            obj.subType = 'matchPhrase';
            obj.value = group[key][obj.field];
            break;
          case 'contains':
            obj.subType = truthy ? 'contains' : 'notContains';
            obj.value = group[key][obj.field];
            break;
        }
        break;
      default:
        obj.field = Object.keys(group[key])[0];
        break;
    }

    return obj;
  }

  function parseFilterGroup(fieldMap, $filter, group) {
    var obj = {};
    if (group.type === 'group') {
      obj.bool = {};
      obj.bool[group.subType] = group.rules.map(parseFilterGroup.bind(group, fieldMap, $filter)).filter(function(item) {
        return !!item;
      });
      return obj;
    }

    var fieldName = group.field;
    if (!fieldName) return;

    var fieldData = fieldName in fieldMap ? fieldMap[fieldName] : fieldMap[fieldName.replace('.raw', '')];

    switch (fieldData.type) {
      case 'term':
        if (!group.subType) return;

        switch (group.subType) {
          case 'equals':
            if (group.value === undefined) return;
            obj.term = {};
            obj.term[fieldName] = group.value;
            break;
          case 'notEquals':
            if (group.value === undefined) return;
            obj.bool = { must_not: { term: {}}};
            obj.bool.must_not.term[fieldName] = group.value;
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.bool = { must_not: { exists: { field: fieldName }}};
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;
      case 'contains':
        if (!group.subType) return;

        switch (group.subType) {
          case 'equals':
            if (group.value === undefined) return;
            obj.term = {};
            obj.term[fieldName + '.raw'] = group.value;
            break;
          case 'notEquals':
            if (group.value === undefined) return;
            obj.bool = { must_not: { term: {}}};
            obj.bool.must_not.term[fieldName + '.raw'] = group.value;
            break;
          case 'contains':
            if (group.value === undefined) return;
            obj.match_phrase = {};
            obj.match_phrase[fieldName] = group.value;
            break;
          case 'notContains':
            if (group.value === undefined) return;
            obj.bool = { must_not: { match_phrase: {}}};
            obj.bool.must_not.match_phrase[fieldName] = group.value;
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.bool = { must_not: { exists: { field: fieldName }}};
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      case 'boolean':
        if (group.value === undefined) return;
        obj.term = {};
        obj.term[fieldName] = group.value;
        break;

      case 'number':
        if (!group.subType) return;

        switch (group.subType) {
          case 'equals':
            if (group.value === undefined) return;
            obj.term = {};
            obj.term[fieldName] = group.value;
            break;
          case 'notEquals':
            if (group.value === undefined) return;
            obj.bool = { must_not: { term: {}}};
            obj.bool.must_not.term[fieldName] = group.value;
            break;
          case 'lt':
          case 'lte':
          case 'gt':
          case 'gte':
            if (group.value === undefined) return;
            obj.range = {};
            obj.range[fieldName] = {};
            obj.range[fieldName][group.subType] = group.value;
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.bool = { must_not: { exists: { field: fieldName }}};
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      case 'date':
        if (!group.subType) return;

        switch (group.subType) {
          case 'equals':
            if (!angular.isDate(group.date)) return;
            obj.term = {};
            obj.term[fieldName] = formatDate($filter, group.date);
            break;
          case 'notEquals':
            if (!angular.isDate(group.date)) return;
            obj.bool = { must_not: { term: {}}};
            obj.bool.must_not.term[fieldName] = formatDate($filter, group.date);
            break;
          case 'lt':
          case 'lte':
          case 'gt':
          case 'gte':
            if (!angular.isDate(group.date)) return;
            obj.range = {};
            obj.range[fieldName] = {};
            obj.range[fieldName][group.subType] = formatDate($filter, group.date);
            break;
          case 'last':
            if (!angular.isNumber(group.value)) return;
            obj.range = {};
            obj.range[fieldName] = {};
            obj.range[fieldName].gte = 'now-' + group.value + 'd';
            obj.range[fieldName].lte = 'now';
            break;
          case 'next':
            if (!angular.isNumber(group.value)) return;
            obj.range = {};
            obj.range[fieldName] = {};
            obj.range[fieldName].gte = 'now';
            obj.range[fieldName].lte = 'now+' + group.value + 'd';
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.bool = { must_not: { exists: { field: fieldName }}};
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      case 'multi':
        if (group.values === undefined) return;
        obj.terms = {};
        obj.terms[fieldName] = [];
        group.values.forEach(function (value) {
          obj.terms[fieldName].push(fieldData.choices[value.id]);
        });
        break;

      case 'select':
        if (group.value === undefined) return;
        obj.term = {};
        obj.term[fieldName] = group.value;
        break;

      case 'match':
        if (!group.subType) return;

        switch (group.subType) {
          case 'matchAny':
            if (group.value === undefined) return;
            obj.match = {};
            obj.match[fieldName] = group.value;
            break;
          case 'matchAll':
            if (group.value === undefined) return;
            obj.match = {};
            obj.match[fieldName] = {};
            obj.match[fieldName].query = group.value;
            obj.match[fieldName].operator = 'and';
            break;
          case 'matchPhrase':
            if (group.value === undefined) return;
            obj.match_phrase = {};
            obj.match_phrase[fieldName] = group.value;
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.bool = { must_not: { exists: { field: fieldName }}};
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      default:
        throw new Error('unexpected type ' + fieldData.type);
    }

    count += 1;
    return obj;
  }

  function getFilterItem() {
    var item = {
      field: '',
      subType: '',
      value: '',
    };

    return angular.copy(item);
  }

  function getFilterGroup() {
    var group = {
      type: 'group',
      subType: '',
      rules: [],
    };

    return angular.copy(group);
  }

  function formatDate($filter, date) {
    if (!angular.isDate(date)) return false;
    var dateFormat = 'yyyy-MM-ddTHH:mm:ssZ';
    var fDate = $filter('date')(date, dateFormat);
    return fDate;
  }

})(window.angular);
