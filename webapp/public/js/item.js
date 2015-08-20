angular.module('item', ['ngRoute', 'ui.codemirror', 'ngFileUpload'])

.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      controller : "ItemListController as itemList",
      templateUrl : "itemList.html",
      resolve : {
        items : function (Items) {
          return Items.query(['tag', 'attachment']);
        }
      }
    })
  .when('/edit/:id', {
    controller : "ItemEditController as itemEdit",
    templateUrl : "itemEdit.html",
    resolve : {
      item : function ($route, Items) {
        return Items.retrieve($route.current.params.id, ['tag', 'attachment']);
      }
    }
  })
  .otherwise({
    redirectTo : "/"
  })
  ;
})

.controller('ItemListController', function(Items, Attributes, Utils, items) {
  var itemList = this;
  itemList.items = items;
  itemList.queryStr = "";

  window.document.title = "Y Journal";

  // Title is the first non-blank line of content
  itemList.title = function(item) {
    return Utils.title(item.content);
  }

  // Quick add one journal item
  itemList.add = function() {
    Items.create(itemList.content)
      .then(function (data) {
        items.push(data);
      }, function(data) {
      });
    itemList.content = "";
  };

  // Remove one item
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
      });
  };

  // Query items by FTS
  itemList.query = function() {
    var queryStr = itemList.queryStr;
    if (queryStr.match(/^\s*$/)) {
      queryStr = null;
      itemList.queryStr = "";
    }
    Items.query(['tag', 'attachment'], queryStr)
      .then(function (items) {
        itemList.items = items;
      }, function (error) {
      });
  };
})

.controller('ItemEditController', function($scope, $q, $location, $routeParams,
                                           Upload, Items, Attributes, Utils, item) {
  var itemEdit = this;
  itemEdit.item = item;

  window.document.title = Utils.title(item.content);

  // Setup file uploader
  $scope.$watch('file', function (file) {
    if (file != null && !file.$error) {
      $scope.upload(file);
    }
  });

  $scope.upload = function (files) {
    Upload.upload({
      url : '/api/item/' + encodeURIComponent(itemEdit.item.id) + '/a/attachment.json',
      fileFormDataName : 'content',
      file : files
    }).progress(function (evt) {
    }).success(function (data, status, headers, config) {
      itemEdit.item.attribute.attachment[data.name] = data;
    }).error(function (data, status, headers, config) {
    });
  };

  // Watch content change to set page title
  $scope.$watch('itemEdit.item.content', function (content) {
    if (content != null) {
      window.document.title = Utils.title(content);
    }
  });

  // Save content of current journal item
  itemEdit.save = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
      }, function(data) {
      }, function (data) {
      });
  };

  // Save content of current journal item then go back to main item list page
  itemEdit.saveAndQuit = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
        $location.path('/');
      }, function(data) {
      }, function (data) {
      });
  };

  // Go back to main item list page without save current changes
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

  // Add one attribute
  itemEdit.addAttr = function(type, name, content) {
    Attributes.create(itemEdit.item.id, type, name, content)
      .then(function (data) {
        // Success
        itemEdit.item.attribute[type][name] = data;
      }, function (data) {
        // Error
      });
  };

  itemEdit.removeAttr = function(type, name) {
    Attributes.remove(itemEdit.item.id, type, name)
      .then(function (data) {
        // Success
        delete itemEdit.item.attribute[type][name];
      }, function (data) {
        // Error
      });
  };

  // Add one tag
  itemEdit.addTag = function() {
    itemEdit.addAttr('tag', itemEdit.tag, 1);
    itemEdit.tag = "";
  };

  // Remove one tag
  itemEdit.removeTag = function(name) {
    itemEdit.removeAttr('tag', name)
  };

  // Remove one attachment
  itemEdit.removeAttachment = function(name) {
    itemEdit.removeAttr('attachment', name)
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

.service('Items', function($http, $q) {
  var self = this;

  self.interestedAttributes = function (atypes) {
    if (atypes == null)
      return "";

    var s = atypes.join(',');
    if (atypes.length > 0) {
      s = 'atypes=' + encodeURIComponent(s);
    }
    return s;
  }

  // Query list of items
  self.query = function (atypes, query) {
    var deferred = $q.defer();

    $http.get('/api/item.json?'
              + self.interestedAttributes(atypes)
              + (query == null ? "" : "&query=" + encodeURIComponent(query)))
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  // Create a new item
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

  // Retrieve one item
  self.retrieve = function(id, atypes) {
    var deferred = $q.defer();

    $http.get('/api/item/' + encodeURIComponent(id) + '.json?'
              + self.interestedAttributes(atypes))
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  }

  // Update content of one item
  self.update = function(id, content) {
    var deferred = $q.defer();

    $http.put('/api/item/' + encodeURIComponent(id) + '.json',
              {content : content})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  // Remove one item
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

  // Crate one attribute
  self.create = function(id, type, name, content) {
    var deferred = $q.defer();

    $http.post('/api/item/' + encodeURIComponent(id) + '/a/'
               + encodeURIComponent(type) + '.json',
               {content : content, name : name})
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };

  // Remove one attribute
  self.remove = function(id, type, name) {
    var deferred = $q.defer();

    $http.delete('/api/item/' + encodeURIComponent(id) + '/a/'
                 + encodeURIComponent(type) + '/'
                 + encodeURIComponent(name) + '.json')
      .then(function (response) {
        deferred.resolve(response.data);
      }, function (response) {
        deferred.reject(response.data);
      });

    return deferred.promise;
  };
})

.service('Utils', function () {
  var self = this;

  self.title = function (content) {
    var m = content.match(/^\s*([^\r\n]+)/);
    return m == null ? "<UNTITLED>" : m[0];
  };
})

;

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

