(function(angular) {

  var app = angular.module('exampleApp', [
    'angular-elastic-builder',
  ]);

  app.controller('BasicController', function() {

    var data = this.data = {};

    data.query = [
      {
        'bool': {
          'must': [
            {
              'term': {
                'test.date': '2016-04-08T09:16:48'
              }
            },
            {
              'range': {
                'test.number': {
                  'gte': 650
                }
              }
            },
            {
              'range': {
                'test.number': {
                  'lt': 850
                }
              }
            }
          ]
        }
      },
      {
        'term': {
          'test.boolean': 0
        }
      },
      {
        'terms': {
          'test.state.multi': [ 'AZ', 'CT' ]
        }
      },
      {
        'match_phrase': {
          'test.person.name.contains': 'My First Name'
        }
      },
      {
        'bool': {
          'must_not': {
            'term': {
              'test.term': 'Not me'
            }
          }
        }
      },
      {
        'exists': {
          'field': 'test.term'
        }
      },
      {
        'range': {
          'test.otherdate': {
            'gte': 'now',
            'lte': 'now+7d'
          }
        }
      },
      {
        'match': {
          'test.match': 'brown dog'
        }
      },
      {
        'term': {
          'test.select': 'Working'
        }
      }
    ];

    data.fields = {
     'test.number': { title: 'Test Number', type: 'number', minimum: 650 },
     'test.term': { title: 'Test Term', type: 'term' },
     'test.boolean': { title: 'Test Boolean', type: 'boolean' },
     'test.state.multi': { title: 'Test Multi', type: 'multi', choices: [ 'AZ', 'CA', 'CT' ]},
     'test.person.name.contains': { title: 'Test Contains', type: 'contains'},
     'test.date': { title: 'Test Date', type: 'date' },
     'test.otherdate': { title: 'Test Other Date', type: 'date' },
     'test.match': { title: 'Test Match', type: 'match' },
     'test.select': { title: 'Test Select', type: 'select', choices: [ 'Active', 'Pending', 'Working', 'Finished' ] }
    };

    data.needsUpdate = true;

    this.showQuery = function() {
      var queryToShow = {
        size: 0,
        bool: { must : data.query }
      };

      return JSON.stringify(queryToShow, null, 2);
    };

  });

})(window.angular);
