/*jshint browser:true, jquery:true, devel:true*/
/*global etot*/

(function() {

	'use strict';

	// Usage: etot.init(viewportSelector, [ settings ])
	etot.init = function(viewportSelector) {

		// The bulk of the actual initialization happens in etot.events.ready()
		$(document).on('ready', etot.events.ready);
		$(window).on('resize', etot.events.resize);

		// Correct Modernizr's touch/no-touch test and allow override via query string
		if ($.browser.mobile || window.location.search.match(/mobile\=true/i)) {
			etot.touch = true;
			$('html.no-touch')
				.removeClass('no-touch')
				.addClass('touch');
		}
		else {
			etot.touch = false;
			$('html.touch')
				.removeClass('touch')
				.addClass('no-touch');
		}

		if (arguments.length > 1 && typeof arguments[1] === 'object') {
			etot.settings = arguments[1];
		}
		else {
			etot.settings = {
				mousewheelMultiplier: 1,
				introThreshold: 0,
				noElasticSelector: '#stop-elastic-scrolling'
			};
		}
		
		// If we decide to reuse this code and put more than one parallax on a page,
		// etot would need to become an array to maintain separate states and variables
		etot.settings.viewportSelector = viewportSelector;
		
	};
	
})();
