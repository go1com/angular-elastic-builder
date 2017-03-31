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
            var fieldMap = scope.elasticFields
              , fieldName = scope.rule.field;

            if (!fieldMap || !fieldName) return;

            var field = fieldName in fieldMap ? fieldMap[fieldName] : fieldMap[fieldName.replace('.analyzed', '')];
            return field.type;
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
