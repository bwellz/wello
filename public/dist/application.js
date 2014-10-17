'use strict';
/**
 * Config Client
 */
// Init the application configuration module for AngularJS application
var ApplicationConfiguration = function () {
    // Init module configuration options
    var applicationModuleName = 'wellofridge';
    var applicationModuleVendorDependencies = [
        'ngResource',
        'ngAnimate',
        'ui.sortable',
        'ui.router',
        'ui.bootstrap',
        'angular-sortable-view'
      ];
    // Add a new vertical module
    var registerModule = function (moduleName) {
      // Create angular module
      angular.module(moduleName, []);
      // Add the module to the AngularJS configuration file
      angular.module(applicationModuleName).requires.push(moduleName);
    };
    return {
      applicationModuleName: applicationModuleName,
      applicationModuleVendorDependencies: applicationModuleVendorDependencies,
      registerModule: registerModule
    };
  }();'use strict';
/**
 * Init Client
 */
// Define main module and add in dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);
// Set HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config([
  '$locationProvider',
  function ($locationProvider) {
    // Who doesn't like to say "hashbang?"
    $locationProvider.hashPrefix('!');
  }
]);
//Then define the init function for starting up the application
angular.element(document).ready(function () {
  var initInjector = angular.injector(['ng']);
  var $http = initInjector.get('$http');
  // Load in our user if they are logged in
  // The user object can be populated at any time during use
  $http.get('/users/me?whyiewhy=' + new Date().getTime()).then(function (response) {
    if (response.data === 'null') {
      window.user = null;
    } else {
      window.user = response.data;
    }
    // bootstrap (the action, not the framework)
    angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
  });
});'use strict';
/**
 * Register Core Module
 */
ApplicationConfiguration.registerModule('core');'use strict';
/**
 * Register User Module
 */
ApplicationConfiguration.registerModule('users');'use strict';
/**
 * Angular UI-Router
 */
// Intercept the state change event and redirect if the user's login status is a mismatch with the route
angular.module('core').run([
  '$rootScope',
  '$state',
  '$location',
  'Authentication',
  function ($rootScope, $state, $location, Authentication) {
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
      if (typeof toState.needloginstate !== 'undefined') {
        if (!Authentication.user) {
          event.preventDefault();
          $state.go(toState.needloginstate);
        }
      } else if (typeof toState.hasloginstate !== 'undefined') {
        if (Authentication.user) {
          event.preventDefault();
          $state.go(toState.hasloginstate);
        }
      }
    });
  }
]);
// Setting up route
angular.module('core').config([
  '$stateProvider',
  '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {
    // Redirect to home view when route not found
    $urlRouterProvider.otherwise('/');
    // Client-side routes
    $stateProvider.state('index', {
      url: '/',
      templateUrl: 'modules/core/views/index.client.view.html'
    }).state('fridge_base', {
      url: '/fridge/base',
      needloginstate: 'fridge_base_auth',
      views: {
        '': { templateUrl: 'modules/core/views/fridges/base/index.client.view.html' },
        'top@fridge_base': { templateUrl: 'modules/core/views/fridges/base/top.client.view.html' },
        'bot@fridge_base': { templateUrl: 'modules/core/views/fridges/base/bot.client.view.html' }
      }
    }).state('fridge_base_auth', {
      url: '/fridge/base/auth',
      hasloginstate: 'fridge_base',
      views: {
        '': { templateUrl: 'modules/core/views/fridges/base/index.client.view.html' },
        'top@fridge_base_auth': { templateUrl: 'modules/core/views/fridges/base/auth.client.view.html' },
        'bot@fridge_base_auth': { templateUrl: 'modules/core/views/fridges/base/bot_off.client.view.html' }
      }
    }).state('fridge_dx', {
      url: '/fridge/dx',
      templateUrl: 'modules/core/views/fridges/dx.client.view.html'
    }).state('fridge_mini', {
      url: '/fridge/mini',
      templateUrl: 'modules/core/views/fridges/mini.client.view.html'
    }).state('fridge_silver', {
      url: '/fridge/silver',
      templateUrl: 'modules/core/views/fridges/silver.client.view.html'
    });
  }
]);'use strict';
/*global $:false */
/**
 * Board Controller: Manages the lower sub-view (boards and weather)
 */
// directive: listen for mousedown or escape on the whole document (except stop-propagation'd containers) and cancel opened dialogs
angular.module('core').directive('boardKeys', function () {
  return {
    restrict: 'A',
    link: function (scope, element) {
      $('html').on('mousedown', function (e) {
        if (scope.something_to_cancel) {
          scope.hide_all();
          scope.$apply();
        }
      });
      $('html').on('keydown', function (event) {
        switch (event.keyCode) {
        case 27:
          //escape
          scope.hide_all();
          scope.$apply();
          break;
        default:
          break;
        }
      });
    }
  };
});
// Controller
angular.module('core').controller('BoardController', [
  '$scope',
  '$state',
  '$http',
  '$timeout',
  'Authentication',
  'BoardService',
  'FoodService',
  'MessageService',
  'AchievementService',
  function ($scope, $state, $http, $timeout, Authentication, BoardService, FoodService, MessageService, AchievementService) {
    // Services
    $scope.authentication = Authentication;
    $scope.board = BoardService;
    $scope.boards = [];
    // array containing all board data (excluding lists and cards).  Loaded once.
    var board_index_lookup = {};
    // lookup table for quickly determining the index of a board if supplied a board ID
    // track boards being operated on and dialog actions
    $scope.cur_board = null;
    $scope.edit_board = null;
    $scope.delete_board = null;
    $scope.edit_board_name = '';
    $scope.new_board_name = '';
    $scope.show_newboard = false;
    // set to true if dialogs are open
    $scope.something_to_cancel = false;
    // hide all open dialogs on the board panel
    $scope.hide_all = function () {
      $scope.cancel_delete_board();
      $scope.cancel_edit_board_name();
      $scope.cancel_new_board();
    };
    // load boards for the user when the page loads
    $scope.initBoards = function () {
      $scope.boards = [];
      $scope.board.data = null;
      $scope.board.update++;
      $http.get('/boards?whyiewhy=' + new Date().getTime()).success(function (data) {
        $scope.boards = data.boards;
        board_index_lookup = {};
        for (var i = 0; i < $scope.boards.length; i++) {
          board_index_lookup[$scope.boards[i].board] = i;
        }
        $scope.snake_board = data.snake_board;
        $scope.resume_board = data.resume_board;
        $scope.portfolio_board = data.portfolio_board;
        $scope.food_board = data.food_board;
        $scope.recipe_board = data.recipe_board;
        $scope.chores_board = data.chores_board;
        $scope.art_board = data.art_board;
        $scope.welcome_board = data.welcome_board;
        FoodService.food = data.food;
        FoodService.recipes = data.recipes;
        FoodService.achievements = data.achievements;
        FoodService.update++;
        if (data.cur_board === $scope.snake_board) {
          $scope.loadBoard(data.return_board);
        } else {
          $scope.loadBoard(data.cur_board);
        }
        $timeout(function () {
          $('.board_scrollbar').perfectScrollbar({ suppressScrollX: true });
        }, 0);
        MessageService.remove_disaster('', 2);
      }).error(function (err) {
        MessageService.add_disaster(err.message, 2);
      });
      $timeout(function () {
        if (window.chrome) {
          AchievementService.achievement(49, 1);
        }
      }, 2000);
    };
    // Watch for an incoming board request from anywhere in the application and load that board
    // Piggyback on this method to call signout from anywhere as well since signout needs to destroy data within this scope
    $scope.$watch(function () {
      return BoardService.board_request;
    }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined' && newVal !== null) {
        if (newVal === 'destroy') {
          $scope.signout();
        } else {
          if (newVal === 'snake')
            newVal = $scope.snake_board;
          else if (newVal === 'cardbreaker')
            newVal = 'cardbreaker';
          $scope.loadBoard(newVal);
          $scope.board.board_request = null;
        }
      }
    });
    // Load the requested board
    // Also handle the loading of special boards
    $scope.loadBoard = function (board_id) {
      if (BoardService.show_nibbles && !BoardService.force) {
        MessageService.flash_disaster('Look after your Wello Snake!', 3000);
      } else if (BoardService.show_cardbreaker && !BoardService.force) {
        MessageService.flash_disaster('Munchkin isn\'t going to paddle herself!', 3000);
      } else {
        BoardService.force = false;
        // open the edit board name dialog if this board is already open
        if ($scope.cur_board === board_id) {
          $scope.something_to_cancel = true;
          $scope.edit_board = board_id;
          $scope.edit_board_name = $scope.boards[board_index_lookup[board_id]].name;
          return;
        }
        $scope.cancel_edit_board_name();
        $scope.cancel_delete_board();
        $scope.cancel_new_board();
        $scope.cur_board = board_id;
        $http.get('/board/' + board_id + '?whyiewhy=' + new Date().getTime()).success(function (data) {
          $scope.board.data = data;
          $scope.board.update++;
          if (data._id === $scope.resume_board) {
            BoardService.custom_board = 1;
            BoardService.name = 'Brad Wells\'s Resume';
            MessageService.remove_disaster('Current Board: Brad Wells\'s Resume', 1);
            AchievementService.achievement(18, 1);
          } else if (data._id === $scope.portfolio_board) {
            BoardService.custom_board = 2;
            BoardService.name = 'Brad Wells\'s Portfolio';
            MessageService.remove_disaster('Current Board: Brad Wells\'s Portfolio', 1);
            AchievementService.achievement(19, 1);
          } else if (data._id === $scope.food_board) {
            BoardService.custom_board = 3;
            BoardService.name = 'Food!';
            MessageService.remove_disaster('Current Board: Food!', 1);
            AchievementService.achievement(20, 1);
          } else if (data._id === $scope.recipe_board) {
            BoardService.custom_board = 4;
            BoardService.name = 'Recipes';
            MessageService.remove_disaster('Current Board: Recipes', 1);
            AchievementService.achievement(21, 1);
          } else if (data._id === $scope.art_board) {
            BoardService.custom_board = 5;
            BoardService.name = 'Crappy Kid\'s Artwork';
            MessageService.remove_disaster('Current Board: Crappy Kid\'s Artwork', 1);
            AchievementService.achievement(23, 1);
          } else if (data._id === $scope.welcome_board) {
            BoardService.custom_board = 6;
            BoardService.name = 'Achievement Progress';
            MessageService.remove_disaster('Current Board: Achievement Progress', 1);
          } else if (data._id !== $scope.snake_board && data._id !== 'cardbreaker') {
            if ($scope.boards[board_index_lookup[board_id]].trello_board) {
              AchievementService.achievement(8, 1);
            }
            if ($scope.boards[board_index_lookup[board_id]].truncated) {
              if ($scope.boards[board_index_lookup[board_id]].trello_board) {
                $timeout(function () {
                  AchievementService.achievement(27, 1);
                }, 2500);
              }
            }
            BoardService.custom_board = 0;
            BoardService.name = $scope.boards[board_index_lookup[board_id]].name;
            MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
          } else if (data._id === $scope.snake_board) {
            BoardService.custom_board = 7;
          } else {
            BoardService.custom_board = 8;
          }
          $scope.custom_board = BoardService.custom_board;
        }).error(function (err) {
          MessageService.add_disaster(err.message, 1);
        });
      }
    };
    // ######## Create Board #########
    // Open Create Board Dialog
    $scope.show_new_board = function () {
      $scope.edit_board = null;
      $scope.delete_board = null;
      $scope.show_newboard = true;
      $scope.something_to_cancel = true;
    };
    // Create Board
    $scope.create_new_board = function () {
      $http.post('/new_board', { name: $scope.new_board_name }).success(function (data) {
        $scope.boards.push({
          'name': data.name,
          'board': data.board
        });
        board_index_lookup[data.board] = $scope.boards.length - 1;
        $scope.loadBoard(data.board);
        $timeout(function () {
          $('.board_scrollbar').perfectScrollbar('update');
          MessageService.flash_success('Successfully Created Board', 3000);
          AchievementService.achievement(10, 1);
        }, 0);
      }).error(function (err) {
        MessageService.flash_disaster(err.message, 4000);
      });
    };
    // Close Create Board Dialog
    $scope.cancel_new_board = function () {
      $scope.show_newboard = false;
      $scope.new_board_name = '';
      $scope.something_to_cancel = false;
    };
    // ######## Update Board Name #########
    // Opening the dialog is performed in the load board function
    // Update Board Name
    $scope.update_board_name = function () {
      $http.post('/board_name', {
        name: $scope.edit_board_name,
        board_id: $scope.cur_board
      }).success(function (data) {
        AchievementService.achievement(44, 1);
        $scope.boards[board_index_lookup[$scope.cur_board]].name = data.board_name;
        $scope.cancel_edit_board_name();
        MessageService.post('Current Board: ' + data.board_name);
        $timeout(function () {
          MessageService.flash_success('Successfully Updated Board Name', 3000);
        }, 0);
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // Cancel Edit Board Name Dialog
    $scope.cancel_edit_board_name = function () {
      $scope.edit_board = null;
      $scope.edit_board_name = '';
      $scope.something_to_cancel = false;
    };
    // ####### Toggle Board Star ############
    $scope.toggle_star = function (board) {
      var board_index = board_index_lookup[board];
      var star;
      if ($scope.boards[board_index].starred) {
        star = false;
      } else {
        star = true;
      }
      $http.post('/board_star', {
        star: star,
        board_id: board
      }).success(function (data) {
        var $elem = $('#board_' + board);
        $elem.addClass('quick-fade-out');
        $timeout(function () {
          $scope.boards[board_index].starred = data.star;
          if (data.star) {
            AchievementService.achievement(50, 1);
          }
          $elem.removeClass('quick-fade-out');
          $elem.addClass('quick-fade-in');
          $timeout(function () {
            $elem.removeClass('quick-fade-in');
          }, 450);
        }, 450);
        MessageService.flash_success('Successfully Toggled Board Star', 3000);
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // ########### Delete Board ##############
    // Open Delete Board Dialog
    $scope.show_delete_board = function () {
      $scope.something_to_cancel = true;
      $scope.show_newboard = false;
      $scope.delete_board = $scope.cur_board;
    };
    // Delete Board
    $scope.delete_this_board = function () {
      $http.get('/delete_board/' + $scope.delete_board + '?whyiewhy=' + new Date().getTime()).success(function (data) {
        // remove only the element that was deleted for animation purposes
        AchievementService.achievement(45, 1);
        if (data.boards.length === 0) {
          $scope.boards = [];
        } else {
          var removed = false;
          for (var i = 0; i < data.boards.length; i++) {
            if ($scope.boards[i].board !== data.boards[i].board) {
              $scope.boards.splice(i, 1);
              removed = true;
              // no need to remove the board index lookup table entry, but do need to update the table
              // it is safe to reuse i
              for (i = 0; i < $scope.boards.length; i++) {
                board_index_lookup[$scope.boards[i].board] = i;
              }
              break;
            }
          }
          // if the element wasn't found, it's the last one; no need to update lookup
          if (!removed) {
            $scope.boards.pop();
          }
        }
        $scope.loadBoard(data.cur_board);
        $timeout(function () {
          $('.board_scrollbar').perfectScrollbar('update');
        }, 0);
        MessageService.flash_success('Successfully Deleted Board', 2000);
      }).error(function (err) {
        MessageService.flash_disaster(err.message, 2000);
      });
    };
    // Close Delete Board Dialog
    $scope.cancel_delete_board = function () {
      $scope.delete_board = null;
      $scope.something_to_cancel = false;
    };
    // Signup and do some lazy-garbage-collection-assisted cleanup
    $scope.signout = function () {
      $scope.board.data = null;
      $scope.board.update++;
      $scope.boards = [];
      $scope.board_index_lookup = {};
      BoardService.data = [];
      FoodService.food = [];
      FoodService.recipes = [];
      FoodService.achievements = [];
      BoardService.board_request = null;
      MessageService.post('Successfully Signed Out of Wello.');
      $state.go('signout_base');
    };
  }
]);'use strict';
/*global $:false */
/**
 * Fridge Controller: Control Opening and Closing Doors and Food Animation
 */
// Controller
angular.module('core').controller('FridgeController', [
  '$scope',
  '$timeout',
  '$interval',
  'Authentication',
  'BoardService',
  'FoodPrepService',
  'MessageService',
  'AchievementService',
  'CapabilityService',
  function ($scope, $timeout, $interval, Authentication, BoardService, FoodPrepService, MessageService, AchievementService, CapabilityService) {
    // This provides Authentication context.
    $scope.authentication = Authentication;
    // Freezer variables
    $scope.freezer_show = false;
    $scope.freezer_open = false;
    $scope.door_opening = 0;
    $scope.hide_door = false;
    // Fridge variables
    $scope.fridge_show = false;
    $scope.fridge_open = false;
    $scope.door2_opening = 0;
    $scope.hide_door2 = false;
    // Food Animation variables
    $scope.munchkin = {
      x: 4490,
      rock: 0
    };
    $scope.flying_food = [];
    $scope.caught_food = [];
    $scope.eating_food = null;
    var food_animation_running = false;
    var food_animation;
    var fps = 30;
    var anim_prev;
    var anim_now;
    var anim_elapsed;
    var ate_food;
    var munchkin_speed = 100;
    var food_speed = 150;
    var food_rot_speed = 360;
    var temp;
    var zindex = 99999;
    var num_salad = 0;
    var munchkin_rock = 22;
    var munchkin_bac = 0;
    $scope.munchkin_passed_out = false;
    var food_achieve = [];
    // Resolution and browswer warning variables
    $scope.show_resolution_warning = 0;
    $scope.suppress_resolution = 0;
    $scope.show_browser_warning = 0;
    $scope.suppress_browser = 0;
    $scope.height = 0;
    $scope.width = 0;
    $scope.show_mobile = false;
    // ###### Manage Resolution and Browser Warnings for the Fridge ###########
    // Extend the scope with the CapabilityService
    angular.extend($scope, CapabilityService);
    $scope.init_capability_check($scope);
    // suppress browser warning
    $scope.sup_browser = function (val) {
      $scope.suppress_browser = val;
    };
    // suppres resolution warning
    $scope.sup_resolution = function (val) {
      $scope.suppress_resolution = val;
    };
    // Initialize parallax scrolling for the fridge page
    // Please note that this is one of the only valid uses of parallax scrolling on the entire Internet
    $scope.bgScroll = function (bg, color, speed) {
      document.body.style.background = color + ' url(\'' + bg + '\') no-repeat';
      document.body.style.backgroundSize = '100%';
      window.onscroll = function () {
        document.body.style.backgroundPosition = window.pageXOffset + 'px ' + -window.pageYOffset / speed + 'px';
      };
    };
    // ######## Food Animation ##############
    // Watch for new flying food requests
    $scope.$watch(function () {
      return FoodPrepService.new_food;
    }, function (newVal, oldVal) {
      if (newVal !== oldVal && newVal !== null) {
        /**/
        var start_anim = false;
        $scope.flying_food.push({
          x: 900,
          y: 330,
          scale: 1,
          opacity: 1,
          rot: -20,
          id: FoodPrepService.food_id,
          file: newVal,
          dropping: false
        });
        zindex--;
        FoodPrepService.new_food = null;
        if (!food_animation_running) {
          startFood();
        }
      }
    });
    // Initialize a segment of food animation
    function startFood() {
      anim_now = Date.now();
      food_animation_running = true;
      $scope.munchkin.x = 4490;
      $scope.munchkin.rock = 0;
      munchkin_speed = -1000;
      $scope.eating_food = null;
      ate_food = 0;
      // Need an array for quickly calculating if the "hold 4 specific foods at once" achievement
      food_achieve = new Array(25);
      for (var i = 0; i < 25; i++) {
        food_achieve[i] = 0;
      }
      animateFood();
    }
    // RequestAnimationFrame loop
    // There's no polyfill used, because those browsers don't deserve it
    function animateFood() {
      renderFood();
      food_animation = window.requestAnimationFrame(animateFood);
    }
    // A whole method dedicated to my cat recovering from passing out after drinking too many Redbull & Vodkas... hire me?
    $interval(function () {
      munchkin_bac -= 1;
      if ($scope.munchkin_passed_out && munchkin_bac < 2) {
        $scope.munchkin_passed_out = false;
        MessageService.flash('For better or worse, Munchkin is back...', 3000);
      }
      if (munchkin_bac < 0)
        munchkin_bac = 0;
      AchievementService.achievement(1, ate_food);
      ate_food = 0;
    }, 10000);
    // This is the most beautiful method in the entire codebase; maybe any codebase. Refactoring would be a crime.
    function renderFood() {
      $timeout(function () {
        // Calculate Delta Time
        anim_prev = anim_now;
        anim_now = Date.now();
        anim_elapsed = anim_now - anim_prev;
        num_salad = 0;
        // Gross
        for (var i = 0; i < $scope.flying_food.length; i++) {
          if ($scope.flying_food[i].id === 10) {
            num_salad++;
            $scope.flying_food[i].rot += food_rot_speed * (anim_elapsed / 1000);
            if ($scope.flying_food[i].x > 1200) {
              $scope.flying_food[i].x += food_speed * (anim_elapsed / 1000);
              if ($scope.flying_food[i].x > 1310) {
                $scope.flying_food[i].y += food_speed * 8 * (anim_elapsed / 1000);
              } else if ($scope.flying_food[i].x > 1260) {
                $scope.flying_food[i].y += food_speed * 5 * (anim_elapsed / 1000);
              } else {
                AchievementService.achievement(31, 1);
                $scope.flying_food[i].y += food_speed * 3 * (anim_elapsed / 1000);
              }
              if ($scope.flying_food[i].x > 1400) {
                $scope.flying_food.splice(i, 1);
                i--;
              }
            } else {
              $scope.flying_food[i].x += food_speed * (anim_elapsed / 1000);
              $scope.flying_food[i].y = 330 - 200 * Math.sin(($scope.flying_food[i].x - 900) / 300 * Math.PI);
            }
          }
        }
        // Grosser
        if ($scope.munchkin.x < 4000) {
          for (i = 0; i < $scope.flying_food.length; i++) {
            if ($scope.flying_food[i].id !== 10) {
              $scope.flying_food[i].rot += food_rot_speed * (anim_elapsed / 1000);
              if ($scope.flying_food[i].x > 1200) {
                if ($scope.caught_food.length >= 5 || $scope.flying_food[i].dropping || $scope.munchkin_passed_out) {
                  $scope.flying_food[i].dropping = true;
                  $scope.flying_food[i].x += food_speed * (anim_elapsed / 1000);
                  if ($scope.flying_food[i].x > 1310) {
                    $scope.flying_food[i].y += food_speed * 8 * (anim_elapsed / 1000);
                  } else if ($scope.flying_food[i].x > 1260) {
                    $scope.flying_food[i].y += food_speed * 5 * (anim_elapsed / 1000);
                  } else {
                    AchievementService.achievement(29, 1);
                    $scope.flying_food[i].y += food_speed * 3 * (anim_elapsed / 1000);
                  }
                  if ($scope.flying_food[i].x > 1400) {
                    $scope.flying_food.splice(i, 1);
                    i--;
                  }
                } else {
                  temp = $scope.flying_food.splice(i, 1)[0];
                  temp.x = 0;
                  temp.y = 0;
                  $scope.caught_food.push(temp);
                  i--;
                  food_achieve[temp.id]++;
                  if (food_achieve[4] > 0 && food_achieve[7] > 0 && food_achieve[16] > 0 && food_achieve[24] > 0) {
                    AchievementService.achievement(11, 1);
                  } else if (food_achieve[8] > 0 && food_achieve[14] > 0 && food_achieve[15] > 0 && food_achieve[18] > 0) {
                    AchievementService.achievement(3, 1);
                  }
                }
              } else {
                $scope.flying_food[i].x += food_speed * (anim_elapsed / 1000);
                $scope.flying_food[i].y = 330 - 200 * Math.sin(($scope.flying_food[i].x - 900) / 300 * Math.PI);
              }
            }
          }
        }
        // Short, but Gross
        if ($scope.eating_food === null && !$scope.munchkin_passed_out) {
          if ($scope.caught_food.length > 0 && ($scope.caught_food.length >= 5 || $scope.flying_food.length === num_salad)) {
            $scope.eating_food = $scope.caught_food.pop();
            ate_food++;
          }
        }
        // Grossest
        if ($scope.eating_food !== null) {
          /**/
          $scope.eating_food.x += 80 * (anim_elapsed / 1000);
          $scope.eating_food.y -= 60 * (anim_elapsed / 1000);
          $scope.eating_food.opacity -= 0.66 * (anim_elapsed / 1000);
          $scope.eating_food.scale -= 0.66 * (anim_elapsed / 1000);
          if ($scope.eating_food.scale < 0.05) {
            if ($scope.eating_food.id === 23 || $scope.eating_food.id === 24 || $scope.eating_food.id === 19) {
              munchkin_bac += 1;
              if (munchkin_bac > 4.1) {
                MessageService.flash('Phew, Munchkin drank too much and passed out!', 3000);
                AchievementService.achievement(28, 1);
                $scope.munchkin_passed_out = true;
              }
            }
            food_achieve[$scope.eating_food.id]--;
            $scope.eating_food = null;
          }
          if (!$scope.munchkin_passed_out) {
            $scope.munchkin.rock += munchkin_rock * (anim_elapsed / 1000);
            if ($scope.munchkin.rock > 3) {
              $scope.munchkin.rock = 3;
              munchkin_rock = -22;
            } else if ($scope.munchkin.rock < -3) {
              $scope.munchkin.rock = -3;
              munchkin_rock = 22;
            }
          }
        } else {
          if (!$scope.munchkin_passed_out) {
            if ($scope.caught_food.length > 0 || $scope.flying_food.length > num_salad) {
              if (munchkin_speed < -101) {
                $scope.munchkin.x += munchkin_speed * (anim_elapsed / 1000);
                if ($scope.munchkin.x > 2500) {
                  munchkin_speed = -6000;
                } else if ($scope.munchkin.x > 1800) {
                  munchkin_speed = -3000;
                } else if ($scope.munchkin.x > 1550) {
                  munchkin_speed = -500;
                } else if ($scope.munchkin.x > 1250) {
                  munchkin_speed = -200;
                } else {
                  munchkin_speed = 100;
                }
              } else {
                $scope.munchkin.x += munchkin_speed * (anim_elapsed / 1000);
                if ($scope.munchkin.x > 1400) {
                  munchkin_speed = -102;
                } else if ($scope.munchkin.x > 1300) {
                  munchkin_speed = -100;
                } else if ($scope.munchkin.x < 1250) {
                  $scope.munchkin.x = 1250;
                  munchkin_speed = 100;
                }
              }
            } else {
              if ($scope.munchkin.x > 1600) {
                $scope.munchkin.x += 2000 * (anim_elapsed / 1000);
              } else {
                $scope.munchkin.x += 80 * (anim_elapsed / 1000);
              }
            }
          }
        }
        // ...Gross
        if ($scope.munchkin.x > 4500 && num_salad === 0) {
          food_animation_running = false;
          window.cancelAnimationFrame(food_animation);
        }
      });
    }
    // ########### Door Animation #############
    // Open Freezer
    $scope.door1_animation = function () {
      if ($scope.freezer_open === false) {
        $scope.door_opening = 1;
        $scope.freezer_open = true;
        $scope.freezer_show = true;
        $timeout(function () {
          $scope.hide_door = true;
        }, 2000);
        MessageService.flash('Opening Freezer', 2000);
        AchievementService.achievement(30, 1);
      }
    };
    // Close Freezer
    $scope.door1_close_animation = function () {
      if ($scope.freezer_open === true) {
        $scope.door_opening = 2;
        $scope.hide_door = false;
        $timeout(function () {
          $scope.freezer_show = false;
          $timeout(function () {
            $scope.door_opening = 0;
            $scope.freezer_open = false;
          }, 1000);
        }, 2000);
        MessageService.flash('Closing Freezer', 2000);
      }
    };
    // Open Fridge
    $scope.door2_animation = function () {
      if ($scope.fridge_open === false) {
        $scope.door2_opening = 1;
        $scope.fridge_open = true;
        $scope.fridge_show = true;
        $timeout(function () {
          $scope.hide_door2 = true;
        }, 2000);
        MessageService.flash('Opening Fridge', 2000);
        AchievementService.achievement(32, 1);
      }
    };
    // Close Fridge
    $scope.door2_close_animation = function () {
      if ($scope.fridge_open === true) {
        $scope.door2_opening = 2;
        $scope.hide_door2 = false;
        $timeout(function () {
          $scope.fridge_show = false;
          $timeout(function () {
            $scope.door2_opening = 0;
            $scope.fridge_open = false;
          }, 1000);
        }, 2000);
        MessageService.flash('Closing Fridge', 2000);
      }
    };
    // need to destroy the board, the board controller will continue the signout
    $scope.signout = function () {
      BoardService.board_request = 'destroy';
    };
  }
]);'use strict';
/*global $:false */
/**
 * Cotroller for the Wello Store Front
 */
// Controller
angular.module('core').controller('HomeController', [
  '$scope',
  '$state',
  '$timeout',
  'Authentication',
  'CapabilityService',
  function ($scope, $state, $timeout, Authentication, CapabilityService) {
    // This provides Authentication context.
    $scope.authentication = Authentication;
    // Cancel potential BGs from a fridge page
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = '#23719F';
    // Fridge Descriptions
    $scope.fridges = [
      {
        name: 'Wello Fridge Classic\t',
        link: '#!/fridge/base',
        marketing: [
          {
            icon: 'ok',
            text: 'Classic Design'
          },
          {
            icon: 'cloud-download',
            text: 'Magically imports your Trello boards'
          },
          {
            icon: 'flash',
            text: 'Utilizes WelloBeam: the NOT-AT-ALL DANGEROUS card-projection technology'
          },
          {
            icon: 'tree-deciduous',
            text: 'Instantly 3D-print food with tofu!'
          },
          {
            icon: 'cutlery',
            text: 'Easily prepare any meal with automated cooking using ingredients in your fridge!'
          },
          {
            icon: 'picture',
            text: 'Always know the weather unless it\'s not pleasant with CatWeather'
          },
          {
            icon: 'tag',
            text: '$12,899.95'
          }
        ]
      },
      {
        name: 'Wello Fridge DX',
        link: '#!/fridge/dx',
        marketing: [
          {
            icon: 'asterisk',
            text: 'For the most demanding Wello customer'
          },
          {
            icon: 'ok',
            text: 'All of the same incredible features of the Wello Fridge Classic plus new exclusives'
          },
          {
            icon: 'globe',
            text: 'Shame your friends into action with the ALS Challenge attachment'
          },
          {
            icon: 'glass',
            text: 'Includes the Wello Whiskey-Ice Maker, designed by Ferrari and available to you thanks to extensive industrial espionage'
          },
          {
            icon: 'fire',
            text: 'Unexplained fires are a relatively rare occurence and a matter for the courts'
          },
          {
            icon: 'tag',
            text: 'A lot of easy payments of $11,999.99'
          }
        ]
      },
      {
        name: 'Wello Fridge Mini',
        link: '#!/fridge/mini',
        marketing: [
          {
            icon: 'asterisk',
            text: 'The perfect dorm room fridge as long as your parents are filthy rich and spoil you'
          },
          {
            icon: 'ok',
            text: 'All the same features and thus the same cost as the Wello Fridge Classic, but amazingly a quarter the size'
          },
          {
            icon: 'glass',
            text: 'A false back showing an empty fridge allows you to easily guilt your parents into sending you beer money, which you already had since they spoil you'
          },
          {
            icon: 'tag',
            text: '$12,899.95'
          }
        ]
      },
      {
        name: 'Wello Fridge Silver',
        link: '#!/fridge/silver',
        marketing: [
          {
            icon: 'asterisk',
            text: 'For our gullible consumer who yearns for the "better" days'
          },
          {
            icon: 'ok',
            text: 'Some features, maybe, if you angle it right'
          },
          {
            icon: 'flash',
            text: '14.4k modem with speed boost, which honestly doesn\'t do anything'
          },
          {
            icon: 'heart',
            text: 'Holds more yams than any other fridge'
          },
          {
            icon: 'tag',
            text: 'The majority of your retirement savings'
          }
        ]
      }
    ];
    // Resolution and browswer warning variables
    $scope.show_resolution_warning = 0;
    $scope.suppress_resolution = 0;
    $scope.show_browser_warning = 0;
    $scope.suppress_browser = 0;
    $scope.height = 0;
    $scope.width = 0;
    $scope.show_mobile = false;
    // ###### Manage Resolution and Browser Warnings for the Fridge ###########
    // Extend the scope with the CapabilityService
    angular.extend($scope, CapabilityService);
    $scope.init_capability_check($scope);
    // suppress browser warning
    $scope.sup_browser = function (val) {
      $scope.suppress_browser = val;
    };
    // suppres resolution warning
    $scope.sup_resolution = function (val) {
      $scope.suppress_resolution = val;
    };
    // Go to the provided state (ui-router)
    $scope.goto = function (state) {
      $state.go(state);
    };
  }
]);'use strict';
/*global $:false */
/**
 * Message Service and Controller for the Fridge "Status LCD"
 */
// The service for passing new messages to the status panel
// "post" = persistent message
// "flash" = temporary message
angular.module('core').factory('MessageService', [
  '$timeout',
  function ($timeout) {
    var msg_service = {
        message: '',
        to: -1,
        defmes: null,
        update: 0,
        disaster: false,
        success: false,
        achievement: false,
        disaster_type: null
      };
    // Write errors to the fridge "LED display"
    msg_service.handle_error = function (err) {
      $timeout(function () {
        if (typeof err.message === 'undefined') {
          msg_service.flash_disaster('Unable to connect to server.', 3000);
        } else {
          msg_service.flash_disaster(err.message, 3000);
        }
      });
    };
    // post a regular message
    msg_service.post = function (msg) {
      msg_service.message = msg;
      msg_service.update++;
      msg_service.disaster = false;
      msg_service.success = false;
      msg_service.disaster_type = null;
      msg_service.to = -1;
      msg_service.achievement = false;
    };
    // flash a message with a timeout and optionally a default message to revert to
    function flash_to(msg, to, defmes) {
      msg_service.message = msg;
      msg_service.update++;
      msg_service.disaster_type = null;
      msg_service.to = to;
      if (typeof defmes !== 'undefined') {
        msg_service.defmes = defmes;
      } else {
        msg_service.defmes = null;
      }
    }
    // flash a regular message
    msg_service.flash = function (msg, to, defmes) {
      msg_service.disaster = false;
      msg_service.success = false;
      msg_service.achievement = false;
      flash_to(msg, to, defmes);
    };
    // flash a disaster message
    msg_service.flash_disaster = function (msg, to, defmes) {
      msg_service.disaster = true;
      msg_service.success = false;
      msg_service.achievement = false;
      flash_to(msg, to, defmes);
    };
    // flash a success message
    msg_service.flash_success = function (msg, to, defmes) {
      msg_service.disaster = false;
      msg_service.success = true;
      msg_service.achievement = false;
      flash_to(msg, to, defmes);
    };
    // flash an achievement message
    msg_service.flash_achievement = function (msg, to) {
      msg_service.disaster = false;
      msg_service.success = false;
      msg_service.achievement = true;
      flash_to(msg, to);
    };
    // post a disaster message that will stay until specifically removed
    // only new disasters will be displayed until this is corrected			
    msg_service.add_disaster = function (msg, type) {
      msg_service.message = msg;
      msg_service.update++;
      msg_service.disaster = true;
      msg_service.success = false;
      msg_service.achievement = false;
      msg_service.disaster_type = type;
      msg_service.to = -1;
    };
    // remove an existing disaster lock
    msg_service.remove_disaster = function (msg, type) {
      msg_service.message = msg;
      msg_service.update++;
      msg_service.disaster = false;
      msg_service.success = false;
      msg_service.achievement = false;
      msg_service.disaster_type = type;
      msg_service.to = -1;
    };
    // revert to previous state
    msg_service.revert = function () {
      msg_service.message = null;
      msg_service.update++;
      msg_service.disaster = false;
      msg_service.success = false;
      msg_service.achievement = false;
      msg_service.disaster_type = null;
      msg_service.to = -1;
    };
    return msg_service;
  }
]);
// Controller
// The most important aspect to note is that disaster messages 'overpower' any other type of message
angular.module('core').controller('MessageController', [
  '$scope',
  '$timeout',
  'Authentication',
  'BoardService',
  'MessageService',
  function ($scope, $timeout, Authentication, BoardService, MessageService) {
    $scope.message = '';
    $scope.disaster = false;
    $scope.msg_success = false;
    $scope.msg_achievement = false;
    var disaster_type = null;
    var disaster = false, msg_success = false, msg_achievement = false;
    var active_disasters = [];
    var def;
    var mto = null, mto_block = null;
    var root_disaster = false;
    var timeout_disaster, timeout_success;
    var found;
    function anim(txt) {
      if ($scope.message !== txt) {
        var div = $('.status_anim');
        div.stop(true);
        div.animate({ opacity: '0.0' }, 100);
        div.animate({ opacity: '1.0' }, 400);
        $timeout(function () {
          $scope.message = txt;
          $scope.disaster = disaster;
          $scope.msg_success = msg_success;
          $scope.msg_achievement = msg_achievement;
        }, 100);
      }
    }
    $scope.$watch(function () {
      return MessageService.update;
    }, function (newVal, oldVal) {
      var i;
      // if message is null, simply revert back to the default message 
      // unless the timeout is a disaster and this message is not
      if (MessageService.message === null) {
        if (disaster === false || MessageService.disaster || timeout_disaster) {
          $timeout.cancel(mto);
          if (!root_disaster)
            disaster = false;
          anim(def);
          mto = null;
        }
      } else {
        // if this message is a timeout
        if (MessageService.to > 0) {
          // sink any non-disaster timeout if a disaster is currently visible
          if (disaster && !MessageService.disaster && !MessageService.success)
            return;
          // set a default message if it comes with the timeout event
          if (MessageService.defmes !== null) {
            def = MessageService.defmes;
            MessageService.defmes = null;
          }
          // if this event is a disaster, make it visible
          if (MessageService.disaster === true) {
            disaster = true;
            msg_achievement = false;
            msg_success = false;  // success messages are only TOs
          } else if (MessageService.achievement === true) {
            disaster = false;
            msg_success = true;
            msg_achievement = true;
          } else if (MessageService.success === true) {
            disaster = false;
            msg_success = true;
            msg_achievement = false;
          } else {
            disaster = false;
            msg_success = false;
            msg_achievement = false;
          }
          // set visible message
          //$scope.message = MessageService.message;
          anim(MessageService.message);
          // cancel existing timeout and replace with the new event
          timeout_disaster = MessageService.disaster;
          timeout_success = MessageService.success;
          $timeout.cancel(mto);
          $timeout.cancel(mto_block);
          mto_block = $timeout(function () {
            mto_block = null;
          }, 200);
          mto = $timeout(function () {
            // at the end of the timeout, create a new event to revert the status
            MessageService.message = null;
            MessageService.update++;
            // wipe disaster if there isn't a default disaster
            if (!root_disaster)
              disaster = false;
            // always wipe success at the end of a timeout
            msg_success = false;
            msg_achievement = false;
            mto = null;
          }, MessageService.to);
          // clear event variables
          MessageService.to = -1;
          MessageService.disaster = false;
          MessageService.success = false;
          MessageService.achievement = false;
        } else {
          // check to see if this event is setting or clearing a blocking disaster
          // (i.e. any disaster without a timeout)
          if (MessageService.disaster_type !== null) {
            // if this is a new disaster, then push it to active disasters
            if (MessageService.disaster === true) {
              found = false;
              for (i = 0; i < active_disasters.length; i++) {
                if (MessageService.disaster_type === active_disasters[i].dt) {
                  found = true;
                }
              }
              if (!found) {
                active_disasters.push({
                  msg: MessageService.message,
                  dt: MessageService.disaster_type
                });
              }  // if this is clearing a disaster, check to remove it from active diasters
            } else {
              for (i = 0; i < active_disasters.length; i++) {
                if (active_disasters[i].dt === MessageService.disaster_type) {
                  active_disasters.splice(i, 1);
                  break;
                }
              }
            }
          }
          // enable or disable "root disaster" if any blocking disasters are set
          // "root disaster" dictates that no non-disaster may post to the status bar
          if (active_disasters.length > 0) {
            root_disaster = true;
            // this may still be a recovery event if active_disasters was greater than 1
            // so reassign the current message to the first remaining active disaster
            // if the current event is not also a disaster						
            if (MessageService.disaster === false) {
              MessageService.disaster = true;
              MessageService.message = active_disasters[0].msg;
            }
          } else {
            root_disaster = false;
            // this event must be either not a disaster (including recovery events)
            // for root_disaster to be false
            if (disaster)
              disaster = false;
          }
          // at the very least, set this to be the default message if it's a disaster
          if (MessageService.disaster === true) {
            def = MessageService.message;
            // and force it to be the current message if there's currently not a disaster
            if (disaster === false) {
              msg_success = false;
              $timeout.cancel(mto);
              //$scope.message = def;
              anim(def);
              disaster = true;
            }  // sink any non-disasters attempting to post during a blocking disaster				
          } else if (root_disaster === true) {
            return;  // there will be no blocking disaster by this point
                     // so the only disaster would be a timeout disaster
                     // simply set the default message and wait if there is a timeout disaster
          } else {
            def = MessageService.message;
            if (disaster === false && mto_block === null) {
              msg_success = false;
              msg_achievement = false;
              $timeout.cancel(mto);
              mto = null;
              //$scope.message = def;	
              anim(def);
            }
          }
          // reset disaster variables so they don't affect the next event which doesn't set them
          MessageService.disaster = false;
          MessageService.success = false;
          MessageService.achievement = false;
          MessageService.disaster_type = null;
        }
      }
    });
  }
]);'use strict';
/**
 * Weather Service for displaying the weather... or cats... for some reason
 */
// Controller
angular.module('core').controller('WeatherController', [
  '$scope',
  '$http',
  '$timeout',
  'Authentication',
  'MessageService',
  'AchievementService',
  function ($scope, $http, $timeout, Authentication, MessageService, AchievementService) {
    $scope.authentication = Authentication;
    $scope.first_weather = true;
    // Update the default zipcode for the user
    $scope.updateZip = function () {
      $http.post('/change_zip', { zip: $scope.new_zip }).success(function () {
        Authentication.user.zip = $scope.new_zip;
        $scope.loadWeather();
        $scope.editzip = false;
      });
    };
    // Display geographic information if successful; otherwise display Mars (for instance, zipcode '00000')
    // Also decide between displaying the weather if it's nice or cats
    function cat_messages(successful) {
      $scope.icon = '/modules/core/img/weather/' + $scope.icon;
      if ($scope.first_weather === false) {
        if (successful) {
          if ($scope.country !== 'US') {
            /**/
            $timeout(function () {
              AchievementService.achievement(52, 1);
            }, 3000);
          } else if ($scope.city === 'New York') {
            /**/
            $timeout(function () {
              AchievementService.achievement(36, 1);
            }, 3000);
          }
          if ($scope.showcats === true) {
            if ($scope.temp >= 100) {
              achievement(33, 1);
              $timeout(function () {
                AchievementService.achievement(38, 1);
              }, 6000);
            } else {
              AchievementService.achievement(38, 1);
            }
            MessageService.flash('The weather is not too great there, here is a cat.', 3000);
          } else {
            MessageService.flash('The weather is pretty nice there today, no need for cats.', 3000);
            if ($scope.temp >= 72 && $scope.temp < 73 && $scope.condition === 'Clear') {
              /**/
              achievement(34, 1);
              $timeout(function () {
                AchievementService.achievement(37, 1);
              }, 6000);
            } else {
              AchievementService.achievement(37, 1);
            }
          }
        } else {
          if ($scope.state === 'Mars') {
            /**/
            MessageService.flash('Little dusty to say the least.', 3000);
            AchievementService.achievement(35, 1);
          } else {
            MessageService.flash_disaster('Unable to load weather.', 3000);
          }
        }
      }
      $scope.first_weather = false;
    }
    // Make a call to the backend which in turn geocodes the zipcode to a city, state, country via googleAPI and then runs that information against Open Weather Map for the weather
    $scope.loadWeather = function () {
      $scope.loadingweather = true;
      $scope.showcats = false;
      $scope.zip = Authentication.user.zip;
      $http.post('/weather', { zip: $scope.zip }).success(function (data) {
        $scope.state = data.state;
        $scope.country = data.country;
        $scope.city = data.city;
        $scope.temp = data.temp;
        $scope.condition = data.condition;
        $scope.icon = data.icon;
        var weather_id = data.weather_id;
        var weather_des = data.weather_des;
        if ($scope.state === 'Mars') {
          $scope.showcats = true;
          $scope.catmessage = 'Wello has no idea where you were trying to lookup, but they probably don\'t have that many cat pictures there.';
          $scope.loadingweather = false;
          $scope.city = 'Soujourner\'s Grave';
          $scope.state = 'Mars';
          $scope.cat = '/modules/core/img/cats/' + Math.floor(Math.random() * 11.999) + '.jpg';
          cat_messages(false);
        } else {
          if ($scope.icon === '04n' || $scope.icon === '04d' || weather_id === 721) {
            $scope.icon = 'partly_cloudy.png';
            $scope.condition_text = 'Partly Cloudy';
          } else if ($scope.icon === '01n' || $scope.icon === '01d') {
            $scope.icon = 'sunny.png';
            $scope.condition_text = 'Sunny';
          } else if ($scope.icon === '02n' || $scope.icon === '02d') {
            $scope.icon = 'mostly_sunny.png';
            $scope.condition_text = 'Mostly Sunny';
          } else if ($scope.icon === '03n' || $scope.icon === '03d') {
            $scope.icon = 'partly_cloudy.png';
            $scope.condition_text = 'Partly Cloudy';
          } else if ($scope.icon === '09n' || $scope.icon === '09d') {
            $scope.icon = 'rainy.png';
            $scope.condition_text = 'Rainy';
          } else if ($scope.icon === '10n' || $scope.icon === '10d') {
            $scope.icon = 'rainy.png';
            $scope.condition_text = 'Rainy';
          } else if ($scope.icon === '11n' || $scope.icon === '11d') {
            $scope.icon = 'thunder_storm.png';
            $scope.condition_text = 'Thunder Storms';
          } else if ($scope.icon === '13n' || $scope.icon === '13d') {
            $scope.icon = 'snowy.png';
            $scope.condition_text = 'Snowy';
          } else if ($scope.icon === '50n' || $scope.icon === '50d') {
            $scope.icon = 'cloudy.png';
            $scope.condition_text = 'Cloudy';
          }
          if ($scope.temp < 50) {
            $scope.showcats = true;
            $scope.catmessage = 'It\'s freezing outside in ' + $scope.city + ' at ' + $scope.temp + ' degrees.  No problem though, because cat pictures are inside.';
          } else if ($scope.temp < 60) {
            $scope.showcats = true;
            $scope.catmessage = 'It\'s a little chilly in ' + $scope.city + ' at ' + $scope.temp + ' degrees, better look at some pictures of cats instead of worrying about the specifics.';
          } else if ($scope.temp > 90) {
            $scope.showcats = true;
            $scope.catmessage = 'It\'s way too hot in ' + $scope.city + ' at ' + $scope.temp + ' degrees.  Instead of ruining your day by showing you exactly how hot, here are some cat pictures.';
          } else if ($scope.condition === 'Clear' || $scope.condition === 'Clouds' || weather_id >= 905 && weather_id <= 955 || weather_id === 721) {
            $scope.showcats = false;
          } else {
            $scope.showcats = true;
            $scope.catmessage = 'Meh, the temperature outside is fine, but there is some nasty ' + weather_des + ' action going on out in ' + $scope.city + '.  Better stay in and look at cats.';
          }
          $scope.loadingweather = false;
          if ($scope.showcats === true) {
            $scope.cat = '/modules/core/img/cats/' + Math.floor(Math.random() * 11.999) + '.jpg';
          }
          cat_messages(true);
        }
      }).error(function () {
        $scope.showcats = true;
        $scope.catmessage = 'Wello has lost 100% of their fridge sales to piracy and the weather API was the first resultant budget cut, but not all is lost -- here are some cat pictures.';
        $scope.loadingweather = false;
        $scope.city = '?????';
        $scope.state = '??';
        $scope.cat = '/modules/core/img/cats/' + Math.floor(Math.random() * 11.999) + '.jpg';
        cat_messages(false);
      });
    };
  }
]);'use strict';
/*global $:false */
/**
 * Primary Board Controller for Lists and Cards (and Modal Controller for opening Cards)
 */
// Modal Controller
angular.module('core').controller('ModalController', [
  '$scope',
  '$modalInstance',
  'data',
  function ($scope, $modalInstance, data) {
    // Set up Modal scope based on data provided
    $scope.custom_board = data.custom_board;
    $scope.label_names = data.label_names;
    $scope.card = data.card;
    $scope.labels_locked = data.labels_locked;
    $scope.card_locked = data.card_locked;
    $scope.label_func = data.toggle_card_label;
    $scope.name_func = data.commit_card_name;
    $scope.des_func = data.commit_card_des;
    $scope.delete_func = data.commit_card_delete;
    // Editable variables
    $scope.edit_name = '';
    $scope.show_edit_name = false;
    $scope.edit_des = '';
    $scope.show_edit_des = false;
    $scope.show_delete = false;
    var food_func = data.food_func;
    var recipe_func = data.recipe_func;
    var achievement_func = data.achievement_func;
    // Achievement for "meeting Munchkin"
    if ($scope.card.munchkined) {
      achievement_func(0, 1);
    }
    // Achievements for opening particular boards
    if ($scope.custom_board === 6) {
      $scope.achievement = data.achievements[$scope.card.achievement_ref];
    } else if ($scope.custom_board === 4) {
      $scope.food = data.food;
      $scope.recipe = data.recipes[$scope.card.recipe_ref];
      achievement_func(22, 1);
    } else if ($scope.custom_board === 3) {
      $scope.food = data.food;
    }
    // ####### Edit Card Name ##########
    // Show edit card name dialog
    $scope.show_edit_name = function () {
      if (!$scope.card_locked) {
        $scope.show_name = true;
        $scope.edit_name = $scope.card.name;
        $scope.show_delete = false;
      }
    };
    // Commit the name by calling an anonymous passed to the Modal from WelloController
    $scope.commit_name = function () {
      if (!$scope.card_locked) {
        $scope.name_func($scope.edit_name, function (result) {
          $scope.card.name = result;
          $scope.edit_name = '';
          $scope.show_name = false;
        });
      }
    };
    // Hide edit card name dialog
    $scope.hide_edit_name = function () {
      $scope.show_name = false;
      $scope.edit_name = '';
    };
    // ####### Edit Card Description ##########
    // Show edit card description dialog
    $scope.show_edit_des = function () {
      if (!$scope.card_locked) {
        $scope.show_des = true;
        $scope.edit_des = $scope.card.des;
        $scope.show_delete = false;
      }
    };
    // Commit the description by calling an anonymous passed to the Modal from WelloController
    $scope.commit_des = function () {
      if (!$scope.card_locked) {
        $scope.des_func($scope.edit_des, function (result) {
          $scope.card.des = result;
          $scope.edit_des = '';
          $scope.show_des = false;
        });
      }
    };
    // Hide edit card description dialog		
    $scope.hide_edit_des = function () {
      $scope.show_des = false;
      $scope.edit_des = '';
    };
    // ###### Other Functions ##########
    // Toggle a label on the card by calling an anonymous passed to the Modal from WelloController
    $scope.toggle_label = function (index) {
      if (!$scope.labels_locked) {
        $scope.show_delete = false;
        $scope.label_func(index, function (result) {
          $scope.card.labels[index] = result;
        });
      }
    };
    // ####### Delete Card ##########
    // Show delete card dialog
    $scope.show_delete_dialog = function () {
      if (!$scope.card_locked) {
        $scope.show_delete = true;
        $scope.show_name = false;
        $scope.show_des = false;
      }
    };
    // Commit delete card by calling an anonymous passed to the Modal from WelloController
    $scope.commit_delete = function () {
      if (!$scope.card_locked) {
        $scope.delete_func(function () {
          $modalInstance.dismiss('cancel');
        });
      }
    };
    // hide delete card dialog
    $scope.hide_delete_dialog = function () {
      $scope.show_delete = false;
    };
    // create additional food (anonymous from WelloController)
    // custom board 3 or 4 (food,recipes) only
    $scope.create_food = function (food) {
      food_func(food);
    };
    // prepare recipe (anonymous from WelloController)
    // custom board 4 (recipes) only
    $scope.prepare_recipe = function (recipe) {
      recipe_func(recipe);
    };
    // Return the number of active labels on this card
    $scope.num_labels = function () {
      var c = 0;
      for (var i = 0; i < 6; i++) {
        if ($scope.card.labels[i])
          c++;
      }
      return c;
    };
    // Dismiss Modal
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  }
]);
// Controller
// Manages all interaction with lists and cards as well as many "fun features" such as games and recipes
angular.module('core').controller('FridgeWelloController', [
  '$scope',
  '$http',
  '$timeout',
  '$interval',
  '$modal',
  'Authentication',
  'BoardService',
  'FoodService',
  'FoodPrepService',
  'MessageService',
  'AchievementService',
  function ($scope, $http, $timeout, $interval, $modal, Authentication, BoardService, FoodService, FoodPrepService, MessageService, AchievementService) {
    Authentication.signincb = 'base';
    // Scope Variables for binding
    $scope.edit_label = false;
    $scope.something_to_cancel = false;
    $scope.food_categories = [];
    $scope.food_category = null;
    $scope.food_select = null;
    $scope.food = [];
    $scope.ice_id = -1;
    $scope.snake_top_score = 0;
    $scope.cardbreaker_top_score = 0;
    $scope.board_data = [];
    $scope.authentication = Authentication;
    $scope.showing_add_list = false;
    $scope.new_list_name = '';
    $scope.board_loaded = false;
    $scope.is_party_time = false;
    $scope.is_filter_Time = false;
    $scope.filterText = '';
    $scope.filterTextActive = '';
    $scope.filterAny = true;
    $scope.clicking = false;
    $scope.show_nibbles = false;
    $scope.filtering_labels = false;
    $scope.nibbles_cloak = false;
    $scope.show_cardbreaker = false;
    $scope.cardbreaker_cloak = false;
    $scope.achievements = [];
    $scope.dirq = [];
    $scope.filter_labels_active = $scope.filter_labels = [
      false,
      false,
      false,
      false,
      false,
      false
    ];
    $scope.wello_snake = [];
    $scope.new_card_name = '';
    // Local variables
    var the_party;
    var filter_anim_to;
    var list_from_index = null;
    var list_to_index = null;
    var list_uid = null;
    var delete_list = null;
    var edit_list;
    var add_card_list = null;
    var party_ended = false;
    var message = MessageService;
    var filter_regex;
    var can_scroll_left = true;
    var can_scroll_right = false;
    var scroll_parent = 0;
    var scroll_child = 0;
    var dontstopprop = false;
    var open_card = null;
    var open_list = null;
    var list_index = -1, card_index = -1;
    var kill_move = false;
    var removing_filters = false;
    var clicktime;
    var clickx, clicky;
    var list_index_from;
    // snake and cardbreaker variables
    var card_anim_prev, card_anim_now, card_anim_elapsed, cardbreaker_animation, card_return_board, munchkin_size, card_collision;
    var x_begin, x_end, y_begin, y_end, x_test, y_test, ball_speed_x, ball_speed_y, ball_x_last, ball_y_last, ball_speed, ball_flatness;
    var cardbreaker_score, food_type, food_image, last_laser, cb_laser, cb_count, cumulative_speed;
    // Sortable Options
    $scope.sortableOptions = {
      start: function (e, ui) {
        $(e.target).data('ui-sortable').floating = true;
      },
      update: function (e, ui) {
        list_from_index = ui.item.index();
        list_uid = $scope.board_data.lists[list_from_index].uid;
      },
      stop: function (e, ui) {
        list_to_index = ui.item.index();
        if (list_to_index !== null && list_from_index !== null && list_to_index !== list_from_index) {
          $http.post('/list_move', {
            board_id: $scope.board_data._id,
            move: {
              from_list: list_from_index,
              to_list: list_to_index,
              list_id: list_uid
            }
          }).success(function (data) {
            MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
            $timeout(function () {
              MessageService.flash_success('Successfully Moved List', 2000);
              $scope.achievement(46, 1);
            }, 0);
          }).error(function (err) {
            // revert list position
            var list = $scope.board_data.lists.splice(list_to_index, 1)[0];
            $scope.board_data.lists.splice(list_from_index, 0, list);
            MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
            MessageService.handle_error(err);
          }).finally(function () {
            list_to_index = list_from_index = null;
          });
        }
      },
      axis: 'x',
      handle: '.list_head, .list_foot'
    };
    $scope.jqueryScrollbarOptions = {
      'type': 'simple',
      'disableBodyScroll': false
    };
    // ########## Controls ###############
    // Hide all open dialogs
    $scope.hide_all = function () {
      if ($scope.something_to_cancel) {
        $scope.hide_add_card();
        $scope.hide_delete_list();
        $scope.hide_add_list();
        $scope.hide_edit_list();
        $scope.cancel_edit_label();
      }
    };
    // ########## Boards ################
    // Watch the board service in order to load and setup a new board
    $scope.$watch(function () {
      return BoardService.update;
    }, function (newVal, oldVal) {
      if (typeof newVal !== undefined) {
        if ($scope.is_party_time) {
          $scope.party_over();
        }
        $scope.board_loaded = false;
        var card;
        $scope.showing_add_list = false;
        $scope.new_list_name = '';
        $scope.filtering_labels = false;
        removing_filters = false;
        $scope.filter_labels = $scope.filter_labels_active = [
          false,
          false,
          false,
          false,
          false,
          false
        ];
        $scope.filterText = $scope.filterTextActive = '';
        filter_regex = new RegExp($scope.filterTextActive, 'i');
        $scope.filterAny = true;
        $scope.is_filter_time = false;
        party_ended = false;
        $('.list').each(function () {
          $(this).removeClass('list');
        });
        $scope.board_data = BoardService.data;
        add_card_list = null;
        $scope.new_card_name = '';
        if ($scope.board_data !== null && (typeof $scope.board_data.lists !== 'undefined' || BoardService.custom_board === 8)) {
          $scope.custom_board = BoardService.custom_board;
          if ($scope.custom_board !== 8) {
            for (var i = 0; i < $scope.board_data.lists.length; i++) {
              for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
                card = $scope.board_data.lists[i].cards[j];
                card.filtered = true;
                if ($scope.custom_board === 4) {
                  card.servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
                }
              }
            }
          }
          $timeout(function () {
            $scope.board_loaded = true;
            if ($scope.custom_board === 7) {
              $scope.nibbles_cloak = true;
            } else {
              $scope.nibbles_cloak = false;
            }
            if ($scope.custom_board === 8) {
              $scope.cardbreaker_cloak = true;
              $timeout(function () {
                $('.fridge1-top-content-bot').perfectScrollbar('destroy');
              });
            } else {
              $scope.cardbreaker_cloak = false;
              $timeout(function () {
                $scope.new_list_pos = $scope.board_data.lists.length * 200;
                $scope.board_data.update = false;
                $timeout(function () {
                  $('.list').each(function () {
                    var thish = 360 - $(this).children('.list_head').height() - $(this).children('.list_foot').height() + 'px';
                    $(this).children('.scrollbar-dynamic').css({ 'max-height': thish });
                    $(this).children('.scrollbar-dynamic').perfectScrollbar({ suppressScrollX: true });
                  });
                  $('.fridge1-top-content-bot').perfectScrollbar('destroy').perfectScrollbar({ suppressScrollY: true }).scrollLeft(0).perfectScrollbar('update');
                }, 0);
              }, 0);
            }
          }, 0);
        }
      }
    });
    // ############# Lists ################
    // resize the scrollbars on a list
    function resize_list(list, scrollto) {
      // get the list element
      var $elem = $('.list').eq(list);
      // calculate the remaining height for the cards
      var thish = 360 - $elem.children('.list_head').height() - $elem.children('.list_foot').height() + 'px';
      // get the scrolling container element
      $elem = $elem.children('.scrollbar-dynamic');
      $elem.css('max-height', thish);
      if (scrollto > -1) {
        $elem.scrollTop(scrollto);
      }
      $elem.perfectScrollbar('update');
    }
    // open add list dialog
    $scope.show_add_list = function () {
      if (!$scope.board_data.lists_locked) {
        $scope.hide_all();
        $scope.something_to_cancel = true;
        $scope.showing_add_list = true;
        $scope.new_list_name = '';
        $('.fridge1-top-content-bot').scrollLeft(10000).perfectScrollbar('update');
      }
    };
    // add a new list
    $scope.commit_list_add = function () {
      $http.post('/list_add', {
        board_id: $scope.board_data._id,
        name: $scope.new_list_name
      }).success(function (data) {
        $timeout(function () {
          MessageService.flash_success('Successfully Added List.', 4000);
          $scope.achievement(48, 1);
        }, 0);
        $scope.board_data.lists.push(data.list);
        $scope.hide_add_list();
        $timeout(function () {
          $scope.new_list_pos = $scope.board_data.lists.length * 200;
          var $list = $('.list:eq(' + ($scope.board_data.lists.length - 1) + ')');
          var thish = 360 - $list.children('.list_head').height() - $list.children('.list_foot').height() + 'px';
          $list.children('.scrollbar-dynamic').css({ 'max-height': thish });
          $list.children('.scrollbar-dynamic').perfectScrollbar({ suppressScrollX: true });
          $timeout(function () {
            $('.fridge1-top-content-bot').scrollLeft(10000).perfectScrollbar('update');
          }, 0);
        }, 0);
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // hide add list dialog
    $scope.hide_add_list = function () {
      $scope.showing_add_list = false;
      $scope.something_to_cancel = false;
    };
    // show edit list dialog
    $scope.show_edit_list = function (list, list_obj) {
      if (!$scope.board_data.lists_locked) {
        $scope.hide_all();
        open_list = list_obj;
        $scope.something_to_cancel = true;
        $scope.board_data.lists[list].showing_edit_list = true;
        edit_list = list;
        $scope.edit_list_name = $scope.board_data.lists[list].name;
        $timeout(function () {
          resize_list(list, -1);
        }, 0);
      }
    };
    // change the name of a list
    $scope.commit_list_name = function () {
      $http.post('/list_name', {
        board_id: $scope.board_data._id,
        list: edit_list,
        list_id: open_list.uid,
        name: $scope.edit_list_name
      }).success(function (data) {
        $scope.achievement(43, 1);
        $timeout(function () {
          MessageService.flash_success('Successfully Updated List Name.', 3000);
        }, 0);
        $scope.board_data.lists[data.list].name = data.name;
        $scope.hide_edit_list();
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // hide edit list dialog
    $scope.hide_edit_list = function () {
      if (typeof edit_list !== 'undefined' && edit_list !== null) {
        var list = edit_list;
        $scope.board_data.lists[edit_list].showing_edit_list = false;
        $timeout(function () {
          resize_list(list, -1);
        }, 0);
        edit_list = null;
        open_list = null;
        $scope.something_to_cancel = false;
      }
    };
    // show delete list dialog
    $scope.show_delete_list = function (list, list_obj) {
      if (!$scope.board_data.lists_locked) {
        $scope.hide_all();
        open_list = list_obj;
        $scope.something_to_cancel = true;
        $scope.board_data.lists[list].showing_delete_list = true;
        delete_list = list;
        $timeout(function () {
          resize_list(list, -1);
        }, 0);
      }
    };
    // delete a list
    $scope.commit_list_delete = function () {
      $http.post('/list_delete', {
        board_id: $scope.board_data._id,
        list: delete_list,
        list_id: open_list.uid
      }).success(function (data) {
        $timeout(function () {
          MessageService.flash_success('Successfully Deleted List.', 4000);
          $scope.achievement(45, 1);
        }, 0);
        $scope.hide_delete_list();
        $scope.board_data.lists.splice(data.list, 1);
        $timeout(function () {
          $scope.new_list_pos = $scope.board_data.lists.length * 200;
          if ($scope.board_data.lists.length === 0) {
            $scope.board_loaded = false;
          }
          $timeout(function () {
            if ($scope.board_data.lists.length === 0) {
              $scope.board_loaded = true;
              $timeout(function () {
                $('#list_adder').stop(true);
              }, 0);
            }
            var scroll_left = $('.fridge1-top-content-bot').scrollLeft();
            $('.fridge1-top-content-bot').scrollLeft(scroll_left - 200).perfectScrollbar('update');
          }, 0);
        }, 1500);
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // hide delete list dialog
    $scope.hide_delete_list = function () {
      if (delete_list !== null) {
        var list = delete_list;
        $scope.board_data.lists[delete_list].showing_delete_list = false;
        $timeout(function () {
          resize_list(list, -1);
        }, 0);
        delete_list = null;
        open_list = null;
        $scope.something_to_cancel = false;
      }
    };
    // ########## Cards ###############
    // show create card dialog
    $scope.show_add_card = function (list, list_obj) {
      if (!$scope.board_data.cards_locked) {
        $scope.hide_all();
        open_list = list_obj;
        $scope.something_to_cancel = true;
        $scope.board_data.lists[list].showing_add_card = true;
        add_card_list = list;
        $scope.new_card_name = '';
        $timeout(function () {
          resize_list(list, 10000);
        }, 0);
      }
    };
    // add a new card
    $scope.commit_card_add = function () {
      if ($scope.new_card_name.length > 0) {
        $http.post('/add_card', {
          board_id: $scope.board_data._id,
          list: add_card_list,
          name: $scope.new_card_name,
          list_id: open_list.uid
        }).success(function (data) {
          data.card.filtered = true;
          $scope.board_data.lists[add_card_list].cards.push(data.card);
          $scope.new_card_name = '';
          $timeout(function () {
            //MessageService.flash_success('Successfully Added Card.',3000);	
            resize_list(add_card_list, 10000);
            $('#add_card_control').focus();
            if (data.card.munchkined) {
              $timeout(function () {
                $scope.achievement(47, 1);
              }, 3000);
              $scope.achievement(12, 1);
            }
            $scope.achievement(47, 1);
            $scope.achievement(26, 1);
            if (data.num_cards === 75) {
              $timeout(function () {
                $scope.achievement(54, 1);
              }, 4000);
            }
          }, 0);
        }).error(function (err) {
          MessageService.handle_error(err);
        });
      }
    };
    // hide create card dialog
    $scope.hide_add_card = function () {
      if (add_card_list !== null) {
        var list = add_card_list;
        $scope.board_data.lists[add_card_list].showing_add_card = false;
        $timeout(function () {
          resize_list(list, -1);
        }, 0);
        add_card_list = null;
        open_list = null;
        $scope.something_to_cancel = false;
      }
    };
    // record mousedown time and position to see if element should move or open modal
    $scope.mousedown = function ($event, card, listi, cardi) {
      //$('#'+card.uid+'_ph').css({'height':($('#'+card.uid).height())+'px'});
      clicktime = new Date().getTime();
      clickx = $event.clientX;
      clicky = $event.clientY;
      open_card = card;
      list_index = listi;
      card_index = cardi;
    };
    // open a modal for a card if the click time is under 300ms and it hasn't moved more than a few pixels
    $scope.open = function ($event) {
      if (new Date().getTime() - clicktime < 300 && Math.abs(clickx - $event.clientX) + Math.abs(clicky - $event.clientY) < 5) {
        kill_move = true;
        var modalInstance = $modal.open({
            templateUrl: 'myModalContent.html',
            controller: 'ModalController',
            size: '',
            resolve: {
              data: function () {
                return {
                  card: open_card,
                  label_names: $scope.board_data.label_names,
                  card_locked: $scope.board_data.cards_locked,
                  labels_locked: $scope.board_data.card_labels_locked,
                  toggle_card_label: $scope.toggle_card_label,
                  commit_card_name: $scope.commit_card_name,
                  commit_card_des: $scope.commit_card_des,
                  commit_card_delete: $scope.commit_card_delete,
                  food_func: $scope.food_submit,
                  recipe_func: $scope.prepare_food,
                  achievement_func: $scope.achievement,
                  food: $scope.food,
                  recipes: $scope.recipes,
                  achievements: $scope.achievements,
                  custom_board: $scope.custom_board
                };
              }
            }
          });
        $scope.hide_all();
        MessageService.post('DANGER: Emitting Wello Card with Military-Grade Science');
        modalInstance.result.then(function (msg) {
          alert(msg);
        }, function () {
          MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
        });
      }
    };
    // toggle a label on a card
    // called from Modal
    $scope.toggle_card_label = function (label_index, cb) {
      $http.post('/update_card_label', {
        board_id: $scope.board_data._id,
        list: list_index,
        card: card_index,
        label: label_index,
        card_id: open_card.uid
      }).success(function (data) {
        $scope.achievement(40, 1);
        if (data.toggle) {
          MessageService.flash_success('Label Added', 1000);
        } else {
          MessageService.flash_success('Label Removed', 1000);
        }
        cb(data.toggle);
      }).error(function (err) {
        if (typeof err.message === 'undefined') {
          MessageService.flash_disaster('Unable to connect to server.', 3000);
        } else {
          MessageService.flash_disaster(err.message, 3000);
        }
      });
    };
    // Commit a new name for a card
    // Called from Modal
    $scope.commit_card_name = function (new_name, cb) {
      $http.post('/update_card_name', {
        board_id: $scope.board_data._id,
        list: list_index,
        card: card_index,
        name: new_name,
        card_id: open_card.uid
      }).success(function (data) {
        $scope.achievement(41, 1);
        MessageService.flash_success('Card Name Updated.', 2000);
        cb(data.name);
      }).error(function (err) {
        if (typeof err.message === 'undefined') {
          MessageService.flash_disaster('Unable to connect to server.', 3000);
        } else {
          MessageService.flash_disaster(err.message, 3000);
        }
      });
    };
    // Commit a new description for a card
    // Called from Modal
    $scope.commit_card_des = function (new_des, cb) {
      $http.post('/update_card_des', {
        board_id: $scope.board_data._id,
        list: list_index,
        card: card_index,
        des: new_des,
        card_id: open_card.uid
      }).success(function (data) {
        $scope.achievement(42, 1);
        MessageService.flash_success('Card Description Updated.', 2000);
        cb(data.des);
      }).error(function (err) {
        if (typeof err.message === 'undefined') {
          MessageService.flash_disaster('Unable to connect to server.', 3000);
        } else {
          MessageService.flash_disaster(err.message, 3000);
        }
      });
    };
    // Capture beginning of a card move
    $scope.element_move_start = function ($part) {
      list_index_from = -1;
      for (var i = 0; i < $scope.board_data.lists.length; i++) {
        if (list_index_from === -1) {
          if ($scope.board_data.lists[i].cards.length === $part.length) {
            list_index_from = i;
            for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
              if ($scope.board_data.lists[i].cards[j].$$hashKey !== $part[j].$$hashKey) {
                list_index_from = -1;
              }
            }
          }
        }
      }
    };
    // Called after a card has been dropped
    // Makes remote calls and ensures the move is valid and successful
    $scope.element_moved = function ($indexFrom, $partTo, $indexTo) {
      var list_index_to = -1;
      // ridiculous method to find the moved element since angular-sortable-view has an immature api
      for (var i = 0; i < $scope.board_data.lists.length; i++) {
        if (list_index_to === -1) {
          if ($scope.board_data.lists[i].cards.length === $partTo.length) {
            list_index_to = i;
            for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
              if ($scope.board_data.lists[i].cards[j].$$hashKey !== $partTo[j].$$hashKey) {
                list_index_to = -1;
              }
            }
          }
        }
      }
      if (list_index_from > -1 && list_index_to > -1) {
        var temp = $scope.board_data.lists[list_index_to].cards[$indexTo];
        if (kill_move || party_ended) {
          if (party_ended) {
            MessageService.flash_disaster('Dude.. That party was crazy, this card isn\'t getting up for awhile.', 2000);
          }
          var from_offset = 0, to_offset = 0;
          if (list_index_from === list_index_to) {
            // compensate for the element affecting indices
            if ($indexFrom < $indexTo) {
              to_offset = 1;
            } else {
              from_offset = 1;
            }
          }
          $scope.board_data.lists[list_index_from].cards.splice($indexFrom + from_offset, 0, temp);
          $scope.board_data.lists[list_index_to].cards.splice($indexTo + to_offset, 1);
          kill_move = false;
        } else {
          $http.post('/card_move', {
            board_id: $scope.board_data._id,
            move: {
              from_list: list_index_from,
              from_card: $indexFrom,
              to_list: list_index_to,
              to_card: $indexTo,
              card_id: temp.uid,
              list_to_id: $scope.board_data.lists[list_index_to].uid
            }
          }).success(function (data) {
            if (list_index_to === list_index_from) {
              $scope.board_data.lists[list_index_to].cards.splice($indexTo, 1);
              $timeout(function () {
                $scope.board_data.lists[list_index_to].cards.splice($indexTo, 0, temp);
              }, 0);
            } else {
              $scope.achievement(6, 1);
            }
            MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
            var resize_lists = [];
            resize_lists.push($('.list').eq(list_index_to).children('.scrollbar-dynamic'));
            resize_lists.push($('.list').eq(list_index_from).children('.scrollbar-dynamic'));
            $timeout(function () {
              for (var i = 0; i < resize_lists.length; i++) {
                var scroll_pos = resize_lists[i].scrollTop();
                resize_lists[i].scrollTop(0).perfectScrollbar('update').scrollTop(scroll_pos);
              }
              $timeout(function () {
                for (var i = 0; i < resize_lists.length; i++) {
                  var scroll_pos = resize_lists[i].scrollTop();
                  resize_lists[i].scrollTop(0).perfectScrollbar('update').scrollTop(scroll_pos);
                }
              }, 0);
              MessageService.flash_success('Successfully and Amazingly Moved Wello Card without Bodily Injury', 2000);
            }, 0);
          }).error(function (err) {
            // revert card position
            var from_offset = 0, to_offset = 0;
            if (list_index_from === list_index_to) {
              // compensate for the element affecting indices
              if ($indexFrom < $indexTo) {
                to_offset = 1;
              } else {
                from_offset = 1;
              }
            }
            $scope.board_data.lists[list_index_from].cards.splice($indexFrom + from_offset, 0, temp);
            $scope.board_data.lists[list_index_to].cards.splice($indexTo + to_offset, 1);
            MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
            if (temp.munchkined && !$scope.achievements[39].unlocked) {
              $scope.achievement(39, 1);
            } else {
              MessageService.handle_error(err);
            }
          });
        }
      } else {
        MessageService.add_disaster('Science has failed us!  Repent!', 3);
      }
    };
    // display message while moving a card
    $scope.card_message = function () {
      MessageService.post('DANGER: Emitting Wello Card with Military-Grade Science');
    };
    // delete a card
    // called from Modal
    $scope.commit_card_delete = function (cb) {
      $http.post('/delete_card', {
        board_id: $scope.board_data._id,
        list: list_index,
        card: card_index,
        card_id: open_card.uid
      }).success(function (data) {
        $timeout(function () {
          MessageService.flash_success('Successfully Deleted Card.', 4000);
          $scope.achievement(45, 1);
        }, 0);
        $('.list:eq(' + list_index + ') .card:nth-child(' + (card_index + 1) + ')').addClass('delete_card');
        //$timeout(function(){
        $scope.board_data.lists[list_index].cards.splice(card_index, 1);
        //},1300);
        cb();
      }).error(function (err) {
        if (typeof err.message === 'undefined') {
          MessageService.flash_disaster('Unable to connect to server.', 3000);
        } else {
          MessageService.flash_disaster(err.message, 3000);
        }
      });
    };
    // ############# Labels ##################
    // show edit label dialog
    $scope.show_edit_label = function () {
      $scope.hide_all();
      $scope.something_to_cancel = true;
      $scope.edit_label_names = [];
      for (var i = 0; i < $scope.board_data.label_names.length; i++) {
        $scope.edit_label_names.push($scope.board_data.label_names[i]);
      }
      $scope.edit_label = true;
    };
    // update label names
    $scope.commit_edit_label = function () {
      $http.post('/update_labels', {
        board_id: $scope.board_data._id,
        labels: $scope.edit_label_names
      }).success(function (data) {
        $scope.achievement(53, 1);
        $scope.board_data.label_names = data;
        MessageService.flash_success('Successfully Updated Labels', 2000);
        $scope.cancel_edit_label();
      }).error(function (err) {
        if (typeof err.message === 'undefined') {
          MessageService.flash_disaster('Unable to connect to server.', 3000);
        } else {
          MessageService.flash_disaster(err.message, 3000);
        }
      });
    };
    // hide edit label dialog
    $scope.cancel_edit_label = function () {
      $scope.something_to_cancel = false;
      $scope.edit_label_names = [];
      $scope.edit_label = false;
      $scope.label_hover = -1;
    };
    // ########## Filtering #############
    // check if any filtered label is matched
    $scope.any_label = function (labels) {
      for (var i = 0; i < labels.length; i++) {
        if (labels[i] && $scope.filter_labels_active[i])
          return true;
      }
      return false;
    };
    // check if all filtered labels are matched
    $scope.all_labels = function (labels) {
      for (var i = 0; i < $scope.filter_labels_active.length; i++) {
        if ($scope.filter_labels_active[i] && !labels[i])
          return false;
      }
      return true;
    };
    // toggle any-all filtering
    // any: filter will match any selected label
    // all: filter will only match cards with all labels
    $scope.toggle_filter_any = function () {
      if ($scope.filterAny) {
        $scope.filterAny = false;
      } else {
        $scope.filterAny = true;
      }
      $scope.filter_anim_start();
    };
    // trigger the filter animation
    // make sure the filter animation is on before applying the filter
    $scope.filter_anim_start = function () {
      $scope.achievement(9, 1);
      var card;
      $scope.is_filter_time = true;
      removing_filters = true;
      for (var i = 0; i < $scope.filter_labels_active.length; i++) {
        if ($scope.filter_labels[i]) {
          removing_filters = false;
          break;
        }
      }
      $timeout.cancel(filter_anim_to);
      $timeout(function () {
        $scope.filterTextActive = $scope.filterText;
        $scope.filter_labels_active = $scope.filter_labels;
        $scope.filtering_labels = false;
        for (var i = 0; i < $scope.filter_labels_active.length; i++) {
          if ($scope.filter_labels_active[i]) {
            $scope.filtering_labels = true;
            break;
          }
        }
        for (i = 0; i < $scope.board_data.lists.length; i++) {
          for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
            card = $scope.board_data.lists[i].cards[j];
            card.filtered = true;
            if ($scope.filterTextActive !== '') {
              if (card.name.search(new RegExp($scope.filterTextActive, 'i')) === -1 && card.des.search(new RegExp($scope.filterTextActive, 'i')) === -1)
                card.filtered = false;
            }
            if (card.filtered) {
              if ($scope.filtering_labels && !removing_filters) {
                if ($scope.filterAny) {
                  card.filtered = $scope.any_label(card.labels);
                } else {
                  card.filtered = $scope.all_labels(card.labels);
                }
              }
            }
          }
        }
      }, 0);
      filter_anim_to = $timeout(function () {
        $scope.is_filter_time = false;
        $timeout(function () {
          $('.list').each(function () {
            // FIX
            $(this).children('.scrollbar-dynamic').scrollTop(0).perfectScrollbar('update').scrollTop(-1000);
          });
        }, 0);
      }, 600);
    };
    // toggle a label to filter with
    $scope.toggle_filter_lab = function (lab) {
      if ($scope.filter_labels[lab]) {
        $scope.filter_labels[lab] = false;
      } else {
        $scope.filter_labels[lab] = true;
      }
      $scope.filter_anim_start();
    };
    // completely cancel the filter
    $scope.cancel_filter = function () {
      $scope.filterText = '';
      $scope.filter_labels = [
        false,
        false,
        false,
        false,
        false,
        false
      ];
      $scope.filter_anim_start();
    };
    // ######## Food ############
    // Watch the Food Service in order to pull food, recipes, and achievements into scope
    $scope.$watch(function () {
      return FoodService.update;
    }, function (newVal, oldVal) {
      if (newVal !== oldVal && typeof newVal !== undefined) {
        $scope.food = FoodService.food;
        $scope.recipes = FoodService.recipes;
        $scope.achievements = FoodService.achievements;
        $scope.food_categories = [{
            name: '',
            id: 0
          }];
        //,{name:'Cat 1',id:1,food:[{name:'',id:-1},{name:'Redbull',id:0}]}]
        var i, j;
        var food_cat_found;
        var lut = {};
        for (i = 0; i < $scope.food.length; i++) {
          if ($scope.food[i].cat !== '') {
            food_cat_found = false;
            for (j = 0; j < $scope.food_categories.length; j++) {
              if ($scope.food_categories[j].name === $scope.food[i].cat) {
                /**/
                food_cat_found = true;
              }
            }
            if (!food_cat_found) {
              $scope.food_categories.push({
                name: $scope.food[i].cat,
                id: $scope.food_categories.length,
                food: [{
                    name: '',
                    id: -1
                  }]
              });
              lut[$scope.food[i].cat] = $scope.food_categories[$scope.food_categories.length - 1].food;
            }
            lut[$scope.food[i].cat].push({
              name: $scope.food[i].name,
              id: i
            });
          } else {
            $scope.ice_id = i;
          }
          $scope.food[i].recipes_used_in = [];
        }
        // setup recipes_used_in
        for (i = 0; i < $scope.recipes.length; i++) {
          for (j = 0; j < $scope.recipes[i].food.length; j++) {
            $scope.food[$scope.recipes[i].food[j].food].recipes_used_in.push(i);
          }
        }
        $scope.food_category = $scope.food_categories[0];
        $scope.food_select = null;
      }
    });
    // Select a category of food to choose from
    $scope.food_category_select = function () {
      if ($scope.food_category.id >= 0) {
        $scope.select_food = $scope.food_categories[$scope.food_category.id].food[0];
      }
    };
    // Create more food
    $scope.food_submit = function (ice) {
      var food_id = -1;
      if (ice >= 0) {
        food_id = ice;
      } else {
        if ($scope.select_food.id >= 0) {
          food_id = $scope.select_food.id;
        }
      }
      if (food_id >= 0) {
        $http.post('/add_food', { food_ref: food_id }).success(function (data) {
          /*$timeout(function() {
						MessageService.flash_success('Successfully 3D-Printed Food.',3000);		
					},0);*/
          $scope.food[data.food_id].count += data.create;
          if ($scope.food[data.food_id].count > 500) {
            $scope.achievement(4, 1);
            $timeout(function () {
              $scope.achievement(24, 1);
            }, 3000);
          } else {
            $scope.achievement(24, 1);
          }
          // update servings if on the recipe board
          if ($scope.custom_board === 4) {
            for (var i = 0; i < $scope.board_data.lists.length; i++) {
              for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
                if ($scope.food[data.food_id].recipes_used_in.indexOf($scope.board_data.lists[i].cards[j].recipe_ref) !== -1) {
                  $scope.board_data.lists[i].cards[j].servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
                }
              }
            }
          }
        }).error(function (err) {
          MessageService.handle_error(err);
        });
      }
    };
    // Prepare a recipe
    $scope.prepare_food = function (recipe_id) {
      $http.post('/prepare_recipe', { recipe_ref: recipe_id }).success(function (data) {
        var i, j;
        $scope.achievement(25, 1);
        FoodPrepService.new_food = $scope.recipes[data.prepared].image;
        FoodPrepService.food_id = data.prepared;
        var foods_used = data.food_uses;
        var recipes_updated = [];
        for (i = 0; i < foods_used.length; i++) {
          $scope.food[foods_used[i].food].count -= foods_used[i].amount;
          for (j = 0; j < $scope.food[foods_used[i].food].recipes_used_in.length; j++) {
            if (recipes_updated.indexOf($scope.food[foods_used[i].food].recipes_used_in[j]) === -1) {
              recipes_updated.push($scope.food[foods_used[i].food].recipes_used_in[j]);
            }
          }
        }
        // check servings to update 
        for (i = 0; i < $scope.board_data.lists.length; i++) {
          for (j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
            if (recipes_updated.indexOf($scope.board_data.lists[i].cards[j].recipe_ref) !== -1) {
              $scope.board_data.lists[i].cards[j].servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
            }
          }
        }
      }).error(function (err) {
        MessageService.handle_error(err);
      });
    };
    // check ingredient requirements
    function ingredients(food) {
      var num_food = food.length;
      var has_any_of_food = 0;
      var helpings = [];
      for (var i = 0; i < food.length; i++) {
        if ($scope.food[food[i].food].count > 0) {
          has_any_of_food++;
          helpings.push(Math.floor($scope.food[food[i].food].count / food[i].count));
        }
      }
      if (has_any_of_food === 0) {
        return -1;
      } else if (has_any_of_food < num_food) {
        return 0;
      } else {
        // reuse var as min helpings
        has_any_of_food = 1000000;
        for (i = 0; i < helpings.length; i++) {
          if (helpings[i] < has_any_of_food) {
            has_any_of_food = helpings[i];
          }
        }
        return has_any_of_food;
      }
    }
    // Prepare a snack for Munchkin (fun button)
    $scope.munchkin_snack = function () {
      var rand = Math.floor(Math.random() * $scope.recipes.length);
      FoodPrepService.new_food = $scope.recipes[rand].image;
      FoodPrepService.food_id = rand;
      $timeout(function () {
        rand = Math.floor(Math.random() * $scope.recipes.length);
        FoodPrepService.new_food = $scope.recipes[rand].image;
        FoodPrepService.food_id = rand;
      }, 1000 + 1000 * Math.random());
      $timeout(function () {
        rand = Math.floor(Math.random() * $scope.recipes.length);
        FoodPrepService.new_food = $scope.recipes[rand].image;
        FoodPrepService.food_id = rand;
      }, 2000 + 1000 * Math.random());
      $scope.achievement(2, 1);
    };
    // ############# Achievements ##################
    // Watch the Achievement Service for updates
    $scope.$watch(function () {
      return AchievementService.amount;
    }, function (newVal) {
      if (newVal !== 0) {
        $scope.achievement(AchievementService.id, AchievementService.amount);
        AchievementService.amount = 0;
      }
    });
    // post the achievement to the server and see if it results in a new unlock
    $scope.achievement = function (achievement_id, achievement_amount) {
      if (!$scope.achievements[achievement_id].unlocked) {
        $http.post('/achievement', {
          achievement: achievement_id,
          update: achievement_amount
        }).success(function (data) {
          if (data.achievement_unlocked >= 0) {
            $scope.achievements[data.achievement_unlocked].unlocked = true;
            MessageService.flash_achievement('Achievement Unlocked: ' + $scope.achievements[achievement_id].name, 4000);
            if ($scope.custom_board === 6) {
              // slide the card over if it's the Achievement Board (if the card is in the proper spot)
              var lock_list = $scope.board_data.lists[$scope.achievements[achievement_id].locked_list];
              var move_card = null;
              for (var i = 0; i < lock_list.cards.length; i++) {
                if (lock_list.cards[i].achievement_ref === achievement_id) {
                  move_card = lock_list.cards.splice(i, 1)[0];
                }
              }
              if (move_card !== null) {
                $scope.board_data.lists[4].cards.push(move_card);
              }
            }
          }
        }).error(function (err) {
        });
      }
    };
    // ########### Games ################
    // ########### Snake #############
    // check if a candy spawn is valid
    function notOKCandySpawn() {
      if ($scope.candy_x >= $scope.cat_x && $scope.candy_x < $scope.cat_x + $scope.cat_size && $scope.candy_y >= $scope.cat_y && $scope.candy_y < $scope.cat_y + $scope.cat_size || $scope.candy_x >= $scope.list_x && $scope.candy_x < $scope.list_x + $scope.list_size_x && $scope.candy_y >= $scope.list_y && $scope.candy_y < $scope.list_y + $scope.list_size_y) {
        return true;
      } else {
        for (var i = 0; i < $scope.wello_snake.length; i++) {
          if ($scope.candy_x === $scope.wello_snake[i].x && $scope.candy_y === $scope.wello_snake[i].y) {
            return true;
          }
        }
      }
      return false;
    }
    // Wello Snake game
    $scope.wello_snake_start = function () {
      if (!$scope.show_nibbles) {
        $scope.nibbles_cloak = true;
        $scope.achievement(13, 1);
        $scope.achievement(15, 1);
        MessageService.post('Wello Snake - Score: 0 (Top Score: ' + $scope.snake_top_score + ')');
        var return_board = $scope.board_data._id;
        BoardService.board_request = 'snake';
        BoardService.force = true;
        $scope.show_nibbles = true;
        BoardService.show_nibbles = true;
        $scope.obstacles = [];
        var cur_x = 40;
        var cur_y = 2;
        $scope.wello_snake = [{
            x: cur_x,
            y: cur_y
          }];
        $scope.x_dir = 1;
        $scope.y_dir = 0;
        $scope.snake_score = 0;
        var snake_speed = 70;
        var max_snake = 15;
        var cur_dir;
        var new_dir;
        var new_snake_cat;
        var new_snake_cat_color;
        var wello_colors = [
            'rgb(52, 178, 125)',
            'rgb(219, 219, 87)',
            'rgb(224, 153, 82)',
            'rgb(203, 77, 77)',
            'rgb(153, 51, 204)',
            'rgb(77, 119, 203)'
          ];
        // draw a 240x240 obstacle (cat) between 40-360y (4-12) and 40-450x (4-21)
        $scope.cat_x = 4 + Math.floor(Math.random() * 17);
        $scope.cat_y = 4 + Math.floor(Math.random() * 8);
        // 4+8+24+4
        $scope.snake_cat = '/modules/core/img/cats/' + Math.floor(Math.random() * 12) + '.jpg';
        var cur_snake_cat_color = Math.floor(Math.random() * 6);
        $scope.snake_cat_color = wello_colors[cur_snake_cat_color];
        $scope.cat_size = 24;
        // draw a 190x240 obstacle (list) between 
        $scope.list_x = 45 + Math.floor(Math.random() * 21);
        // 45+21+19+5
        $scope.list_y = 4;
        // 5+30+5
        $scope.list_size_x = 19;
        $scope.list_size_y = 33;
        $scope.candy_x = Math.floor(Math.random() * 90);
        $scope.candy_y = Math.floor(Math.random() * 40);
        while (notOKCandySpawn()) {
          $scope.candy_x = Math.floor(Math.random() * 90);
          $scope.candy_y = Math.floor(Math.random() * 40);
        }
        $timeout(function () {
          $scope.nibbles_cloak = false;
        }, 500);
        var tick = function () {
          $timeout(function () {
            if ($scope.dirq.length > 0) {
              new_dir = parseInt($scope.dirq.splice(0, 1));
              while (new_dir === cur_dir) {
                new_dir = parseInt($scope.dirq.splice(0, 1));
              }
              cur_dir = new_dir;
              if (cur_dir === 1 && $scope.y_dir !== 1) {
                $scope.x_dir = 0;
                $scope.y_dir = -1;
              } else if (cur_dir === 2 && $scope.x_dir !== -1) {
                $scope.x_dir = 1;
                $scope.y_dir = 0;
              } else if (cur_dir === 3 && $scope.y_dir !== -1) {
                $scope.x_dir = 0;
                $scope.y_dir = 1;
              } else if (cur_dir === 4 && $scope.x_dir !== 1) {
                $scope.x_dir = -1;
                $scope.y_dir = 0;
              }
            }
            cur_x += $scope.x_dir;
            cur_y += $scope.y_dir;
            $scope.wello_snake.push({
              x: cur_x,
              y: cur_y
            });
            if ($scope.wello_snake.length > 0) {
              if (cur_x === $scope.candy_x && cur_y === $scope.candy_y) {
                $scope.snake_score++;
                if ($scope.snake_score === 10) {
                  $scope.achievement(14, 1);
                } else if ($scope.snake_score === 20) {
                  $scope.achievement(16, 1);
                }
                if ($scope.snake_score > $scope.snake_top_score) {
                  $scope.snake_top_score = $scope.snake_score;
                }
                MessageService.post('Wello Snake - Score: ' + $scope.snake_score + ' (Top Score: ' + $scope.snake_top_score + ')');
                max_snake *= 1.2;
                snake_speed /= 1.08;
                while (notOKCandySpawn()) {
                  $scope.candy_x = Math.floor(Math.random() * 90);
                  $scope.candy_y = Math.floor(Math.random() * 40);
                }
                new_snake_cat = Math.floor(Math.random() * 12);
                while (new_snake_cat === $scope.snake_cat) {
                  new_snake_cat = Math.floor(Math.random() * 12);
                }
                $scope.snake_cat = '/modules/core/img/cats/' + new_snake_cat + '.jpg';
                new_snake_cat_color = Math.floor(Math.random() * 6);
                while (new_snake_cat_color === cur_snake_cat_color) {
                  new_snake_cat_color = Math.floor(Math.random() * 6);
                }
                cur_snake_cat_color = new_snake_cat_color;
                $scope.snake_cat_color = wello_colors[cur_snake_cat_color];
              } else if (cur_x < 0 || cur_x > 90 || cur_y < 0 || cur_y > 40 || cur_x >= $scope.cat_x && cur_x < $scope.cat_x + $scope.cat_size && cur_y >= $scope.cat_y && cur_y < $scope.cat_y + $scope.cat_size || cur_x >= $scope.list_x && cur_x < $scope.list_x + $scope.list_size_x && cur_y >= $scope.list_y && cur_y < $scope.list_y + $scope.list_size_y) {
                $scope.wello_snake = [];
                $scope.dirq = [];
                $timeout(function () {
                  $scope.show_nibbles = false;
                  $scope.nibbles_cloak = true;
                  BoardService.show_nibbles = false;
                  BoardService.board_request = return_board;
                  return;
                }, 600);
              } else {
                for (var i = 0; i < $scope.wello_snake.length - 1; i++) {
                  if (cur_x === $scope.wello_snake[i].x && cur_y === $scope.wello_snake[i].y) {
                    $scope.wello_snake = [];
                    $scope.dirq = [];
                    $timeout(function () {
                      $scope.show_nibbles = false;
                      $scope.nibbles_cloak = true;
                      BoardService.show_nibbles = false;
                      BoardService.board_request = return_board;
                      return;
                    }, 600);
                  }
                }
              }
              if ($scope.wello_snake.length > max_snake) {
                $scope.wello_snake.splice(0, 1);
                tick();
              } else if ($scope.wello_snake.length > 0 && $scope.show_nibbles) {
                tick();
              }
            }
          }, snake_speed);
        };
        tick();
      }
    };
    // ############ Card Breaker ##############
    // initialize cardbreaker
    $scope.wello_cardbreaker_start = function () {
      if (!$scope.show_cardbreaker) {
        $scope.cardbreaker_cloak = true;
        MessageService.post('Wello Card Breaker - Score: 0 (Top Score: ' + $scope.cardbreaker_top_score + ')');
        card_return_board = $scope.board_data._id;
        BoardService.board_request = 'cardbreaker';
        BoardService.force = true;
        $scope.show_cardbreaker = true;
        BoardService.show_cardbreaker = true;
        $timeout(function () {
          last_laser = card_anim_now = Date.now();
          $scope.dropping_food = [];
          $scope.ball_x = 200;
          cb_laser = false;
          $scope.ball_y = 350;
          cardbreaker_score = 0;
          ball_speed_x = -250;
          ball_speed_y = -250;
          cumulative_speed = 1;
          $scope.paddle_size = 100;
          $scope.cardbreaker_cloak = false;
          munchkin_size = 25;
          $scope.cb_lives = 3;
          cb_count = 15;
          $scope.lasers = [];
          $scope.cb_level = [
            [
              { labels: 2 },
              { labels: 1 },
              { labels: 2 }
            ],
            [
              { labels: 1 },
              { labels: 4 },
              { labels: 3 }
            ],
            [
              { labels: 1 },
              {
                labels: 6,
                name: 'SALAD = BAD'
              },
              { labels: 2 }
            ],
            [
              { labels: 1 },
              { labels: 4 },
              { labels: 3 }
            ],
            [
              { labels: 2 },
              { labels: 1 },
              { labels: 2 }
            ]
          ];
          init_cb_pos();
          animate_cardbreaker();
        }, 500);
      }
    };
    // initialize cardbreaker position
    function init_cb_pos() {
      for (var i = 0; i < $scope.cb_level.length; i++) {
        for (var j = 0; j < $scope.cb_level[i].length; j++) {
          $scope.cb_level[i][j].top = j * 42;
        }
      }
    }
    // move the cardbreaker paddle
    $scope.movepaddle = function (event) {
      if ($scope.show_cardbreaker) {
        $scope.paddle_x = event.offsetX || event.clientX - $(event.target).offset().left;
        if ($scope.paddle_x > 910 - $scope.paddle_size) {
          $scope.paddle_x = 910 - $scope.paddle_size;
        }
      }
    };
    // grab next animation frame
    function animate_cardbreaker() {
      render_cardbreaker();
      cardbreaker_animation = window.requestAnimationFrame(animate_cardbreaker);
    }
    // render loop for cardbreaker
    function render_cardbreaker() {
      $timeout(function () {
        card_anim_prev = card_anim_now;
        card_anim_now = Date.now();
        card_anim_elapsed = card_anim_now - card_anim_prev;
        for (var i = 0; i < $scope.dropping_food.length; i++) {
          $scope.dropping_food[i].top += 0.2 * card_anim_elapsed;
          if ($scope.dropping_food[i].top > 410) {
            $scope.dropping_food.splice(i, 1);
          } else if ($scope.dropping_food[i].top > 340) {
            if ($scope.paddle_x < $scope.dropping_food[i].left + 40 && $scope.paddle_x + $scope.paddle_size > $scope.dropping_food[i].left + 40) {
              if ($scope.dropping_food[i].type === 1) {
                $scope.cb_lives--;
                $scope.paddle_size = 100;
                $scope.ball_x = 200;
                $scope.ball_y = 350;
                cb_laser = false;
                ball_speed_x = -250 * cumulative_speed;
                ball_speed_y = -250 * cumulative_speed;
              } else if ($scope.dropping_food[i].type === 2) {
                cardbreaker_score += 10;
              } else if ($scope.dropping_food[i].type === 3) {
                cardbreaker_score += 20;
                $scope.paddle_size = 150;
              } else if ($scope.dropping_food[i].type === 4) {
                cardbreaker_score += 35;
                cb_laser = true;
                last_laser = Date.now();
              } else if ($scope.dropping_food[i].type === 6) {
                cardbreaker_score += 5;
              } else {
                cardbreaker_score += 50;
                $scope.cb_lives++;
              }
              if (cardbreaker_score > $scope.cardbreaker_top_score) {
                $scope.cardbreaker_top_score = cardbreaker_score;
              }
              $scope.dropping_food.splice(i, 1);
              MessageService.post('Wello Card Breaker - Lives: ' + $scope.cb_lives + ' Score: ' + cardbreaker_score + ' (Top Score: ' + $scope.cardbreaker_top_score + ')');
            }
          }
        }
        if (cb_laser && Date.now() > last_laser + 2000) {
          last_laser = Date.now();
          $scope.lasers.push({
            left: $scope.paddle_x + $scope.paddle_size / 2,
            top: 350
          });
        }
        for (i = 0; i < $scope.lasers.length; i++) {
          $scope.lasers[i].top -= 0.15 * card_anim_elapsed;
          if ($scope.lasers[i].top < -40) {
            $scope.lasers.splice(i, 1);
          }
        }
        ball_x_last = $scope.ball_x;
        ball_y_last = $scope.ball_y;
        $scope.ball_x += ball_speed_x * (card_anim_elapsed / 1000);
        $scope.ball_y += ball_speed_y * (card_anim_elapsed / 1000);
        card_collision = false;
        // check if collision with a card
        for (i = 0; i < $scope.cb_level.length; i++) {
          x_begin = i * 180;
          x_end = (i + 1) * 180;
          for (var j = 0; j < $scope.cb_level[i].length; j++) {
            y_begin = j * 40;
            y_end = (j + 1) * 40;
            for (var k = 0; k < $scope.lasers.length; k++) {
              if ($scope.lasers[k].left > x_begin && $scope.lasers[k].left < x_end && $scope.lasers[k].top < y_end) {
                $scope.lasers.splice(k, 1);
                $scope.cb_level[i][j].labels--;
                if ($scope.cb_level[i][j].labels > 0) {
                  if (Math.random() < 0.3) {
                    $scope.dropping_food.push({
                      top: y_end,
                      left: x_begin + 70,
                      type: 1,
                      image: 'modules/core/img/recipes/salad.png'
                    });
                  } else {
                    $scope.dropping_food.push({
                      top: y_end,
                      left: x_begin + 70,
                      type: 6,
                      image: 'modules/core/img/recipes/cheeseburger.png'
                    });
                  }
                }
                ball_speed_x *= 1.01;
                ball_speed_y *= 1.01;
                cumulative_speed *= 1.01;
              }
            }
            if (!card_collision && $scope.ball_x + munchkin_size > x_begin && $scope.ball_x - munchkin_size < x_end && $scope.ball_y + munchkin_size > y_begin && $scope.ball_y - munchkin_size < y_end && $scope.cb_level[i][j].labels > 0) {
              card_collision = true;
              $scope.cb_level[i][j].labels--;
              if ($scope.cb_level[i][j].labels > 0) {
                if (Math.random() < 0.3) {
                  $scope.dropping_food.push({
                    top: y_end,
                    left: x_begin + 70,
                    type: 1,
                    image: 'modules/core/img/recipes/salad.png'
                  });
                } else {
                  $scope.dropping_food.push({
                    top: y_end,
                    left: x_begin + 70,
                    type: 6,
                    image: 'modules/core/img/recipes/cheeseburger.png'
                  });
                }
              }
              ball_speed_x *= 1.01;
              ball_speed_y *= 1.01;
              cumulative_speed *= 1.01;
              if (ball_x_last - munchkin_size > x_end && $scope.ball_x - munchkin_size < x_end) {
                $scope.ball_x = ball_x_last;
                ball_speed_x *= -1;
              } else if (ball_x_last + munchkin_size < x_begin && $scope.ball_x + munchkin_size > x_begin) {
                $scope.ball_x = ball_x_last;
                ball_speed_x *= -1;
              } else {
                $scope.ball_y = ball_y_last;
                ball_speed_y *= -1;
              }
            }
            if ($scope.cb_level[i][j].labels === 0) {
              cb_count--;
              food_type = Math.random();
              if (food_type < 0.3) {
                food_type = 1;
                food_image = 'modules/core/img/recipes/salad.png';
              } else if (food_type < 0.8) {
                food_type = 2;
                food_image = 'modules/core/img/recipes/hotdog.png';
              } else if (food_type < 0.88) {
                // bigger paddle
                food_type = 3;
                food_image = 'modules/core/img/recipes/surfandturf.png';
              } else if (food_type < 0.96) {
                // laser 
                food_type = 4;
                food_image = 'modules/core/img/recipes/redbullvodka.png';
              } else {
                // extra life
                food_type = 5;
                food_image = 'modules/core/img/recipes/whiskey.png';
              }
              $scope.dropping_food.push({
                top: y_end,
                left: x_begin + 70,
                type: food_type,
                image: food_image
              });
              $scope.cb_level[i].splice(j, 1);
            }
          }
        }
        if ($scope.cb_lives === 0) {
          $scope.show_cardbreaker = false;
          $scope.cardbreaker_cloak = true;
          BoardService.show_cardbreaker = false;
          BoardService.board_request = card_return_board;
          window.cancelAnimationFrame(cardbreaker_animation);
        }
        if (!card_collision) {
          if ($scope.ball_x < munchkin_size) {
            ball_speed_x *= -1;
            $scope.ball_x = munchkin_size + 0.01;
          } else if ($scope.ball_x > 900 - munchkin_size) {
            ball_speed_x *= -1;
            $scope.ball_x = 899.99 - munchkin_size;
          } else if ($scope.ball_y < munchkin_size) {
            ball_speed_y *= -1;
            $scope.ball_y = munchkin_size + 0.01;
          } else if ($scope.ball_y > 380 - munchkin_size && $scope.ball_x + munchkin_size > $scope.paddle_x && $scope.ball_x - munchkin_size < $scope.paddle_x + $scope.paddle_size) {
            ball_speed_y *= -1;
            $scope.ball_y = 379 - munchkin_size;
            ball_flatness = ($scope.ball_x - $scope.paddle_size / 2 - $scope.paddle_x) * Math.PI / ($scope.paddle_size * 1.6);
            //alert(ball_flatness + ' = ' + Math.sin(ball_flatness))
            ball_speed = Math.sqrt(ball_speed_x * ball_speed_x + ball_speed_y * ball_speed_y);
            ball_speed_y = -ball_speed * Math.cos(ball_flatness);
            ball_speed_x = ball_speed * Math.sin(ball_flatness);
          } else if ($scope.ball_y > 400 - munchkin_size) {
            $scope.cb_lives--;
            $scope.ball_x = 200;
            $scope.ball_y = 350;
            ball_speed_x = -250 * cumulative_speed;
            ball_speed_y = -250 * cumulative_speed;
            cb_laser = false;
            $scope.paddle_size = 100;
            MessageService.post('Wello Card Breaker - Lives: ' + $scope.cb_lives + ' Score: ' + cardbreaker_score + ' (Top Score: ' + $scope.cardbreaker_top_score + ')');
          }
        }
        if (cb_count === 0) {
          $scope.cb_level = [
            [
              { labels: 6 },
              { labels: 3 },
              { labels: 1 },
              { labels: 1 },
              { labels: 1 }
            ],
            [
              { labels: 4 },
              { labels: 4 },
              { labels: 1 },
              { labels: 1 },
              { labels: 1 }
            ],
            [
              { labels: 6 },
              { labels: 5 },
              { labels: 1 },
              { labels: 1 },
              { labels: 6 }
            ],
            [
              { labels: 4 },
              { labels: 4 },
              { labels: 1 },
              { labels: 1 },
              { labels: 1 }
            ],
            [
              { labels: 6 },
              { labels: 3 },
              { labels: 1 },
              { labels: 1 },
              { labels: 1 }
            ]
          ];
          init_cb_pos();
          cb_count = 25;
          $scope.ball_x = 200;
          $scope.ball_y = 350;
          ball_speed_x = -250 * cumulative_speed;
          ball_speed_y = -250 * cumulative_speed;
        }
      });
    }
    // ####### Party Time ########
    // Play 52 Card Pickup (randomly shuffle cards everywhere)
    $scope.party_time = function () {
      if ($scope.is_party_time)
        return;
      if ($scope.custom_board !== 0) {
        MessageService.flash_disaster('You can\'t party on a special board, show some respect.', 3000);
        return;
      } else if ($scope.board_data.lists.length < 2) {
        if ($scope.board_data.lists.length === 0) {
          MessageService.flash_disaster('you had a party, but no lists showed up. =(', 2800);
          $timeout(function () {
            $scope.achievement(51, 1);
          }, 3000);
        } else {
          MessageService.flash_disaster('One list would be a lonely party.', 3000);
        }
        return;
      } else {
        var count = 0;
        for (var i = 0; i < $scope.board_data.lists.length; i++) {
          count += $scope.board_data.lists[i].cards.length;
        }
        if (count < 2) {
          MessageService.flash_disaster('You have the lists, but you need some cards too.', 3000);
          return;
        }
      }
      MessageService.flash('Today\'s party game is: 52-Card Pickup!', 6000);
      $scope.achievement(17, 1);
      $('.list').each(function () {
        $(this).children('.scrollbar-dynamic').perfectScrollbar('destroy');
      });
      $scope.is_party_time = true;
      var party_count = 0;
      var max_party = 52;
      var party_timeout = 100;
      var rlist, rlist2;
      var rcard, rcard2;
      var movecard;
      var total_cards = 0;
      for (var i = 0; i < $scope.board_data.lists.length; i++) {
        total_cards += $scope.board_data.lists[i].cards.length;
      }
      if (total_cards === 0)
        return;
      (function party_on() {
        the_party = $timeout(function () {
          // randomly select an element
          rcard = Math.floor(Math.random() * total_cards);
          rlist = 0;
          for (var i = 0; i < $scope.board_data.lists.length; i++) {
            rlist += $scope.board_data.lists[i].cards.length;
            if (rlist >= rcard) {
              rlist = i;
              break;
            }
          }
          rcard = Math.floor(Math.random() * $scope.board_data.lists[rlist].cards.length);
          movecard = $scope.board_data.lists[rlist].cards[rcard];
          // move it to random dest
          rlist2 = rlist;
          while (rlist === rlist2) {
            rlist2 = Math.floor(Math.random() * $scope.board_data.lists.length);
          }
          rcard2 = Math.floor(Math.random() * $scope.board_data.lists[rlist].cards.length);
          $scope.board_data.lists[rlist2].cards.splice(rcard2, 0, movecard);
          $scope.board_data.lists[rlist].cards.splice(rcard, 1);
          party_count++;
          if (party_count > max_party) {
            $timeout.cancel(the_party);
            $timeout(function () {
              $scope.is_party_time = false;
            }, 1000);
            cleanup_party();
            return;
          } else {
            party_on();
          }
          for (i = 0; i < $scope.board_data.lists.length; i++) {
            for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
              if ($scope.board_data.lists[i].cards[j] === undefined) {
                $scope.board_data.lists[i].cards.splice(j, 1);
              }
            }
          }
        }, party_timeout);
      }());
    };
    // Party has ended, trigger clean up
    $scope.party_over = function () {
      if ($scope.is_party_time) {
        $timeout.cancel(the_party);
        $scope.is_party_time = false;
        cleanup_party();
        MessageService.revert();
      }
    };
    // Get the board to a better state after a party
    function cleanup_party() {
      for (var i = 0; i < $scope.board_data.lists.length; i++) {
        for (var j = 0; j < $scope.board_data.lists[i].cards.length; j++) {
          if ($scope.board_data.lists[i].cards[j] === undefined) {
            $scope.board_data.lists[i].cards.splice(j, 1);
          }
        }
      }
      $timeout(function () {
        $('.list').each(function () {
          $(this).children('.scrollbar-dynamic').scrollTop(0).perfectScrollbar({ suppressScrollX: true });
        });
      }, 1000);
      party_ended = true;
    }
    // ####### Misc #########
    // get an array of a certain size
    $scope.getLabelArr = function (num) {
      return new Array(num);
    };
  }
]);/**
 * Misc Directives
 */
// apply perfectScrollbar to an element
angular.module('core').directive('perfectScrollbar', [
  '$timeout',
  function ($timeout) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        $(element).perfectScrollbar();
        $timeout(function () {
          $(element).perfectScrollbar('update');
        }, 100);
      }
    };
  }
]);
// handle key clicks on an element
angular.module('core').directive('welloKeys', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs, controller) {
      $('html').on('keydown', function (event) {
        if (scope.show_nibbles) {
          switch (event.keyCode) {
          case 65:
            //left
            scope.dirq.push(4);
            break;
          case 87:
            //up
            scope.dirq.push(1);
            break;
          case 68:
            //right	        
            scope.dirq.push(2);
            break;
          case 83:
            //down	        
            scope.dirq.push(3);
            break;
          default:
            break;
          }
        }
        switch (event.keyCode) {
        case 27:
          //escape
          scope.hide_all();
          scope.$apply();
          break;
        default:
          break;
        }
      });
      $('html').on('mousedown', function (event) {
        scope.hide_all();
        scope.$apply();
      });
    }
  };
});
// use this directive to stop any control container from allowing a click to reach the body
// click handler and closing open containers (i.e. poor man's div blur handler)
angular.module('core').directive('killProp', function () {
  return {
    restrict: 'A',
    link: function (scope, element) {
      element.bind('mousedown', function (e) {
        e.stopPropagation();
      });
    }
  };
});
// ng-enter behavior for submitting via enter on inputs
angular.module('core').directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind('keydown keypress', function (event) {
      if (event.which === 13) {
        scope.$apply(function () {
          scope.$eval(attrs.ngEnter);
        });
        event.preventDefault();
      }
    });
  };
});
// Focus on element immediately
angular.module('core').directive('focusnow', function () {
  return function (scope, element) {
    element.focus();
  };
});//
// Copyright Kamil Pękala http://github.com/kamilkp
// angular-sortable-view v0.0.8 2014/07/15
//
/* bwells: slight edits to deconflict */
;
(function (window, angular) {
  'use strict';
  /* jshint eqnull:true */
  /* jshint -W041 */
  var module = angular.module('angular-sortable-view', []);
  module.directive('svRoot', [function () {
      function shouldBeAfter(elem, pointer, isGrid) {
        return isGrid ? elem.x - pointer.x < 0 : elem.y - pointer.y < 0;
      }
      function getSortableElements(key) {
        return ROOTS_MAP[key];
      }
      function removeSortableElements(key) {
        delete ROOTS_MAP[key];
      }
      var sortingInProgress;
      var ROOTS_MAP = Object.create(null);
      // window.ROOTS_MAP = ROOTS_MAP; // for debug purposes
      return {
        restrict: 'A',
        controller: [
          '$scope',
          '$attrs',
          '$interpolate',
          '$parse',
          function ($scope, $attrs, $interpolate, $parse) {
            var mapKey = $interpolate($attrs.svRoot)($scope) || $scope.$id;
            if (!ROOTS_MAP[mapKey])
              ROOTS_MAP[mapKey] = [];
            var that = this;
            var candidates;
            // set of possible destinations
            var $placeholder;
            // placeholder element
            var options;
            // sortable options
            var $helper;
            // helper element - the one thats being dragged around with the mouse pointer
            var $original;
            // original element
            var $target;
            // last best candidate
            var svOriginalNextSibling;
            // original element's original next sibling node
            var isGrid = false;
            var onSort = $parse($attrs.svOnSort);
            // ----- hack due to https://github.com/angular/angular.js/issues/8044
            $attrs.svOnStart = $attrs.$$element[0].attributes['sv-on-start'];
            $attrs.svOnStart = $attrs.svOnStart && $attrs.svOnStart.value;
            // -------------------------------------------------------------------
            var onStart = $parse($attrs.svOnStart);
            this.sortingInProgress = function () {
              return sortingInProgress;
            };
            if ($attrs.svGrid) {
              // sv-grid determined explicite
              isGrid = $attrs.svGrid === 'true' ? true : $attrs.svGrid === 'false' ? false : null;
              if (isGrid === null)
                throw 'Invalid value of sv-grid attribute';
            } else {
              // check if at least one of the lists have a grid like layout
              $scope.$watchCollection(function () {
                return getSortableElements(mapKey);
              }, function (collection) {
                isGrid = false;
                var array = collection.filter(function (item) {
                    return !item.container;
                  }).map(function (item) {
                    return {
                      part: item.getPart().id,
                      y: item.element[0].getBoundingClientRect().top
                    };
                  });
                var dict = Object.create(null);
                array.forEach(function (item) {
                  if (dict[item.part])
                    dict[item.part].push(item.y);
                  else
                    dict[item.part] = [item.y];
                });
                Object.keys(dict).forEach(function (key) {
                  dict[key].sort();
                  dict[key].forEach(function (item, index) {
                    if (index < dict[key].length - 1) {
                      if (item > 0 && item === dict[key][index + 1]) {
                        isGrid = true;
                      }
                    }
                  });
                });
              });
            }
            this.$moveUpdate = function (opts, mouse, svElement, svOriginal, svPlaceholder, originatingPart, originatingIndex) {
              var svRect = svElement[0].getBoundingClientRect();
              if (opts.tolerance === 'element')
                mouse = {
                  x: ~~(svRect.left + svRect.width / 2),
                  y: ~~(svRect.top + svRect.height / 2)
                };
              sortingInProgress = true;
              candidates = [];
              if (!$placeholder) {
                if (svPlaceholder) {
                  // custom placeholder
                  $placeholder = svPlaceholder.clone();
                  $placeholder.removeClass('ng-hide');
                } else {
                  // default placeholder
                  $placeholder = svOriginal.clone();
                  $placeholder.addClass('sv-visibility-hidden');
                  $placeholder.addClass('sv-placeholder');
                  $placeholder.css({
                    'height': svRect.height + 'px',
                    'width': svRect.width + 'px'
                  });
                }
                svOriginalNextSibling = svOriginal[0].nextSibling;
                svOriginal.after($placeholder);
                svOriginal[0].parentNode.removeChild(svOriginal[0]);
                svOriginal.removeClass('sv-visibility-hidden');
                // cache options, helper and original element reference
                $original = svOriginal;
                options = opts;
                $helper = svElement;
                onStart($scope, {
                  $helper: $helper,
                  $part: originatingPart.model(originatingPart.scope),
                  $index: originatingIndex,
                  $item: originatingPart.model(originatingPart.scope)[originatingIndex]
                });
              }
              // ----- move the element
              $helper[0].reposition({
                x: mouse.x + document.body.scrollLeft - mouse.offset.x * svRect.width,
                y: mouse.y + document.body.scrollTop - mouse.offset.y * svRect.height
              });
              // ----- manage candidates
              getSortableElements(mapKey).forEach(function (se, index) {
                if (opts.containment != null) {
                  // TODO: optimize this since it could be calculated only once when the moving begins
                  if (!elementMatchesSelector(se.element, opts.containment) && !elementMatchesSelector(se.element, opts.containment + ' *'))
                    return;  // element is not within allowed containment
                }
                var rect = se.element[0].getBoundingClientRect();
                var center = {
                    x: ~~(rect.left + rect.width / 2),
                    y: ~~(rect.top + rect.height / 2)
                  };
                if (!se.container && (se.element[0].scrollHeight || se.element[0].scrollWidth)) {
                  // element is visible
                  candidates.push({
                    element: se.element,
                    q: (center.x - mouse.x) * (center.x - mouse.x) + (center.y - mouse.y) * (center.y - mouse.y),
                    view: se.getPart(),
                    targetIndex: se.getIndex(),
                    after: shouldBeAfter(center, mouse, isGrid)
                  });
                }
                if (se.container && !se.element[0].querySelector('[sv-element]:not(.sv-placeholder):not(.sv-source)')) {
                  // empty container
                  candidates.push({
                    element: se.element,
                    q: (center.x - mouse.x) * (center.x - mouse.x) + (center.y - mouse.y) * (center.y - mouse.y),
                    view: se.getPart(),
                    targetIndex: 0,
                    container: true
                  });
                }
              });
              var pRect = $placeholder[0].getBoundingClientRect();
              var pCenter = {
                  x: ~~(pRect.left + pRect.width / 2),
                  y: ~~(pRect.top + pRect.height / 2)
                };
              candidates.push({
                q: (pCenter.x - mouse.x) * (pCenter.x - mouse.x) + (pCenter.y - mouse.y) * (pCenter.y - mouse.y),
                element: $placeholder,
                placeholder: true
              });
              candidates.sort(function (a, b) {
                return a.q - b.q;
              });
              candidates.forEach(function (cand, index) {
                if (index === 0 && !cand.placeholder && !cand.container) {
                  $target = cand;
                  cand.element.addClass('sv-candidate');
                  if (cand.after)
                    cand.element.after($placeholder);
                  else
                    insertElementBefore(cand.element, $placeholder);
                } else if (index === 0 && cand.container) {
                  $target = cand;
                  cand.element.append($placeholder);
                } else
                  cand.element.removeClass('sv-candidate');
              });
            };
            this.$drop = function (originatingPart, index, options) {
              if (!$placeholder)
                return;
              if (options.revert) {
                var placeholderRect = $placeholder[0].getBoundingClientRect();
                var helperRect = $helper[0].getBoundingClientRect();
                var distance = Math.sqrt(Math.pow(helperRect.top - placeholderRect.top, 2) + Math.pow(helperRect.left - placeholderRect.left, 2));
                var duration = +options.revert * distance / 200;
                // constant speed: duration depends on distance
                duration = Math.min(duration, +options.revert);
                // however it's not longer that options.revert
                [
                  '-webkit-',
                  '-moz-',
                  '-ms-',
                  '-o-',
                  ''
                ].forEach(function (prefix) {
                  if (typeof $helper[0].style[prefix + 'transition'] !== 'undefined')
                    $helper[0].style[prefix + 'transition'] = 'all ' + duration + 'ms ease';
                });
                setTimeout(afterRevert, duration);
                $helper.css({
                  'top': placeholderRect.top + document.body.scrollTop + 'px',
                  'left': placeholderRect.left + document.body.scrollLeft + 'px'
                });
              } else
                afterRevert();
              function afterRevert() {
                sortingInProgress = false;
                $placeholder.remove();
                $helper.remove();
                svOriginalNextSibling.parentNode.insertBefore($original[0], svOriginalNextSibling);
                candidates = void 0;
                $placeholder = void 0;
                options = void 0;
                $helper = void 0;
                $original = void 0;
                if ($target) {
                  $target.element.removeClass('sv-candidate');
                  var spliced = originatingPart.model(originatingPart.scope).splice(index, 1);
                  var targetIndex = $target.targetIndex;
                  if ($target.view === originatingPart && $target.targetIndex > index)
                    targetIndex--;
                  if ($target.after)
                    targetIndex++;
                  $target.view.model($target.view.scope).splice(targetIndex, 0, spliced[0]);
                  // sv-on-sort callback
                  if ($target.view !== originatingPart || index !== targetIndex)
                    onSort($scope, {
                      $partTo: $target.view.model($target.view.scope),
                      $partFrom: originatingPart.model(originatingPart.scope),
                      $item: spliced[0],
                      $indexTo: targetIndex,
                      $indexFrom: index
                    });
                  if (!$scope.$root.$$phase)
                    $scope.$apply();
                }
                $target = void 0;
              }
            };
            this.addToSortableElements = function (se) {
              getSortableElements(mapKey).push(se);
            };
            this.removeFromSortableElements = function (se) {
              var elems = getSortableElements(mapKey);
              var index = elems.indexOf(se);
              if (index > -1) {
                elems.splice(index, 1);
                if (elems.length === 0)
                  removeSortableElements(mapKey);
              }
            };
          }
        ]
      };
    }]);
  module.directive('svPart', [
    '$parse',
    function ($parse) {
      return {
        restrict: 'A',
        require: '^svRoot',
        controller: [
          '$scope',
          function ($scope) {
            $scope.$ctrl = this;
            this.getPart = function () {
              return $scope.part;
            };
            this.$drop = function (index, options) {
              $scope.$sortableRoot.$drop($scope.part, index, options);
            };
          }
        ],
        scope: true,
        link: function ($scope, $element, $attrs, $sortable) {
          if (!$attrs.svPart)
            throw new Error('no model provided');
          var model = $parse($attrs.svPart);
          if (!model.assign)
            throw new Error('model not assignable');
          $scope.part = {
            id: $scope.$id,
            element: $element,
            model: model,
            scope: $scope
          };
          $scope.$sortableRoot = $sortable;
          var sortablePart = {
              element: $element,
              getPart: $scope.$ctrl.getPart,
              container: true
            };
          $sortable.addToSortableElements(sortablePart);
          $scope.$on('$destroy', function () {
            $sortable.removeFromSortableElements(sortablePart);
          });
        }
      };
    }
  ]);
  module.directive('svElement', [
    '$parse',
    function ($parse) {
      return {
        restrict: 'A',
        require: [
          '^svPart',
          '^svRoot'
        ],
        controller: [
          '$scope',
          function ($scope) {
            $scope.$ctrl = this;
          }
        ],
        link: function ($scope, $element, $attrs, $controllers) {
          var sortableElement = {
              element: $element,
              getPart: $controllers[0].getPart,
              getIndex: function () {
                return $scope.$index;
              }
            };
          $controllers[1].addToSortableElements(sortableElement);
          $scope.$on('$destroy', function () {
            $controllers[1].removeFromSortableElements(sortableElement);
          });
          var handle = $element;
          handle.on('mousedown', onMousedown);
          $scope.$watch('$ctrl.handle', function (customHandle) {
            if (customHandle) {
              handle.off('mousedown', onMousedown);
              handle = customHandle;
              handle.on('mousedown', onMousedown);
            }
          });
          var helper;
          $scope.$watch('$ctrl.helper', function (customHelper) {
            if (customHelper) {
              helper = customHelper;
            }
          });
          var placeholder;
          $scope.$watch('$ctrl.placeholder', function (customPlaceholder) {
            if (customPlaceholder) {
              placeholder = customPlaceholder;
            }
          });
          var body = angular.element(document.body);
          var html = angular.element(document.documentElement);
          var moveExecuted;
          function onMousedown(e) {
            if ($controllers[1].sortingInProgress())
              return;
            if (e.button != 0)
              return;
            moveExecuted = false;
            var opts = $parse($attrs.svElement)($scope);
            opts = angular.extend({}, {
              tolerance: 'pointer',
              revert: 200,
              containment: 'html'
            }, opts);
            if (opts.containment) {
              var containmentRect = closestElement.call($element, opts.containment)[0].getBoundingClientRect();
            }
            var target = $element;
            var clientRect = $element[0].getBoundingClientRect();
            var clone;
            if (!helper)
              helper = $controllers[0].helper;
            if (!placeholder)
              placeholder = $controllers[0].placeholder;
            if (helper) {
              clone = helper.clone();
              clone.removeClass('ng-hide');
              clone.css({
                'left': clientRect.left + document.body.scrollLeft + 'px',
                'top': clientRect.top + document.body.scrollTop + 'px'
              });
              target.addClass('sv-visibility-hidden');
            } else {
              clone = target.clone();
              clone.addClass('sv-helper').css({
                'left': clientRect.left + document.body.scrollLeft + 'px',
                'top': clientRect.top + document.body.scrollTop + 'px',
                'width': clientRect.width + 'px'
              });
            }
            clone[0].reposition = function (coords) {
              var targetLeft = coords.x;
              var targetTop = coords.y;
              var helperRect = clone[0].getBoundingClientRect();
              var body = document.body;
              if (containmentRect) {
                if (targetTop < containmentRect.top + body.scrollTop)
                  // top boundary
                  targetTop = containmentRect.top + body.scrollTop;
                if (targetTop + helperRect.height > containmentRect.top + body.scrollTop + containmentRect.height)
                  // bottom boundary
                  targetTop = containmentRect.top + body.scrollTop + containmentRect.height - helperRect.height;
                if (targetLeft < containmentRect.left + body.scrollLeft)
                  // left boundary
                  targetLeft = containmentRect.left + body.scrollLeft;
                if (targetLeft + helperRect.width > containmentRect.left + body.scrollLeft + containmentRect.width)
                  // right boundary
                  targetLeft = containmentRect.left + body.scrollLeft + containmentRect.width - helperRect.width;
              }
              this.style.left = targetLeft - body.scrollLeft + 'px';
              this.style.top = targetTop - body.scrollTop + 'px';
            };
            var pointerOffset = {
                x: (e.clientX - clientRect.left) / clientRect.width,
                y: (e.clientY - clientRect.top) / clientRect.height
              };
            html.addClass('sv-sorting-in-progress');
            html.on('mousemove', onMousemove).on('mouseup', function mouseup(e) {
              html.off('mousemove', onMousemove);
              html.off('mouseup', mouseup);
              html.removeClass('sv-sorting-in-progress');
              if (moveExecuted)
                $controllers[0].$drop($scope.$index, opts);
            });
            // onMousemove(e);
            function onMousemove(e) {
              if (!moveExecuted) {
                $element.parent().prepend(clone);
                moveExecuted = true;
              }
              $controllers[1].$moveUpdate(opts, {
                x: e.clientX,
                y: e.clientY,
                offset: pointerOffset
              }, clone, $element, placeholder, $controllers[0].getPart(), $scope.$index);
            }
            if (!moveExecuted) {
              $element.parent().prepend(clone);
              moveExecuted = true;
            }
            $controllers[1].$moveUpdate(opts, {
              x: e.clientX,
              y: e.clientY,
              offset: pointerOffset
            }, clone, $element, placeholder, $controllers[0].getPart(), $scope.$index);
          }
        }
      };
    }
  ]);
  module.directive('svHandle', function () {
    return {
      require: '?^svElement',
      link: function ($scope, $element, $attrs, $ctrl) {
        if ($ctrl)
          $ctrl.handle = $element;
      }
    };
  });
  module.directive('svHelper', function () {
    return {
      require: [
        '?^svPart',
        '?^svElement'
      ],
      link: function ($scope, $element, $attrs, $ctrl) {
        $element.addClass('sv-helper').addClass('ng-hide');
        if ($ctrl[1])
          $ctrl[1].helper = $element;
        else if ($ctrl[0])
          $ctrl[0].helper = $element;
      }
    };
  });
  module.directive('svPlaceholder', function () {
    return {
      require: [
        '?^svPart',
        '?^svElement'
      ],
      link: function ($scope, $element, $attrs, $ctrl) {
        $element.addClass('sv-placeholder').addClass('ng-hide');
        if ($ctrl[1])
          $ctrl[1].placeholder = $element;
        else if ($ctrl[0])
          $ctrl[0].placeholder = $element;
      }
    };
  });
  angular.element(document.head).append(['<style>' + '.sv-helper{' + 'position: fixed !important;' + 'z-index: 99999;' + 'margin: 0 !important;' + '}' + '.sv-candidate{' + '}' + '.sv-placeholder{' + '}' + '.sv-sorting-in-progress{' + '-webkit-user-select: none;' + '-moz-user-select: none;' + '-ms-user-select: none;' + 'user-select: none;' + '}' + '.sv-visibility-hidden{' + 'visibility: hidden !important;' + 'opacity: 0 !important;' + '}' + '</style>'].join(''));
  function getPreviousSibling(element) {
    element = element[0];
    if (element.previousElementSibling)
      return angular.element(element.previousElementSibling);
    else {
      var sib = element.previousSibling;
      while (sib != null && sib.nodeType != 1)
        sib = sib.previousSibling;
      return angular.element(sib);
    }
  }
  function insertElementBefore(element, newElement) {
    var prevSibl = getPreviousSibling(element);
    if (prevSibl.length > 0) {
      prevSibl.after(newElement);
    } else {
      element.parent().prepend(newElement);
    }
  }
  var dde = document.documentElement, matchingFunction = dde.matches ? 'matches' : dde.matchesSelector ? 'matchesSelector' : dde.webkitMatches ? 'webkitMatches' : dde.webkitMatchesSelector ? 'webkitMatchesSelector' : dde.msMatches ? 'msMatches' : dde.msMatchesSelector ? 'msMatchesSelector' : dde.mozMatches ? 'mozMatches' : dde.mozMatchesSelector ? 'mozMatchesSelector' : null;
  if (matchingFunction == null)
    throw 'This browser doesn\'t support the HTMLElement.matches method';
  function elementMatchesSelector(element, selector) {
    if (element instanceof angular.element)
      element = element[0];
    if (matchingFunction !== null)
      return element[matchingFunction](selector);
  }
  var closestElement = angular.element.prototype.closest || function (selector) {
      var el = this[0].parentNode;
      while (el !== document.documentElement && !el[matchingFunction](selector))
        el = el.parentNode;
      if (el[matchingFunction](selector))
        return angular.element(el);
      else
        return angular.element();
    };
}(window, window.angular));/**
 * Common Services
 */
// Performs capability and resize checking in order to display warnings when not using Chrome or an improper resolution
angular.module('core').service('CapabilityService', [
  '$timeout',
  function ($timeout) {
    var capability_check = {};
    var width, height;
    capability_check.check_capabilities = function (scope, w, h) {
      $timeout(function () {
        scope.width = w;
        scope.height = h;
        if (typeof window.orientation !== 'undefined' || navigator.userAgent.indexOf('IEMobile') !== -1) {
          scope.show_mobile = true;
        } else {
          scope.show_mobile = false;
          if (w < 1250) {
            scope.show_resolution_warning = 2;
          } else if (w < 1500 || w > 2100) {
            scope.show_resolution_warning = 1;
          } else {
            scope.show_resolution_warning = 0;
          }
          if (typeof window.chrome === 'object') {
            scope.show_browser_warning = 0;
          } else if (typeof InstallTrigger !== 'undefined') {
            scope.show_browser_warning = 1;
          } else if (document.body.style.msScrollLimit !== undefined) {
            scope.show_browser_warning = 1;
          } else {
            scope.show_browser_warning = 2;
          }
        }
      });
    };
    capability_check.init_capability_check = function (scope) {
      height = $(window).height();
      // New height
      width = $(window).width();
      // New width
      $(window).resize(function () {
        // This will execute whenever the window is resized
        height = $(window).height();
        // New height
        width = $(window).width();
        // New width
        capability_check.check_capabilities(scope, width, height);
      });
      capability_check.check_capabilities(scope, width, height);
    };
    return capability_check;
  }
]);
// Simple service for passing the board data between sub views
angular.module('core').factory('BoardService', function () {
  return {
    data: [],
    update: 0,
    board_request: null,
    name: '',
    show_nibbles: false,
    show_cardbreaker: false,
    force: false,
    custom_board: 0
  };
});
// Simple service for passing food (and achievement) data between sub views
angular.module('core').factory('FoodService', function () {
  return {
    food: [],
    recipes: [],
    achievements: [],
    update: 0
  };
});
// Simple service for preparing food between the upper fridge panel and the fridge itself
angular.module('core').factory('FoodPrepService', function () {
  return {
    new_food: null,
    food_id: null
  };
});
// Simple service for capturing achievements emitted from other parts of the app
angular.module('core').factory('AchievementService', function () {
  var achieve = {
      id: -1,
      amount: 0
    };
  achieve.achievement = function (achievement_id, achievement_amount) {
    achieve.id = achievement_id;
    achieve.amount = achievement_amount;
  };
  return achieve;
});'use strict';
/**
 * User Module Routes
 */
// Client-Side Router
angular.module('users').config([
  '$stateProvider',
  function ($stateProvider) {
    // Users ui-router routing
    $stateProvider.state('signup', {
      url: '/signup',
      templateUrl: 'modules/users/views/signup.client.view.html'
    }).state('signin', {
      url: '/signin',
      templateUrl: 'modules/users/views/signin.client.view.html'
    }).state('signout', {
      url: '/signout',
      controller: function ($scope, $http, $location, Authentication) {
        $http.post('/auth/signout').success(function (response) {
          $scope.authentication = Authentication;
          $scope.authentication.user = null;
          $location.url('/singin');
        }).error(function (response) {
          $scope.error = response.message;
        });
      }
    }).state('signout_base', {
      url: '/signout_base',
      controller: function ($scope, $http, $location, Authentication) {
        $http.post('/auth/signout').success(function (response) {
          $scope.authentication = Authentication;
          $scope.authentication.user = null;
          $location.url('/fridge/base/auth');
        }).error(function (response) {
          $scope.error = response.message;
        });
      }
    });
  }
]);'use strict';
/**
 * User Module Controller
 */
// Controller
angular.module('users').controller('AuthenticationController', [
  '$scope',
  '$http',
  '$location',
  '$state',
  'Authentication',
  'MessageService',
  function ($scope, $http, $location, $state, Authentication, MessageService) {
    $scope.authentication = Authentication;
    // If user is signed in then redirect back home
    if ($scope.authentication.user)
      $location.path('/home');
    // Signup for Wello
    // Trello Authentication is handled through a direct get request to /auth/trello/ and then a redirect is issued on success
    $scope.signup = function (fridge) {
      $http.post('/auth/signup', $scope.credentials).success(function (response) {
        //If successful we assign the response to the global user model
        $scope.authentication.user = response;
        $state.go('fridge_' + (fridge || $scope.authentication.signincb));
      }).error(function (response) {
        $scope.error = response.message;
        MessageService.message = 'Error Signing Up!';
        MessageService.update++;
        MessageService.disaster = true;
        MessageService.to = 4000;
      });
    };
    // Signin to existing account
    $scope.signin = function (fridge) {
      $http.post('/auth/signin', $scope.credentials).success(function (response) {
        //If successful we assign the response to the global user model
        $scope.authentication.user = response;
        $state.go('fridge_' + (fridge || $scope.authentication.signincb));
      }).error(function (response) {
        $scope.error = response.message;
        MessageService.message = 'Error Signing In!';
        MessageService.update++;
        MessageService.disaster = true;
        MessageService.to = 4000;
      });
    };
  }
]);'use strict';
/**
 * User Services
 */
// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', [
  '$resource',
  function ($resource) {
    return $resource('users', {}, { update: { method: 'PUT' } });
  }
]);
// Authentication service for user variables
angular.module('users').factory('Authentication', function () {
  var _this = this;
  _this._data = {
    user: window.user,
    signincb: null
  };
  return _this._data;
});