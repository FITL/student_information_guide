/*jshint browser:true, jquery:true, devel:true*/
/*global etot*/

// Anonymous, self-executing functions used here and elsewhere only to confine the scope of strict mode statements
(function() {

	'use strict';

	window.etot = {

		// The selector from etot.init(selector) (e.g. '#timeline')
		viewportSelector: null,
		
		// Set by the data-origin-x attribute of the viewport element ('left' | 'right')
		originX: null,
		
		// Set by mousewheelMultiplier in etot.init(selector, mousewheelMultiplier)
		mousewheelMultiplier: null,

		$window: $(window),
		$html: null,
		$body: null,
		$viewport: null,
		$scenes: null,
		$layers: null,
		$dollarsSaved: null,
		$energySaved: null,
		$thermsSaved: null

	};

	// Native modifications ala Sugar.js
	Number.prototype.bound = function(min, max) {
		if (arguments.length !== 2) {
			throw new Error('Expected two arguments');
		}
		else if (typeof min !== 'number' || typeof max !== 'number') {
			throw new TypeError('Expected both arguments to be numbers');
		}
		else if (this < min) {
			return min;
		}
		else if (this > max) {
			return max;
		}
		else {
			return this.valueOf();
		}
	};
	
})();
