/**
 * angular-elastic-builder
 *
 * /src/services/QueryService.js
 *
 * This file is used to convert filters into queries, and vice versa
 */

(function(angular) {
  'use strict';

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

  function toFilters(query, fieldMap){
    var filters = query.map(parseQueryGroup.bind(query, fieldMap));
    return filters;
  }

  function toQuery(filters, fieldMap, $filter){
    var query = filters.map(parseFilterGroup.bind(filters, fieldMap, $filter)).filter(function(item) {
      return !!item;
    });
    return query;
  }

  function parseQueryGroup(fieldMap, group, truthy) {
    if (truthy !== false) truthy = true;

    var key = Object.keys(group)[0];
    var obj = getFilterTemplate(key);

    switch (key) {
      case 'or':
      case 'and':
        obj.rules = group[key].map(parseQueryGroup.bind(group, fieldMap));
        obj.subType = key;
        break;
      case 'missing':
      case 'exists':
        obj.field = group[key].field;
        obj.subType = {
          exists: 'exists',
          missing: 'notExists',
        }[key];
        delete obj.value;
        break;
      case 'term':
      case 'terms':
        obj.field = Object.keys(group[key])[0];
        var fieldData = fieldMap[obj.field];

        switch (fieldData.type) {
          case 'multi':
            var vals = group[key][obj.field];
            if (typeof vals === 'string') vals = [ vals ];
            obj.values = fieldData.choices.reduce(function(prev, choice) {
              prev[choice] = group[key][obj.field].indexOf(choice) !== -1;
              return prev;
            }, {});
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
            obj.field = Object.keys(group[key])[0];

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
            obj.field = Object.keys(group[key])[0];
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
        obj.subType = 'matchPhrase';
        obj.value = group[key][obj.field];
        break;

      case 'not':
        obj = parseQueryGroup(fieldMap, group[key].filter, false);
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
      obj[group.subType] = group.rules.map(parseFilterGroup.bind(group, fieldMap, $filter)).filter(function(item) {
        return !!item;
      });
      return obj;
    }

    var fieldName = group.field;
    var fieldData = fieldMap[fieldName];


    if (!fieldName) return;

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
            obj.not = { filter: { term: {}}};
            obj.not.filter.term[fieldName] = group.value;
            break;
          case 'exists':
            obj.exists = { field: fieldName };
            break;
          case 'notExists':
            obj.missing = { field: fieldName };
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
            obj.not = { filter: { term: {}}};
            obj.not.filter.term[fieldName] = group.value;
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
            obj.missing = { field: fieldName };
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
            obj.not = { filter: { term: {}}};
            obj.not.filter.term[fieldName] = formatDate($filter, group.date);
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
            obj.missing = { field: fieldName };
            break;
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      case 'multi':
        obj.terms = {};
        obj.terms[fieldName] = Object.keys(group.values || {}).reduce(function(prev, key) {
          if (group.values[key]) prev.push(key);

          return prev;
        }, []);
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
          default:
            throw new Error('unexpected subtype ' + group.subType);
        }
        break;

      default:
        throw new Error('unexpected type ' + fieldData.type);
    }

    return obj;
  }

  function getFilterTemplate(key) {
    var typeMap = {
      or: 'group',
      and: 'group',
    };
    var type = typeMap[key] || 'item';
    var templates = {
      group: {
        type: 'group',
        subType: '',
        rules: [],
      },
      item: {
        field: '',
        subType: '',
        value: '',
      },
    };

    return angular.copy(templates[type]);
  }

  function formatDate($filter, date) {
    if (!angular.isDate(date)) return false;
    var dateFormat = 'yyyy-MM-ddTHH:mm:ssZ';
    var fDate = $filter('date')(date, dateFormat);
    return fDate;
  }

})(window.angular);
