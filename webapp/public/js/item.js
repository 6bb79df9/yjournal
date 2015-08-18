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

    $http.get('/api/item.json?atypes=attachment,tag')
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

    $http.get('/api/item/' + encodeURIComponent(id) + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  }

  self.update = function(id, content) {
    var deferred = $q.defer();

    $http.put('/api/item/' + encodeURIComponent(id) + '.json', {content : content})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  self.remove = function(id) {
    var deferred = $q.defer();

    $http.delete('/api/item/' + encodeURIComponent(id) + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };
})

.service('Attributes', function($http, $q) {
  var self = this;

  self.create = function(id, tag) {
    var deferred = $q.defer();

    $http.post('/api/item/' + encodeURIComponent(id) +
               '/a/tag.json', {content : 1, name : tag})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  self.retrieve = function(ctx, id) {
    var deferred = $q.defer();

    $http.get('/api/item/' + encodeURIComponent(id) + '/a/' + 'tag.json')
      .then(function (response) {
        deferred.resolve({ctx : ctx, tags : response.data});
      }, function (response) {
        deferred.reject(ctx, response.data);
      });

    return deferred.promise;
  };

  self.remove = function(id, name) {
    var deferred = $q.defer();

    $http.delete('/api/item/' + encodeURIComponent(id) +
                 '/a/tag/' + encodeURIComponent(name) + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };
})

.controller('ItemListController', function(Items, Attributes, items) {
  var itemList = this;
  itemList.items = items;

  // Title is the first non-blank line of content
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

.controller('ItemEditController', function($scope, $q, $location, $routeParams, Items, Attributes) {
  var itemEdit = this;

  Items.retrieve($routeParams.id)
    .then(function(data) {
      itemEdit.item = data;

      itemEdit.item.tags = [];
      Attributes.retrieve(itemEdit.item, itemEdit.item.id)
          .then(function(data) {
            data.ctx.tags = data.tags;
          });
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

  itemEdit.addAttribute = function() {
    Attributes.create(itemEdit.item.id, itemEdit.tag)
      .then(function (data) {
        itemEdit.item.tags.push(data);
      }, function(data) {
      }, function(data) {
      });
    itemEdit.tag = "";
  };

  itemEdit.removeTag = function(name) {
    Attributes.remove(itemEdit.item.id, name)
      .then(function (data) {
        for (i in itemEdit.item.tags) {
          if (itemEdit.item.tags[i].name === name) {
            itemEdit.item.tags.splice(i, 1);
            break;
          }
        }
      }, function(data) {
      }, function(data) {
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
});

String.prototype.colorHash = function() {
  var hash = 0, i, chr, len;
  if (this.length == 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  hash = (hash & 0xffffff) | 0x404040;
  return hash;
};

String.prototype.colorCode = function() {
  return '#' + this.colorHash().toString(16);
};
String.prototype.reversedColorCode = function() {
  var hash = this.colorHash();
  var r = (hash >> 16) & 0xff;
  var g = (hash >> 8) & 0xff;
  var b = hash & 0xff;
  var y = (2 * r + b + 3 * g) / 6;
  if (y > 200) {
    hash = 0x606060;
  } else {
    hash = 0xffffff;
  }
  return '#' + hash.toString(16);
};

