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
            },
            {
              'match_phrase': {
                'test.person.name.contains.analyzed': 'My First Name'
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
        'terms': {
          'test.person.gender.multi2': [ 'male', 'female' ]
        }
      },
      {
        'term': {
          'test.person.name.contains': 'My Full Name'
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
          'test.select': 2
        }
      }
    ];

    data.fields = {
     'test.number': { title: 'Test Number', type: 'number', minimum: 650 },
     'test.term': { title: 'Test Term', type: 'term' },
     'test.boolean': { title: 'Test Boolean', type: 'boolean' },
     'test.state.multi': { title: 'Test Multi', type: 'multi', choices: [ {id: 'AZ', label: 'Arizona'}, {id: 'CA', label: 'California'}, {id: 'CT', label: 'Connecticut'} ]},
     'test.person.gender.multi2': { title: 'Test Multi 2', type: 'multi', choices: [ {id: 'male', label: 'Male'}, {id: 'female', label: 'Female'}, {id: 'other', label: 'Other'} ]},
     'test.person.name.contains': { title: 'Test Contains', type: 'contains'},
     'test.date': { title: 'Test Date', type: 'date' },
     'test.otherdate': { title: 'Test Other Date', type: 'date' },
     'test.match': { title: 'Test Match', type: 'match' },
     'test.select': { title: 'Test Select', type: 'select', choices: [ {id: 0, label: 'Active'}, {id: 1, label: 'Pending'}, {id: 2, label: 'Working'}, {id: 3, label: 'Finished'} ] }
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
