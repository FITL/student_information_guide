/*jshint browser:true, jquery:true, devel:true*/
/*global etot*/

(function() {
	
	'use strict';

	etot.metrics = {

		// Measured in etot.events.ready()
		combinedWidth: 0,
		
		zoom: null,
		
		viewport: {
			width: null
		},
		
		noElastic: {
			height: null,
			width: null
		},
		
		scenes: [],
		
		scrubber: {
			width: null
		},
		
		handle: {
			width: null
		},
		
		ticker: {
			
			// Set by etot.events.ready()
			ranges: {},
			
			values: function(progress) {
				
				var rangeMin,
					rangeMax,
					percentInRange,
					adjustedValues,
					previousMaxValues;
					
				adjustedValues = {};
				previousMaxValues = {
					dollars: 0,
					energy: 0,
					therms: 0
				};
				
				// Measure progress with the far edge of the screen
				progress += etot.metrics.viewport.width;

				Object.keys(etot.metrics.ticker.ranges, function(rangeString, rangeValues) {
					
					rangeMin = rangeString.remove(/\-.*/).toNumber();
					rangeMax = rangeString.remove(/^[\d\.]*\-/).toNumber();
					
					// Be inclusive and let the markup values dictate what to exclude
					if (rangeMin <= progress) {
						
						if (progress <= rangeMax) {
						
							percentInRange = (progress - rangeMin) / (rangeMax - rangeMin);
						
							// Assume that the range values are running totals, in which case we have to adjust
							Object.keys(rangeValues, function(name, value) {
								// Progress this year
								adjustedValues[name] = (rangeValues[name] - previousMaxValues[name]) * percentInRange;
								// All time progress
								adjustedValues[name] += previousMaxValues[name];
							});

						}
						
						previousMaxValues = rangeValues;
						
					}
					
				});
				
				return adjustedValues;
												
			}
			
		},
		
		// This method needs to be divided in two: one method that can run by itself and one that requires help from etot.events.ready()
		measure: function() {

			var $scene,
				$layer;

			etot.metrics.zoom = etot.$body.css('zoom');
			
			// Assume that if the zoom CSS attribute can't be queried, it isn't supported
			etot.metrics.zoom = etot.metrics.zoom ? etot.metrics.zoom.toNumber() : 1;
			
			etot.metrics.viewport.width = etot.$viewport.width();
			
			etot.metrics.scenes = $(etot.settings.sceneSelector).map(function(index, scene) {
				
				$scene = $(scene);
				
				return {
					
					$: $scene,
					name: $scene.attr('class').remove(etot.settings.sceneSelector.remove('.')).remove('year').trim(),
					year: $scene.attr('data-year') ? $scene.attr('data-year').toNumber() : null,
					width: $scene.width(),
					
					// Set by etot.state.goToPixel()
					inView: false,
					
					// Set by etot.events.ready()
					progress: (function() {
						if (etot.metrics.scenes[index]) {
							return etot.metrics.scenes[index].progress;
						}
						else {
							return {
								start: null,
								end: null
							};
						}
					})(),
					
					layers: $scene.children(etot.settings.layerSelector).map(function(index, layer) {
						
						$layer = $(layer);
						
						if (!$layer.attr('data-rate')) {
							if ($layer.attr('id')) {
								throw new Error('#' + $layer.attr('id') + ' has no data-rate attribute.');
							}
							else {
								throw new Error('A layer without an ID was supplied without a data-rate attribute.');
							}
						}
						
						return {
							$: $layer,
							name: $layer.attr('class').remove(etot.settings.layerSelector.remove('.')).trim(),
							rate: $layer.attr('data-rate').toNumber()
						};
						
					})
					
				};
				
			});
			
			etot.metrics.noElastic.height = etot.$noElastic.height();
			etot.metrics.noElastic.width = etot.$noElastic.width();
			etot.metrics.scrubber.width = etot.$scrubber.width();
			etot.metrics.handle.width = etot.$handle.width();
			
		},
		
		progressToPercent: function(pixels) {
			return pixels / (etot.metrics.combinedWidth - etot.metrics.viewport.width);
		},

		percentProgressToPixels: function(percent) {
			return percent * (etot.metrics.combinedWidth - etot.metrics.viewport.width);
		},

		nearestLeadIn: function(progressPercent) {

			var progressPixels,
			nearestLeadInPixels,
			distanceInPixels;

			progressPixels = etot.metrics.percentProgressToPixels(progressPercent);
			nearestLeadInPixels = Infinity;

			distanceInPixels = function(sceneStart) {
				return (progressPixels - sceneStart).abs();
			};

			etot.metrics.scenes.each(function() {
				if (this.name === 'lead-in' && distanceInPixels(this.progress.start) < distanceInPixels(nearestLeadInPixels)) {
					nearestLeadInPixels = this.progress.start;
				}
			});
			
			return etot.metrics.progressToPercent(nearestLeadInPixels);

		}

	};
	
})();