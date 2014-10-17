'use strict';

/**
 * Weather Service for displaying the weather... or cats... for some reason
 */

// Controller
angular.module('core').controller('WeatherController', ['$scope', '$http', '$timeout', 'Authentication', 'MessageService', 'AchievementService',
	function($scope, $http, $timeout, Authentication, MessageService, AchievementService) {
		$scope.authentication = Authentication;		
		$scope.first_weather = true;

		// Update the default zipcode for the user
		$scope.updateZip = function() {		
			$http.post('/change_zip',{zip:$scope.new_zip}).success(function(){
				Authentication.user.zip = $scope.new_zip;
				$scope.loadWeather();
				$scope.editzip = false;
			});
		};

		// Display geographic information if successful; otherwise display Mars (for instance, zipcode '00000')
		// Also decide between displaying the weather if it's nice or cats
		function cat_messages(successful) {
			$scope.icon = '/modules/core/img/weather/'+$scope.icon;
			if ( $scope.first_weather === false ) {
				if ( successful ) {
					if ( $scope.country !== 'US' ) { /**/
						$timeout(function() {
							AchievementService.achievement(52,1);	
						},3000);				
					} else if ( $scope.city === 'New York' ) { /**/
						$timeout(function() {
							AchievementService.achievement(36,1);	
						},3000);
					}				
					if ( $scope.showcats === true ) {
						if ( $scope.temp >= 100.0 ) {
							achievement(33,1);	
							$timeout(function() {
								AchievementService.achievement(38,1);
							},6000);
						} else {
							AchievementService.achievement(38,1);	
						}
						MessageService.flash('The weather is not too great there, here is a cat.',3000);
					} else {
						MessageService.flash('The weather is pretty nice there today, no need for cats.',3000);		
						if ( $scope.temp >= 72.0 && $scope.temp < 73.0 && $scope.condition === 'Clear' ) { /**/
							achievement(34,1);	
							$timeout(function() {
								AchievementService.achievement(37,1);	
							},6000);
						} else {
							AchievementService.achievement(37,1);	
						}
					}
				} else {
					if ( $scope.state === 'Mars' ) { /**/
						MessageService.flash('Little dusty to say the least.',3000);	
						AchievementService.achievement(35,1);
					} else {
						MessageService.flash_disaster('Unable to load weather.',3000);	
					}				
				}
			}
			$scope.first_weather = false;
		}

		// Make a call to the backend which in turn geocodes the zipcode to a city, state, country via googleAPI and then runs that information against Open Weather Map for the weather
		$scope.loadWeather = function() {
			$scope.loadingweather = true;
			$scope.showcats = false;
			$scope.zip = Authentication.user.zip;

			$http.post('/weather',{zip:$scope.zip}).success(function(data) {
				$scope.state = data.state;
				$scope.country = data.country;
				$scope.city = data.city;
				$scope.temp = data.temp;
				$scope.condition = data.condition;
				$scope.icon = data.icon;
				var weather_id = data.weather_id;
				var weather_des = data.weather_des;

				if ( $scope.state === 'Mars' ) {
					$scope.showcats = true;				
					$scope.catmessage = 'Wello has no idea where you were trying to lookup, but they probably don\'t have that many cat pictures there.';
					$scope.loadingweather = false;		
					$scope.city = 'Soujourner\'s Grave';
					$scope.state = 'Mars';	
					$scope.cat =  '/modules/core/img/cats/'+Math.floor(Math.random()*11.999)+'.jpg';		
					cat_messages(false);	
				} else {
					if ( $scope.icon === '04n' || $scope.icon === '04d' || weather_id === 721 ) {
						$scope.icon = 'partly_cloudy.png';
						$scope.condition_text = 'Partly Cloudy';
					} else if ( $scope.icon === '01n' || $scope.icon === '01d' ) {
						$scope.icon = 'sunny.png';
						$scope.condition_text = 'Sunny';
					} else if ( $scope.icon === '02n' || $scope.icon === '02d' ) {
						$scope.icon = 'mostly_sunny.png';
						$scope.condition_text = 'Mostly Sunny';
					} else if ( $scope.icon === '03n' || $scope.icon === '03d' ) {
						$scope.icon = 'partly_cloudy.png';
						$scope.condition_text = 'Partly Cloudy';
					} else if ( $scope.icon === '09n' || $scope.icon === '09d' ) {
						$scope.icon = 'rainy.png';
						$scope.condition_text = 'Rainy';
					} else if ( $scope.icon === '10n' || $scope.icon === '10d' ) {
						$scope.icon = 'rainy.png';
						$scope.condition_text = 'Rainy';
					} else if ( $scope.icon === '11n' || $scope.icon === '11d' ) {
						$scope.icon = 'thunder_storm.png';
						$scope.condition_text = 'Thunder Storms';
					} else if ( $scope.icon === '13n' || $scope.icon === '13d' ) {
						$scope.icon = 'snowy.png';
						$scope.condition_text = 'Snowy';
					} else if ( $scope.icon === '50n' || $scope.icon === '50d' ) {
						$scope.icon = 'cloudy.png';
						$scope.condition_text = 'Cloudy';
					}
					if ( $scope.temp < 50.0 ) {
						$scope.showcats = true;
						$scope.catmessage = 'It\'s freezing outside in ' + $scope.city + ' at ' + $scope.temp + ' degrees.  No problem though, because cat pictures are inside.';
					} else if ( $scope.temp < 60.0 ) {
						$scope.showcats = true;
						$scope.catmessage = 'It\'s a little chilly in ' + $scope.city + ' at ' + $scope.temp + ' degrees, better look at some pictures of cats instead of worrying about the specifics.';
					} else if ( $scope.temp > 90.0 ) {
						$scope.showcats = true;
						$scope.catmessage = 'It\'s way too hot in ' + $scope.city + ' at ' + $scope.temp + ' degrees.  Instead of ruining your day by showing you exactly how hot, here are some cat pictures.';
					} else if ( $scope.condition === 'Clear' || $scope.condition === 'Clouds' || ( weather_id >= 905 && weather_id <= 955 ) || weather_id === 721 ) {
						$scope.showcats = false;
					} else {
						$scope.showcats = true;
						$scope.catmessage = 'Meh, the temperature outside is fine, but there is some nasty ' + weather_des + ' action going on out in ' + $scope.city + '.  Better stay in and look at cats.';
					}
					$scope.loadingweather = false;
					if ( $scope.showcats === true ) {
						$scope.cat = '/modules/core/img/cats/'+Math.floor(Math.random()*11.999)+'.jpg';
					}
					cat_messages(true);							
				}
			}).error(function(){
				$scope.showcats = true;
				$scope.catmessage = 'Wello has lost 100% of their fridge sales to piracy and the weather API was the first resultant budget cut, but not all is lost -- here are some cat pictures.';
				$scope.loadingweather = false;		
				$scope.city = '?????';
				$scope.state = '??';
				$scope.cat = '/modules/core/img/cats/'+Math.floor(Math.random()*11.999)+'.jpg';	
				cat_messages(false);			
			});

		};



	}
]);
