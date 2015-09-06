angular.module('item', ['ngRoute', 'ui.codemirror', 'ngFileUpload', 'ui.bootstrap'])

.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      controller : "ItemListController as itemList",
      templateUrl : "itemList.html",
      resolve : {
        items : function (Items) {
          return Items.query({
            atypes : ['tag', 'attachment'],
          });
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
  .when('/todo', {
    controller : "TodoListController as todoList",
    templateUrl : "todo.html",
    resolve : {
      title : function () { return "TODO";},
      todos : function (Items) {
        return Items.query({
          atypes : ['tag', 'attachment'],
        });
      }
    }
  })
  .when('/todo/qa', {
    controller : "TodoListController as todoList",
    templateUrl : "todoQuickAdd.html",
    resolve : {
      title : function () { return "Quick add TODO";},
      todos : function (Items) {
        return [];
      }
    }
  })
  .otherwise({
    redirectTo : "/"
  })
  ;
})

.controller('ItemListController', function($modal,
                                           Items, Attributes, Utils, items) {
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
    Items.create({
      content : itemList.content
    }).then(function (data) {
      items.push(data);
    }, function(data) {
    });
    itemList.content = "";
  };

  // Remove one item
  itemList.remove = function(id) {
    for (var i in itemList.items) {
      if (itemList.items[i].id === id) {
        var modalInstance = $modal.open({
          animation : false,
          templateUrl : 'DeleteItemConfirm.html',
          controller : 'DeleteItemConfirmController',
          resolve : {
            title : function(){return itemList.title(itemList.items[i]);}
          }
        });
        modalInstance.result.then(function (confirmDelete) {
          if (confirmDelete) {
            Items.remove(id)
              .then(function (data) {
                for (var i in itemList.items ) {
                  if (itemList.items[i].id === id) {
                    itemList.items.splice(i, 1);
                    break;
                  }
                }
              }, function (data) {
              });
          }
        }, function () {
        });
      }
    }
  };

  // Query items by FTS
  itemList.query = function() {
    var queryStr = itemList.queryStr;
    if (queryStr.match(/^\s*$/)) {
      queryStr = null;
      itemList.queryStr = "";
    }
    Items.query({
      atypes : ['tag', 'attachment'],
      query : queryStr
    }).then(function (items) {
      itemList.items = items;
    }, function (error) {
    });
  };
})

.controller('ItemEditController', function($scope, $q, $location, $routeParams,
                                           $window, $modal,
                                           Upload, Items, Attributes, Utils, item) {
  var itemEdit = this;
  itemEdit.item = item;
  itemEdit.savedContent = item.content;

  // Setup file uploader
  $scope.$watch('file', function (file) {
    if (file != null && !file.$error) {
      $scope.upload(file);
    }
  });

  $scope.upload = function (files) {
    angular.forEach(files, function (file) {
      Upload.upload({
        url : '/api/item/' + encodeURIComponent(itemEdit.item.id) + '/a/attachment.json',
        fileFormDataName : 'content',
        file : file
      }).progress(function (evt) {
      }).success(function (data, status, headers, config) {
        itemEdit.item.attribute.attachment[data.name] = data;
      }).error(function (data, status, headers, config) {
      });
    });
  };

  // Helper function to update page title
  itemEdit.updateTitle = function () {
    var changed = itemEdit.item.content === itemEdit.savedContent ? "" : "* ";
    window.document.title = changed + Utils.title(itemEdit.item.content);
  };

  // Watch content change to set page title
  $scope.$watch('itemEdit.item.content', function (content) {
    itemEdit.updateTitle();
  });

  // Hook for page close event
  $scope.$on('$locationChangeStart', function (evt) {
    if (!(itemEdit.item.content === itemEdit.savedContent)) {
      if (!window.confirm("Content not saved, leave?")) {
      evt.preventDefault();
        }
    }
  });

  // Save content of current journal item
  itemEdit.save = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
        itemEdit.savedContent = itemEdit.item.content;
        itemEdit.updateTitle();
      }, function(data) {
      }, function (data) {
      });
  };

  // Save content of current journal item then go back to main item list page
  itemEdit.saveAndQuit = function() {
    Items.update(itemEdit.item.id, itemEdit.item.content)
      .then(function (data) {
        itemEdit.savedContent = itemEdit.item.content;
        $window.history.back();
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
      $window.history.back();
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

  // Update title
  itemEdit.updateTitle();
})

.controller('TodoListController', function($scope, $modal,
                                           Items, Attributes, Utils, todos, title) {
  var todoList = this;
  todoList.todos = todos;
  todoList.queryStr = "";
  todoList.folders = [{name : 'active', title : 'Active', icon : 'star'},
                      {name : 'inbox', title : 'Inbox', icon : 'inbox'},
                      {name : 'followup', title : 'Followup', icon : 'calendar'},
                      {name : 'maybe', title : 'Maybe', icon : 'time'},
                      {name : 'done', title : 'Done', icon : 'flag'},
                      {name : 'archive', title : 'Archive', icon : 'file'}];

  window.document.title = title;

  $scope.filterTodo = function (type) {
    return function (item) {
      var todoContent = null;
      if (item != null
          && item.attribute != null
          && item.attribute.tag != null
          && item.attribute.tag.todo != null) {
        todoContent = item.attribute.tag.todo.content;
      }

      var unknownTodoContent = false;
      if (todoContent != null) {
        unknownTodoContent = true;
        for (var i in todoList.folders) {
          if (todoContent === todoList.folders[i].name) {
            unknownTodoContent = false;
            break;
          }
        }
      }

      return (todoContent === type)
          || (type === 'inbox' && unknownTodoContent);
    };
  };

  $scope.filterNonFolder = function (name) {
    return function (folder) {
      return folder.name != name;
    };
  };

  $scope.toArray = function (obj) {
    var a = [];
    for (k in obj) {
      a.push(obj[k]);
    }
    return a;
  }

  // Title is the first non-blank line of content
  todoList.title = function(todo) {
    return Utils.title(todo.content);
  }

  // Quick add one journal todo
  todoList.add = function() {
    Items.create({
      content : todoList.content,
      attribute : {
        tag : {
          todo : "inbox"
        }
      }
    }).then(function (data) {
      todos.push(data);
    }, function(data) {
    });
    todoList.content = "";
  };

  // Remove one todo
  todoList.remove = function(id) {
    for (var i in todoList.todos) {
      if (todoList.todos[i].id === id) {
        var title = todoList.title(todoList.todos[i]);
        var modalInstance = $modal.open({
          animation : false,
          templateUrl : 'DeleteItemConfirm.html',
          controller : 'DeleteItemConfirmController',
          resolve : {
            title : function(){return title;}
          }
        });
        modalInstance.result.then(function (confirmDelete) {
          if (confirmDelete) {
            Items.remove(id)
              .then(function (data) {
                for (i in todoList.todos ) {
                  if (todoList.todos[i].id === id) {
                    todoList.todos.splice(i, 1);
                    break;
                  }
                }
              }, function (data) {
              });
          }
        }, function () {
        });
      }
    }
  };

  // Move todo to another folder
  todoList.moveTo = function (id, target) {
    for (i in todoList.todos) {
      if (todoList.todos[i].id === id) {
        var todo = todoList.todos[i].attribute.tag.todo;
        if (todo != null) {
          Attributes.update(id, todo.type, todo.name, target)
            .then(function (response) {
              todo.content = target;
            }, function (error) {
            });
        }
      }
    }
  };

  // Query todos by FTS
  todoList.query = function() {
    var queryStr = todoList.queryStr;
    if (queryStr.match(/^\s*$/)) {
      queryStr = null;
      todoList.queryStr = "";
    }
    Items.query({
      atypes : ['tag', 'attachment'],
      query : queryStr
    }).then(function (todos) {
      todoList.todos = todos;
    }, function (error) {
    });
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
  self.query = function (config) {
    var deferred = $q.defer();
    var atypes = config.atypes;
    var query = config.query;

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
  self.create = function(item) {
    var deferred = $q.defer();

    $http.post('/api/item.json', item)
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

  // Update content of one attribute
  self.update = function(id, type, name, content) {
    var deferred = $q.defer();

    $http.put('/api/item/' + encodeURIComponent(id) + '/a/'
              + encodeURIComponent(type) + '/'
              + encodeURIComponent(name) + '.json',
              {content : content})
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

.controller('DeleteItemConfirmController', function($scope, $modalInstance,
                                                    title) {
  var self = this;

  $scope.title = title;

  $scope.delete = function () {
    $modalInstance.close(true);
  };

  $scope.cancel = function () {
    $modalInstance.close(false);
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

