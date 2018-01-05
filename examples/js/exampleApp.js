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
                'dob': '2016-04-08T09:16:48'
              }
            },
            {
              'range': {
                'age': {
                  'gte': 21
                }
              }
            },
            {
              'range': {
                'age': {
                  'lt': 64
                }
              }
            },
            {
              'match_phrase': {
                'name.analyzed': 'Andrew'
              }
            },
            {
              'bool': {
                'should': [
                  {
                    'nested': {
                      'path': 'friends',
                      'query': {
                        'term': {
                          'friends.name': 'Chris'
                        }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        'term': {
          'status': 0
        }
      },
      {
        'terms': {
          'state': [ 'AZ', 'CT' ]
        }
      },
      {
        'term': {
          'name': 'Andrew Barnes'
        }
      },
      {
        'bool': {
          'must_not': {
            'term': {
              'first_name': 'Andrew'
            }
          }
        }
      },
      {
        'exists': {
          'field': 'first_name'
        }
      },
      {
        'range': {
          'registration_date': {
            'gte': 'now',
            'lte': 'now+7d'
          }
        }
      },
      {
        'match': {
          'about': 'my name is andrew'
        }
      },
      {
        'term': {
          'gender': 'male'
        }
      },
      {
        'has_parent': {
          'parent_type': 'company',
          'query': {
            'term': {
              'name': 'GO1'
            }
          }
        }
      }
    ];

    data.fields = {
      'test.number': { field: 'age', title: 'Age', type: 'number', minimum: 18, helpText: 'Minimum is 18' },
      'test.term': { field: 'first_name', title: 'First Name', type: 'term', placeholder: 'My First Name', helpText: 'Do not put your last name here' },
      'test.boolean': { field: 'status', title: 'Status', type: 'boolean' },
      'test.multi': { field: 'state', title: 'State', type: 'multi', choices: [ {id: 'AZ', label: 'Arizona'}, {id: 'CA', label: 'California'}, {id: 'CT', label: 'Connecticut'} ]},
      'test.contains': { field: 'name', title: 'Name', type: 'contains', placeholder: 'e.g. Andrew or [CURRENT_USER_NAME]' },
      'test.date': { field: 'dob', title: 'DOB', type: 'date' },
      'test.date2': { field: 'registration_date', title: 'Registration Date', type: 'date' },
      'test.match': { field: 'about', title: 'About', type: 'match' },
      'test.select': { field: 'gender', title: 'Gender', type: 'select', choices: [ {id: 'male', label: 'Male'}, {id: 'female', label: 'Female'}, {id: 'other', label: 'Other'} ] },
      'test.parent.term': { field: 'name', parent: 'company', title: 'Company Name', type: 'term' },
      'test.nested.term': { field: 'friends.name', nested: 'friends', title: 'Friend Name', type: 'term' }
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
