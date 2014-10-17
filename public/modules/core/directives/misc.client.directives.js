/**
 * Misc Directives
 */

// apply perfectScrollbar to an element
angular.module('core').directive('perfectScrollbar', ['$timeout', function ($timeout) {
	return {
	    restrict: 'A',
	    link: function (scope, element) {
	    	$(element).perfectScrollbar();
	    	$timeout(function() {
	    		$(element).perfectScrollbar('update');
	    	},100);
	    }
	};
}]);

// handle key clicks on an element
angular.module('core').directive('welloKeys', function () {
	return {
	    restrict: 'A',
	    link: function (scope, element, attrs, controller) {
	        $('html').on('keydown', function (event) {
	        	if ( scope.show_nibbles ) {
		        	switch (event.keyCode) {
				        case 65: //left
					        scope.dirq.push(4);
				        	break;			        
				        case 87: //up
					        scope.dirq.push(1);
				        	break;		        
				        case 68: //right	        
			        		scope.dirq.push(2);
				        	break;			        
				        case 83: //down	        
			        		scope.dirq.push(3);
				        	break;
				        default:
				        	break;
			        }
		    	}
		    	switch (event.keyCode) {
		    		case 27: //escape
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
angular.module('core').directive('killProp', function() {
    return {
	    restrict: 'A',
	    link: function (scope, element) {
			element.bind('mousedown', function(e) {
				e.stopPropagation();
			});	
		}
    };      
});

// ng-enter behavior for submitting via enter on inputs
angular.module('core').directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind('keydown keypress', function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});

// Focus on element immediately
angular.module('core').directive('focusnow', function() {
    return function(scope,element) {
       element.focus();
    };   
});