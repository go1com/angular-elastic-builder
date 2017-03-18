/**
 * # angular-elastic-builder
 * ## Angular Module for building an Elasticsearch Query
 *
 * @version v1.13.2
 * @link https://github.com/dncrews/angular-elastic-builder.git
 * @license MIT
 * @author Dan Crews <crewsd@gmail.com>
 */

/**
 * angular-elastic-builder
 *
 * /src/module.js
 *
 * Angular Module for building an Elasticsearch query
 */

(function(angular) {
  'use strict';

  angular.module('angular-elastic-builder', [
    'RecursionHelper',
    'ui.bootstrap.datetimepicker',
    'ui.dateTimeInput',
    'angularjs-dropdown-multiselect'
  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/BuilderDirective.js
 *
 * Angular Directive for injecting a query builder form.
 */

 (function(angular) {
   'use strict';

   angular.module('angular-elastic-builder')
    .directive('elasticBuilder', [
      'elasticQueryService',

      function EB(elasticQueryService) {

        return {
          scope: {
            data: '=elasticBuilder',
          },

          templateUrl: 'angular-elastic-builder/BuilderDirective.html',

          link: function(scope) {
            scope.filters = [];

            /**
             * Removes either Group or Rule
             */
            scope.removeChild = function(idx) {
              scope.filters.splice(idx, 1);
            };

            /**
             * Adds a Single Rule
             */
            scope.addRule = function() {
              scope.filters.push({});
            };

            /**
             * Adds a Group of Rules
             */
            scope.addGroup = function() {
              scope.filters.push({
                type: 'group',
                subType: 'must',
                rules: [],
              });
            };

            /**
             * Any time "outside forces" change the query, they should tell us so via
             * `data.needsUpdate`
             */
            scope.$watch('data.needsUpdate', function(curr) {
              if (!curr) return;

              scope.filters = elasticQueryService.toFilters(scope.data);
              scope.data.needsUpdate = false;
            });

            /**
             * Changes on the page update the Query
             */
            scope.$watch('filters', function(curr) {
              if (!curr) return;

              scope.data.query = elasticQueryService.toQuery(scope.filters, scope.data);
            }, true);
          },
        };
      },

    ]);

 })(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Chooser.js
 *
 * This file is to help recursively, to decide whether to show a group or rule
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticBuilderChooser', [
    'RecursionHelper',

    function elasticBuilderChooser(RH) {

      return {
        scope: {
          elasticFields: '=',
          item: '=elasticBuilderChooser',
          onRemove: '&',
        },

        templateUrl: 'angular-elastic-builder/ChooserDirective.html',

        compile: function (element) {
          return RH.compile(element);
        },
      };
    },

  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Group.js
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticBuilderGroup', [
    'RecursionHelper',

    function elasticBuilderGroup(RH) {

      return {
        scope: {
          elasticFields: '=',
          group: '=elasticBuilderGroup',
          onRemove: '&',
        },

        templateUrl: 'angular-elastic-builder/GroupDirective.html',

        compile: function(element) {
          return RH.compile(element, function(scope, el, attrs) {
            var group = scope.group;

            scope.addRule = function() {
              group.rules.push({});
            };
            scope.addGroup = function() {
              group.rules.push({
                type: 'group',
                subType: 'must',
                rules: [],
              });
            };

            scope.removeChild = function(idx) {
              group.rules.splice(idx, 1);
            };
          });
        },
      };
    },

  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/Rule.js
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticBuilderRule', [

    function elasticBuilderRule() {
      return {
        scope: {
          elasticFields: '=',
          rule: '=elasticBuilderRule',
          onRemove: '&',
        },

        templateUrl: 'angular-elastic-builder/RuleDirective.html',

        link: function(scope) {
          scope.getType = function() {
            var fields = scope.elasticFields
              , field = scope.rule.field;

            if (!fields || !field) return;

            return fields[field].type;
          };
          scope.resetRule = function(rule) {
            delete rule.subType;
            delete rule.value;
            delete rule.date;
            delete rule.values;
          };
        },
      };
    },

  ]);

})(window.angular);

/**
 * angular-elastic-builder
 *
 * /src/directives/RuleTypes.js
 *
 * Determines which Rule type should be displayed
 */

(function(angular) {
  'use strict';

  var app = angular.module('angular-elastic-builder');

  app.directive('elasticType', [

    function() {
      return {
        scope: {
          type: '=elasticType',
          rule: '=',
          guide: '=',
        },

        template: '<ng-include src="getTemplateUrl()" />',

        link: function(scope) {
          scope.getTemplateUrl = function() {
            var type = scope.type;
            if (!type) return;

            return 'angular-elastic-builder/types/' + type + '.html';
          };

          // This is a weird hack to make sure these are numbers
          scope.booleans = [ 'False', 'True' ];
          scope.booleansOrder = [ 'True', 'False' ];

          scope.inputNeeded = function() {
            var needs = [
              'equals',
              'notEquals',

              'contains',
              'notContains',

              'gt',
              'gte',
              'lt',
              'lte',
            ];

            return ~needs.indexOf(scope.rule.subType);
          };

          scope.numberNeeded = function() {
            var needs = [
              'last',
              'next',
            ];

            return ~needs.indexOf(scope.rule.subType);
          };

          if (!scope.rule.date) {
            scope.rule.date = new Date();
          }

          scope.buildOptions = function() {
            scope.rule.values = [];
            scope.rule.options = [];
            scope.guide.choices.forEach(function (choice, index) {
              scope.rule.options.push({id: index, label: choice});
            });
          };
        },

      };
    },

  ]);

})(window.angular);

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
        var fieldData = fieldMap[obj.field];

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

(function(angular) {"use strict"; angular.module("angular-elastic-builder").run(["$templateCache", function($templateCache) {$templateCache.put("angular-elastic-builder/BuilderDirective.html","<div class=\"elastic-builder\">\n  <div class=\"form-inline\">\n    <div class=\"elastic-filter\">\n      <div\n        class=\"elastic-filter-item\"\n        data-ng-repeat=\"filter in filters\"\n        data-elastic-builder-chooser=\"filter\"\n        data-elastic-fields=\"data.fields\"\n        data-on-remove=\"removeChild($index)\"\n        data-depth=\"0\"></div>\n      <div class=\"elastic-filter-item\">\n        <div class=\"elastic-builder-rule-wrapper\">\n          <div class=\"elastic-builder-rule\">\n            <a class=\"btn btn-default\" title=\"Add Rule\" data-ng-click=\"addRule()\">\n              <i class=\"fa fa-plus\"></i>\n            </a>\n            <a class=\"btn btn-default\" title=\"Add Group\" data-ng-click=\"addGroup()\">\n              <i class=\"fa fa-list\"></i>\n            </a>\n          </div>\n        <div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("angular-elastic-builder/ChooserDirective.html","<div data-ng-if=\"item.type === \'group\'\"\n  data-elastic-builder-group=\"item\"\n  data-depth=\"{{ depth }}\"\n  data-elastic-fields=\"elasticFields\"\n  data-on-remove=\"onRemove()\"\n  class=\"elastic-builder-rule-wrapper\"></div>\n\n<div data-ng-if=\"item.type !== \'group\'\"\n  data-elastic-builder-rule=\"item\"\n  data-elastic-fields=\"elasticFields\"\n  data-on-remove=\"onRemove()\"\n  class=\"elastic-builder-rule-wrapper\"></div>\n");
$templateCache.put("angular-elastic-builder/GroupDirective.html","<div class=\"elastic-builder-rule elastic-builder-rule-group\">\n  <div class=\"elastic-builder-group\">\n    <h5>If\n      <select data-ng-model=\"group.subType\" class=\"form-control\">\n        <option value=\"must\">all</option>\n        <option value=\"should\">any</option>\n      </select>\n      of these conditions are met\n\n      <a class=\"btn btn-default remover\" data-ng-click=\"onRemove()\">\n        <i class=\"fa fa-times\"></i>\n      </a>\n    </h5>\n\n    <div class=\"elastic-filter\">\n      <div\n        class=\"elastic-filter-item\"\n        data-ng-repeat=\"rule in group.rules\"\n        data-elastic-builder-chooser=\"rule\"\n        data-elastic-fields=\"elasticFields\"\n        data-depth=\"{{ +depth + 1 }}\"\n        data-on-remove=\"removeChild($index)\"></div>\n\n      <div class=\"elastic-filter-item\">\n        <div class=\"elastic-builder-rule-wrapper\">\n          <div class=\"elastic-builder-rule\">\n            <a class=\"btn btn-default\" title=\"Add Sub-Rule\" data-ng-click=\"addRule()\">\n              <i class=\"fa fa-plus\"></i>\n            </a>\n            <a class=\"btn btn-default\" title=\"Add Sub-Group\" data-ng-click=\"addGroup()\">\n              <i class=\"fa fa-list\"></i>\n            </a>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("angular-elastic-builder/RuleDirective.html","<div class=\"elastic-builder-rule\">\n  <select class=\"form-control\" data-ng-model=\"rule.field\" data-ng-options=\"key as value.title for (key, value) in elasticFields\" ng-change=\"resetRule(rule)\"></select>\n\n  <span data-elastic-type=\"getType()\" data-rule=\"rule\" data-guide=\"elasticFields[rule.field]\"></span>\n\n  <a class=\"btn btn-default remover\" data-ng-click=\"onRemove()\">\n    <i class=\"fa fa-times\"></i>\n  </a>\n\n</div>\n");
$templateCache.put("angular-elastic-builder/types/boolean.html","<span class=\"boolean-rule\">\n  <span class=\"rule-text\">Equals</span>\n\n  <!-- This is a weird hack to make sure these are numbers -->\n  <select\n    data-ng-model=\"rule.value\"\n    class=\"form-control\"\n    data-ng-options=\"booleans.indexOf(choice) as choice for choice in booleansOrder\">\n  </select>\n</span>\n");
$templateCache.put("angular-elastic-builder/types/contains.html","<span class=\"contains-rule\">\n  <select data-ng-model=\"rule.subType\" class=\"form-control\">\n    <!-- Term Options -->\n    <optgroup label=\"Exact\">\n      <option value=\"equals\">Equals</option>\n      <option value=\"notEquals\">Not Equals</option>\n    </optgroup>\n\n    <!-- Contains Options -->\n    <optgroup label=\"Contains\">\n      <option value=\"contains\">Contains</option>\n      <option value=\"notContains\">Does not contain</option>\n    </optgroup>\n\n    <!-- Generic Options -->\n    <optgroup label=\"Generic\">\n      <option value=\"exists\">Exists</option>\n      <option value=\"notExists\">Not Exists</option>\n    </optgroup>\n\n  </select>\n  <input\n    data-ng-if=\"inputNeeded()\"\n    class=\"form-control\"\n    data-ng-model=\"rule.value\"\n    type=\"text\">\n</span>\n");
$templateCache.put("angular-elastic-builder/types/date.html","<span class=\"date-rule form-inline\">\n  <select data-ng-model=\"rule.subType\" class=\"form-control\">\n    <optgroup label=\"Exact\">\n      <option value=\"equals\">Equals</option>\n      <option value=\"notEquals\">Not Equals</option>\n    </optgroup>\n    <optgroup label=\"Unbounded-range\">\n      <option value=\"lt\">&lt;</option>\n      <option value=\"lte\">&le;</option>\n      <option value=\"gt\">&gt;</option>\n      <option value=\"gte\">&ge;</option>\n    </optgroup>\n    <optgroup label=\"Bounded-range\">\n      <option value=\"last\">In the last</option>\n      <option value=\"next\">In the next</option>\n    </optgroup>\n    <optgroup label=\"Generic\">\n      <option value=\"exists\">Exists</option>\n      <option value=\"notExists\">Not Exists</option>\n    </optgroup>\n  </select>\n\n  <div class=\"form-group\" data-ng-if=\"inputNeeded()\">\n    <div class=\"input-group\">\n      <input type=\"text\" class=\"form-control\" data-ng-model=\"rule.date\" data-date-time-input=\"YYYY-MM-DDTHH:mm:ssZ\" size=25>\n      <div class=\"input-group-btn\">\n        <button type=\"button\" class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">\n          <span><i class=\"fa fa-calendar\"></i></span>\n        </button>\n        <ul class=\"dropdown-menu dropdown-menu-right\" role=\"menu\" aria-labelledby=\"dLabel\">\n          <datetimepicker data-ng-model=\"rule.date\" data-datetimepicker-config=\"{ dropdownSelector: \'.dropdown-toggle\' }\"/>\n        </ul>\n      </div>\n    </div>\n  </div>\n\n  <span data-ng-if=\"numberNeeded()\">\n    <input type=\"number\" class=\"form-control\" data-ng-model=\"rule.value\" min=0> <span class=\"rule-text\">days</span>\n  </span>\n\n</span>\n");
$templateCache.put("angular-elastic-builder/types/match.html","<span class=\"match-rule\">\n  <select data-ng-model=\"rule.subType\" class=\"form-control\">\n    <!-- Term Options -->\n    <option value=\"matchAll\">Match All</option>\n    <option value=\"matchAny\">Match Any</option>\n    <option value=\"matchPhrase\">Match Phrase</option>\n\n  </select>\n\n  <input\n    class=\"form-control\"\n    data-ng-model=\"rule.value\"\n    type=\"text\">\n</span>\n");
$templateCache.put("angular-elastic-builder/types/multi.html","<span class=\"multi-rule\">\n  <span ng-init=\"buildOptions()\" ng-dropdown-multiselect=\"\" options=\"rule.options\" selected-model=\"rule.values\" checkboxes=\"true\"></span>\n</span>\n");
$templateCache.put("angular-elastic-builder/types/number.html","<span class=\"number-rule\">\n  <select data-ng-model=\"rule.subType\" class=\"form-control\">\n    <optgroup label=\"Exact\">\n      <option value=\"equals\">Equals</option>\n      <option value=\"notEquals\">Not Equals</option>\n    </optgroup>\n    <optgroup label=\"Range\">\n      <option value=\"gt\">&gt;</option>\n      <option value=\"gte\">&ge;</option>\n      <option value=\"lt\">&lt;</option>\n      <option value=\"lte\">&le;</option>\n    </optgroup>\n\n    <optgroup label=\"Generic\">\n      <option value=\"exists\">Exists</option>\n      <option value=\"notExists\">Not Exists</option>\n    </optgroup>\n  </select>\n\n  <!-- Range Fields -->\n  <input data-ng-if=\"inputNeeded()\"\n    class=\"form-control\"\n    data-ng-model=\"rule.value\"\n    type=\"number\"\n    min=\"{{ guide.minimum }}\"\n    max=\"{{ guide.maximum }}\">\n</span>\n");
$templateCache.put("angular-elastic-builder/types/select.html","<span class=\"select-rule\">\n  <span class=\"rule-text\">Equals</span>\n\n  <select\n    data-ng-model=\"rule.value\"\n    class=\"form-control\"\n    data-ng-options=\"choice for choice in guide.choices\">\n  </select>\n</span>\n");
$templateCache.put("angular-elastic-builder/types/term.html","<span class=\"term-rule\">\n  <select data-ng-model=\"rule.subType\" class=\"form-control\">\n    <!-- Term Options -->\n    <optgroup label=\"Exact\">\n      <option value=\"equals\">Equals</option>\n      <option value=\"notEquals\">Not Equals</option>\n    </optgroup>\n\n    <!-- Generic Options -->\n    <optgroup label=\"Generic\">\n      <option value=\"exists\">Exists</option>\n      <option value=\"notExists\">Not Exists</option>\n    </optgroup>\n\n  </select>\n  <input\n    data-ng-if=\"inputNeeded()\"\n    class=\"form-control\"\n    data-ng-model=\"rule.value\"\n    type=\"text\">\n</span>\n");}]);})(window.angular);