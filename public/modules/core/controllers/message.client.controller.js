'use strict';
/*global $:false */

/**
 * Message Service and Controller for the Fridge "Status LCD"
 */

// The service for passing new messages to the status panel
// "post" = persistent message
// "flash" = temporary message
angular.module('core').factory('MessageService', ['$timeout', function ($timeout) {
	var msg_service = {message:'',to:-1,defmes:null,update:0,disaster:false,success:false,achievement:false,disaster_type:null};
	// Write errors to the fridge "LED display"
	msg_service.handle_error = function(err) {
		$timeout(function(){
			if ( typeof err.message === 'undefined' ) {
				msg_service.flash_disaster('Unable to connect to server.',3000);					
			} else {
				msg_service.flash_disaster(err.message,3000);			
			}		
		});
	}	
	// post a regular message
	msg_service.post = function(msg) {
		msg_service.message = msg;
		msg_service.update++;
		msg_service.disaster = false;
		msg_service.success = false;
		msg_service.disaster_type = null;
		msg_service.to = -1;
		msg_service.achievement = false;		
	};
	// flash a message with a timeout and optionally a default message to revert to
	function flash_to(msg,to,defmes) {
		msg_service.message = msg;
		msg_service.update++;
		msg_service.disaster_type = null;
		msg_service.to = to;		
		if ( typeof defmes !== 'undefined' ) {
			msg_service.defmes = defmes;
		} else {
			msg_service.defmes = null;
		}	
	}
	// flash a regular message
	msg_service.flash = function(msg,to,defmes) {
		msg_service.disaster = false;
		msg_service.success = false;
		msg_service.achievement = false;		
		flash_to(msg,to,defmes);
	};	
	// flash a disaster message
	msg_service.flash_disaster = function(msg,to,defmes) {
		msg_service.disaster = true;
		msg_service.success = false;
		msg_service.achievement = false;		
		flash_to(msg,to,defmes);
	};	
	// flash a success message
	msg_service.flash_success = function(msg,to,defmes) {
		msg_service.disaster = false;
		msg_service.success = true;
		msg_service.achievement = false;	
		flash_to(msg,to,defmes);
	};	
	// flash an achievement message
	msg_service.flash_achievement = function(msg,to) {
		msg_service.disaster = false;
		msg_service.success = false;
		msg_service.achievement = true;
		flash_to(msg,to);
	};	
	// post a disaster message that will stay until specifically removed
	// only new disasters will be displayed until this is corrected			
	msg_service.add_disaster = function(msg,type) {
		msg_service.message = msg;
		msg_service.update++;
		msg_service.disaster = true;
		msg_service.success = false;
		msg_service.achievement = false;		
		msg_service.disaster_type = type;
		msg_service.to = -1;
	};	
	// remove an existing disaster lock
	msg_service.remove_disaster = function(msg,type) {
		msg_service.message = msg;
		msg_service.update++;
		msg_service.disaster = false;
		msg_service.success = false;
		msg_service.achievement = false;		
		msg_service.disaster_type = type;
		msg_service.to = -1;
	};	
	// revert to previous state
	msg_service.revert = function() {
		msg_service.message = null;
		msg_service.update++;
		msg_service.disaster = false;
		msg_service.success = false;
		msg_service.achievement = false;		
		msg_service.disaster_type = null;
		msg_service.to = -1;
	};	

	return msg_service;
}]);

// Controller
// The most important aspect to note is that disaster messages 'overpower' any other type of message
angular.module('core').controller('MessageController', ['$scope', '$timeout', 'Authentication', 'BoardService', 'MessageService',
	function($scope, $timeout, Authentication, BoardService, MessageService) {
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
			if ( $scope.message !== txt ) {
				var div=$('.status_anim');
				div.stop(true);
				div.animate({opacity:'0.0'},100);
				div.animate({opacity:'1.0'},400);
				$timeout(function() { 
					$scope.message = txt; 
					$scope.disaster = disaster; 
					$scope.msg_success = msg_success; 
					$scope.msg_achievement = msg_achievement;
				},100);
			}
		}

		$scope.$watch(function () { return MessageService.update; }, function (newVal, oldVal) {
			var i;
	    	// if message is null, simply revert back to the default message 
	    	// unless the timeout is a disaster and this message is not
	    	if ( MessageService.message === null ) {
	    		if ( disaster === false || MessageService.disaster || timeout_disaster ) {
		    		$timeout.cancel(mto);
		    		if ( !root_disaster ) disaster = false;
		    		anim(def);
		    		mto = null;
	    		}
	    	} else {
	    		// if this message is a timeout
				if ( MessageService.to > 0 ) {
					// sink any non-disaster timeout if a disaster is currently visible
					if ( disaster && !MessageService.disaster && !MessageService.success ) return;
					// set a default message if it comes with the timeout event
					if ( MessageService.defmes !== null ) {
						def = MessageService.defmes;
						MessageService.defmes = null;
					}
					// if this event is a disaster, make it visible
					if ( MessageService.disaster === true ) {
						disaster = true;
						msg_achievement = false;
						msg_success = false;												
					// success messages are only TOs
					} else if ( MessageService.achievement === true ) {
						disaster = false;
						msg_success = true;
						msg_achievement = true;
					} else if ( MessageService.success === true ) {
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
					mto_block = $timeout(function() {
						mto_block = null;
					},200);
					mto = $timeout(function() {
						// at the end of the timeout, create a new event to revert the status
						MessageService.message = null;
						MessageService.update++;
						// wipe disaster if there isn't a default disaster
						if ( !root_disaster) disaster = false;
						// always wipe success at the end of a timeout
						msg_success = false;
						msg_achievement = false;
						mto = null;
					},MessageService.to);
					// clear event variables
					MessageService.to = -1;
					MessageService.disaster = false;
					MessageService.success = false;
					MessageService.achievement = false;
				} else {
					// check to see if this event is setting or clearing a blocking disaster
					// (i.e. any disaster without a timeout)
					if ( MessageService.disaster_type !== null ) {
						// if this is a new disaster, then push it to active disasters
						if ( MessageService.disaster === true ) {
							found = false;
							for ( i = 0; i < active_disasters.length; i++ ) {
								if ( MessageService.disaster_type === active_disasters[i].dt ) {
									found = true;
								}
							}
							if ( !found ) {
								active_disasters.push({msg:MessageService.message,dt:MessageService.disaster_type});
							}
						// if this is clearing a disaster, check to remove it from active diasters
						} else {
							for ( i = 0; i < active_disasters.length; i++ ) {
								if ( active_disasters[i].dt === MessageService.disaster_type ) {
									active_disasters.splice(i,1);
									break;
								}
							}
						}
					}
					// enable or disable "root disaster" if any blocking disasters are set
					// "root disaster" dictates that no non-disaster may post to the status bar
					if ( active_disasters.length > 0 ) {
						root_disaster = true;
						// this may still be a recovery event if active_disasters was greater than 1
						// so reassign the current message to the first remaining active disaster
						// if the current event is not also a disaster						
						if ( MessageService.disaster === false ) {
							MessageService.disaster = true;
							MessageService.message = active_disasters[0].msg;
						}
					} else {
						root_disaster = false;
						// this event must be either not a disaster (including recovery events)
						// for root_disaster to be false
						if ( disaster ) disaster = false;
					}
					// at the very least, set this to be the default message if it's a disaster
					if ( MessageService.disaster === true ) {
						def = MessageService.message;
						// and force it to be the current message if there's currently not a disaster
						if ( disaster === false ) {
							msg_success = false;
							$timeout.cancel(mto);
							//$scope.message = def;
							anim(def);
							disaster = true;											
						}		
					// sink any non-disasters attempting to post during a blocking disaster				
					} else if ( root_disaster === true ) {
						return;
					// there will be no blocking disaster by this point
					// so the only disaster would be a timeout disaster
					// simply set the default message and wait if there is a timeout disaster
					} else {
						def = MessageService.message;
						if ( disaster === false && mto_block === null ) {
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
]);