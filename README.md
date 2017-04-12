# Angular Elasticsearch Query Builder

[![NPM version][npm-image]][npm-url]
![Bower version][bower-image]
[![Downloads][downloads-image]][downloads-url]
[![Tips][gratipay-image]][gratipay-url]

This is an Angular.js directive for building an [Elasticsearch](https://www.elastic.co/) query.
You just give it the fields and can generate a query for it. Its layout is defined using [Bootstrap](http://getbootstrap.com/) classes, but you may also choose to just style it yourself.

It's still pretty early on, as it doesn't support a whole lot of use-cases, but we need to make it awesome. Contributions accepted.

## Try it Out
[View an (old) example here](http://dncrews.com/angular-elastic-builder/examples/)

## Usage

### Dependency
Notice: this plugin requires:
  - the [Angular Recursion](https://github.com/marklagendijk/angular-recursion) module.
  - the [Angular Bootstrap Datetime Picker](https://github.com/dalelotts/angular-bootstrap-datetimepicker) module to display the datetime picker.

### Installation
Install angular elastic builder along with its dependencies.
```
bower install angular-elastic-builder-tienvx -S
```
Includes js and css files into your app.
```html
<link rel="stylesheet" href="bower_components/bootstrap/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="bower_components/angular-bootstrap-datetimepicker/src/css/datetimepicker.css">
<link rel="stylesheet" href="http://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
<link rel="stylesheet" href="bower_components/angular-elastic-builder-tienvx/angular-elastic-builder.css">
<script type="text/javascript" src="bower_components/jquery/dist/jquery.min.js"></script>
<script type="text/javascript" src="bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
<script type="text/javascript" src="bower_components/moment/moment.js"></script>
<script type="text/javascript" src="bower_components/angular/angular.min.js"></script>
<script type="text/javascript" src="bower_components/angular-bootstrap-datetimepicker/src/js/datetimepicker.js"></script>
<script type="text/javascript" src="bower_components/angular-bootstrap-datetimepicker/src/js/datetimepicker.templates.js"></script>
<script type="text/javascript" src="bower_components/angular-recursion/angular-recursion.min.js"></script>
<script type="text/javascript" src="bower_components/angular-date-time-input/src/dateTimeInput.js"></script>
<script type="text/javascript" src="bower_components/angularjs-dropdown-multiselect/src/angularjs-dropdown-multiselect.js"></script>
<script type="text/javascript" src="bower_components/angular-elastic-builder-tienvx/angular-elastic-builder.js"></script>
```

Then make sure that it's included in your app's dependencies during module creation.

```js
angularmodule('appName', [ 'angular-elastic-builder' ]);
```

Then you can use it in your app
```js
/* Controller code */

/**
 * The elasticBuilderData object will be modified in place so that you can use
 * your own $watch, and/or your own saving mechanism
 */
$scope.elasticBuilderData = {};
$scope.elasticBuilderData.query = [];

/**
 * This object is the lookup for what fields
 * are available in your database, as well as definitions of what kind
 * of data they are
 */
$scope.elasticBuilderData.fields = {
  'test.number': { field: 'age', title: 'Age', type: 'number', minimum: 18 },
  'test.term': { field: 'first_name', title: 'First Name', type: 'term' },
  'test.boolean': { field: 'status', title: 'Status', type: 'boolean' },
  'test.multi': { field: 'state', title: 'State', type: 'multi', choices: [ {id: 'AZ', label: 'Arizona'}, {id: 'CA', label: 'California'}, {id: 'CT', label: 'Connecticut'} ]},
  'test.contains': { field: 'name', title: 'Name', type: 'contains'},
  'test.date': { field: 'dob', title: 'DOB', type: 'date' },
  'test.date2': { field: 'registration_date', title: 'Registration Date', type: 'date' },
  'test.match': { field: 'about', title: 'About', type: 'match' },
  'test.select': { field: 'gender', title: 'Gender', type: 'select', choices: [ {id: 'male', label: 'Male'}, {id: 'female', label: 'Female'}, {id: 'other', label: 'Other'} ] },
  'test.parent.term': { field: 'name', parent: 'company', title: 'Company Name', type: 'term' },
  'test.nested.term': { field: 'friends.name', nested: 'friends', title: 'Friend Name', type: 'term' }
};
```

To use contains field, your mapping should be:
```
"name": {
  "type": "keyword",
  "fields": {
    "analyzed": {
      "type":  "text"
    }
  }
},
```

```html
<div data-elastic-builder="elasticBuilderData"></div>
```

The above elasticFields would allow you create the following form:
![Screenshot][screenshot-image]

Which represents the following Elasticsearch Query:
```json
{
  "size": 0,
  "bool": {
    "must": [
      {
        "bool": {
          "must": [
            {
              "term": {
                "dob": "2016-04-08T16:16:48+0700"
              }
            },
            {
              "range": {
                "age": {
                  "gte": 21
                }
              }
            },
            {
              "range": {
                "age": {
                  "lt": 64
                }
              }
            },
            {
              "match_phrase": {
                "name.analyzed": "Andrew"
              }
            },
            {
              "bool": {
                "should": [
                  {
                    "nested": {
                      "path": "friends",
                      "query": {
                        "term": {
                          "friends.name": "Chris"
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
        "term": {
          "status": 0
        }
      },
      {
        "terms": {
          "state": [
            "AZ",
            "CT"
          ]
        }
      },
      {
        "term": {
          "name": "Andrew Barnes"
        }
      },
      {
        "bool": {
          "must_not": {
            "term": {
              "first_name": "Andrew"
            }
          }
        }
      },
      {
        "exists": {
          "field": "first_name"
        }
      },
      {
        "range": {
          "registration_date": {
            "gte": "now",
            "lte": "now+7d"
          }
        }
      },
      {
        "match": {
          "about": "my name is andrew"
        }
      },
      {
        "term": {
          "gender": "male"
        }
      },
      {
        "has_parent": {
          "parent_type": "company",
          "query": {
            "term": {
              "name": "GO1"
            }
          }
        }
      }
    ]
  }
}
```


### Field Options
  - `type`: This determines how the fields are displayed in the form.
    - Currently supported:
      - `'number'`: In addition to Generic Options, gets "&gt;", "&ge;", "&lt;", "&le;", "="
      - `'term'`: In addition to Generic Options, gets "Equals" and "! Equals"
      - `'contains'`: In addition to Generic Options, gets "Equals", "! Equals", "Contains Phrase", "! Contains Phrase"
      - `'match'`: In addition to Generic Options, gets "Contains Any Words" and "Contains All Words" and "Contains Phrase"
      - `'boolean'`: Does not get Generic Options. Gets `true` and `false`
        - These are actually "equals 0" and "equals 1" for the database query
      - `'multi'`: Does not get Generic Options. Gets options defined in choices. Allowed to select multiple options.
      - `'select'`: Does not get Generic Options. Gets options defined in choices. Allowed to select single option.
      - `'date'`: In addition to Generic Options, gets "&gt;", "&ge;", "&lt;", "&le;", "="

Generic Options
  - In addition to any specific options for fields, all fields also get a "Exists" and "! Exists" option


## External Changes && Initial State
If you want to pass in an initial state (or if you make changes to the query externally), you'll need to
set the configuration flag `needsUpdate` to `true`. Any time this flag changes to `true`, this directive
will overwrite the current state and data with whatever is now defined in your configuration object.


## Local Development
To work on this module locally, you will need to clone it and run `gulp watch`. This will ensure that your changes get compiled properly. You will also need to make sure you run `gulp` to build the "dist" files before commit.


[npm-image]: https://img.shields.io/npm/v/angular-elastic-builder-tienvx.svg
[npm-url]: https://www.npmjs.org/package/angular-elastic-builder-tienvx
[bower-image]: https://img.shields.io/bower/v/angular-elastic-builder-tienvx.svg
[downloads-image]: https://img.shields.io/npm/dm/angular-elastic-builder-tienvx.svg
[downloads-url]: https://www.npmjs.org/package/angular-elastic-builder-tienvx
[gratipay-image]: https://img.shields.io/gratipay/dncrews.svg
[gratipay-url]: https://www.gratipay.com/dncrews/
[screenshot-image]: ./screenshot.png

