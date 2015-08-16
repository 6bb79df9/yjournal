angular.module('item', ['ngRoute', 'ui.codemirror'])

.config(function($routeProvider) {
  $routeProvider
  .when('/', {
    controller : "ItemListController as itemList",
    templateUrl : "itemList.html",
    resolve : {
      items : function (Items) {
        return Items.query();
      }
    }
  })
  .when('/edit/:id', {
    controller : "ItemEditController as itemEdit",
    templateUrl : "itemEdit.html",
  })
  .otherwise({
    redirectTo : "/"
  })
  ;
})

.service('Items', function($http, $q) {
  var self = this;

  self.query = function () {
    var deferred = $q.defer();

    $http.get('/api/item.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });
    return deferred.promise;
  };

  self.create = function(content) {
    var deferred = $q.defer();

    $http.post('/api/item.json', {content : content})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  self.retrieve = function(id) {
    var deferred = $q.defer();

    $http.get('/api/item/' + id + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  }

  self.update = function(id, content) {
    var deferred = $q.defer();

    $http.put('/api/item/' + id + '.json', {content : content})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  self.remove = function(id) {
    var deferred = $q.defer();

    $http.delete('/api/item/' + id + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };
})

.controller('ItemListController', function(Items, items) {
  var itemList = this;
  itemList.items = items;

  itemList.title = function(item) {
    var m = item.content.match(/^\s*([^\r\n]+)/);
    return m == null ? "<UNTITLED>" : m[0];
  }

  itemList.add = function() {
    Items.create(itemList.content)
      .then(function (data) {
        items.push(data);
      }, function(data) {
      }, function(data) {
      });
    itemList.content = "";
  };

  itemList.remove = function(id) {
    Items.remove(id)
      .then(function (data) {
        for (i in itemList.items ) {
          if (itemList.items[i].id === id) {
            itemList.items.splice(i, 1);
            break;
          }
        }
      }, function (data) {
      }, function (data) {
      });
  }
})

.controller('ItemEditController', function($scope, $q, $location, $routeParams, Items) {
  var itemEdit = this;

  Items.retrieve($routeParams.id)
    .then(function(data) {
      itemEdit.item = data;
    }, function(data) {
      $location.path('/');
    });

  itemEdit.save = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
      }, function(data) {
      }, function (data) {
      });
  };

  itemEdit.saveAndQuit = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
        $location.path('/');
      }, function(data) {
      }, function (data) {
      });
  };

  itemEdit.quit = function() {
    // TODO: Fix following ugly code for quit current view
    // The problem is that "$location.path('/')" won't work if quit() is 
    // called from ':q' Ex command of Vim binding.
    var deferred = $q.defer();
    window.setTimeout(function() {
      deferred.resolve();
    }, 100);

    deferred.promise.then(function () {
      $location.path('/');
    });
  };

  $scope.cmOptions = {
    lineWrapping : true,
    lineNumbers : true,
    keyMap : 'vim',
    tabSize : 2,
    mode : 'text/x-gfm',
    theme : 'solarized dark',
    electricChars : false,
    autofocus : true,
    onLoad : function(cm) {
      $scope._cm = cm;
      CodeMirror.commands.save = function() {
        itemEdit.save();
      };
      CodeMirror.Vim.defineEx("wq", "", function(cm) {
        itemEdit.saveAndQuit();
      });
      CodeMirror.Vim.defineEx("q", "", function(cm) {
        itemEdit.quit();
      });
    }
  };
})

;
