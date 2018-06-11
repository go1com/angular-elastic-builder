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
    var filters = query.map(parseQueryGroup.bind(null, fieldMap, true, undefined, undefined));
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

  function parseQueryGroup(fieldMap, truthy, parent, nested, group) {
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
            obj.rules = group[key][subKey].map(parseQueryGroup.bind(null, fieldMap, truthy, parent, nested));
            obj.subType = 'must';
            break;
          case 'should':
            obj = getFilterGroup();
            obj.rules = group[key][subKey].map(parseQueryGroup.bind(null, fieldMap, truthy, parent, nested));
            obj.subType = 'should';
            break;
          case 'must_not':
            obj = parseQueryGroup(fieldMap, false, parent, nested, group[key][subKey]);
            break;
        }
        break;

      case 'has_parent':
        obj = parseQueryGroup(fieldMap, truthy, group[key].parent_type, nested, group[key].query);
        break;

      case 'nested':
        obj = parseQueryGroup(fieldMap, truthy, parent, group[key].path, group[key].query);
        break;

      case 'exists':
        obj.field = searchField(fieldMap, group[key].field, parent, nested);
        obj.subType = truthy ? 'exists' : 'notExists';
        delete obj.value;
        break;
      case 'term':
      case 'terms':
        var subKey = Object.keys(group[key])[0];
        obj.field = searchField(fieldMap, subKey, parent, nested);
        var fieldData = fieldMap[obj.field];

        switch (fieldData.type) {
          case 'multi':
            var vals = group[key][subKey];
            if (typeof vals === 'string' || typeof vals === 'number') vals = [ vals ];
            obj.values = [];
            fieldData.choices.forEach(function (choice) {
              if (vals.indexOf(choice.id) !== -1) {
                obj.values.push({id: choice.id});
              }
            });
            break;
          case 'date':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.date = new Date(group[key][subKey]);
            break;
          case 'term':
          case 'number':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.value = group[key][subKey];
            break;
          case 'boolean':
            obj.value = group[key][subKey];
            break;
          case 'select':
            fieldData.choices.forEach(function (choice) {
              if (group[key][subKey] === choice.id) {
                obj.value = choice;
              }
            });
            break;
          case 'contains':
            obj.subType = truthy ? 'equals' : 'notEquals';
            obj.value = group[key][subKey];
            break;
          default:
            throw new Error('unexpected type ' + fieldData.type);
        }
        break;
      case 'range':
        var subKey = Object.keys(group[key])[0];
        obj.field = searchField(fieldMap, subKey, parent, nested);
        var fieldData = fieldMap[obj.field];

        switch (fieldData.type) {
          case 'date':
            var date;

            if (Object.keys(group[key][subKey]).length === 2) {
              date = group[key][subKey].gte;

              if (~date.indexOf('now-')) {
                obj.subType = 'last';
                obj.value = parseInt(date.split('now-')[1].split('d')[0]);
                break;
              }

              if (~date.indexOf('now')) {
                obj.subType = 'next';
                date = group[key][subKey].lte;
                obj.value = parseInt(date.split('now+')[1].split('d')[0]);
                break;
              }
            }
            else {
              obj.subType = Object.keys(group[key][subKey])[0];
              obj.date = group[key][subKey][obj.subType];
            }
            break;
          case 'number':
            obj.subType = Object.keys(group[key][subKey])[0];
            obj.value = group[key][subKey][obj.subType];
            break;
        }
        break;
      case 'match':
        var subKey = Object.keys(group[key])[0];
        obj.field = searchField(fieldMap, subKey, parent, nested);
        if (typeof group[key][subKey] === 'string') {
          obj.subType = 'matchAny';
          obj.value = group[key][subKey];
        }
        else if ('operator' in group[key][subKey]) {
          obj.subType = group[key][subKey].operator === 'and' ? 'matchAll' : 'matchAny';
          obj.value = group[key][subKey].query;
        }
        else if ('type' in group[key][subKey] && group[key][subKey].type === 'phrase') {
          obj.subType = 'matchPhrase';
          obj.value = group[key][subKey].query;
        }
        break;
      case 'match_phrase':
        var subKey = Object.keys(group[key])[0];
        if (subKey.endsWith('.analyzed')) {
          obj.field = searchField(fieldMap, subKey.replace('.analyzed', ''), parent, nested);
        }
        else {
          obj.field = searchField(fieldMap, subKey, parent, nested);
        }
        var fieldData = fieldMap[obj.field];
        switch (fieldData.type) {
          case 'match':
            obj.subType = 'matchPhrase';
            obj.value = group[key][subKey];
            break;
          case 'contains':
            obj.subType = truthy ? 'contains' : 'notContains';
            obj.value = group[key][subKey];
            break;
        }
        break;
      default:
        var subKey = Object.keys(group[key])[0];
        obj.field = subKey;
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

    var fieldKey = group.field;
    if (!fieldKey) return;

    var fieldData = fieldMap[fieldKey];
    var fieldName = fieldData.field;

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
            obj.term[fieldName] = group.value;
            break;
          case 'notEquals':
            if (group.value === undefined) return;
            obj.bool = { must_not: { term: {}}};
            obj.bool.must_not.term[fieldName] = group.value;
            break;
          case 'contains':
            if (group.value === undefined) return;
            obj.match_phrase = {};
            obj.match_phrase[fieldName + '.analyzed'] = group.value;
            break;
          case 'notContains':
            if (group.value === undefined) return;
            obj.bool = { must_not: { match_phrase: {}}};
            obj.bool.must_not.match_phrase[fieldName + '.analyzed'] = group.value;
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
          obj.terms[fieldName].push(value.id);
        });
        break;

      case 'select':
        if (group.value === undefined) return;
        obj.term = {};
        obj.term[fieldName] = group.value.id;
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

    if (fieldData.parent) {
      obj = {
        has_parent: {
          parent_type: fieldData.parent,
          query: obj
        }
      }
    }

    if (fieldData.nested) {
      obj = {
        nested: {
          path: fieldData.nested,
          query: obj
        }
      };
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

  function searchField(fields, fieldName, parent, nested) {
    var keys = Object.keys(fields);
    var values = Object.values(fields);
    var index = values.indexOf(values.filter(function(item) {
      return (item.field === fieldName && item.parent === parent) || ([nested , item.field].join('.') === fieldName && item.nested === nested);
    })[0]);
    return keys[index];
  }

})(window.angular);
