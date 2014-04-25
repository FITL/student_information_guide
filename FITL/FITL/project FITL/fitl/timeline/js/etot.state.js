/*jshint browser:true, jquery:true, devel:true*/
/*global etot*/

(function() {
	
	'use strict';

	etot.state = {
		
		modal: false,

		swipe: {
			ing: false,
			startX: null,
			progressOffset: null
		},
		
		ticker: {
			dollars: 0,
			energy: 0,
			therms: 0,
			set: function(statistics) {
				Object.keys(statistics, function(name, value) {
					etot.state.ticker[name] = value;
				});
				etot.$dollarsSaved.text(etot.state.ticker.dollars.round().format());
				etot.$energySaved.text(etot.state.ticker.energy.round(2).format(2));
				etot.$thermsSaved.text(etot.state.ticker.therms.round().format());
			}
		},
		
		progress: {
			
			inPixels: 0,
			
			percent: function() {
				return etot.metrics.progressToPercent(etot.state.progress.inPixels);
			},

			log: [0],
			
			isForward: true,
			
			goToPixel: function(x /*, syncScrubber */) {

				var syncScrubber,
					maxProgress,
					previousSceneWidths = 0,
					sceneOffset,
					layerOffset,
					sceneFarEdge,
					nearEdgeBeyondViewport,
					farEdgePastOrigin,
					stageLeftOrRight;
				
				// Temporary work-around for a Windows Chrome SVG rendering bug that occurs when scrubbing with zoom
				$('#chrome-svg-bug-work-around').show();

				maxProgress = etot.metrics.combinedWidth - etot.metrics.viewport.width;
				if (x.bound(0, maxProgress) === etot.state.progress.inPixels) {
					return;
				}

				syncScrubber = arguments.length > 1 && arguments[1] === false ? false : true;
				etot.state.progress.inPixels = x.bound(0, maxProgress);
				etot.state.ticker.set(etot.metrics.ticker.values(etot.state.progress.inPixels));
				
				etot.state.progress.log.unshift(etot.state.progress.inPixels);
				if (etot.state.progress.log.length > etot.settings.progressLogLimit) {
					etot.state.progress.log.pop();
				}
				
				etot.state.progress.isForward = etot.state.progress.log.length > 1 && etot.state.progress.log[0] < etot.state.progress.log[1] ? false : true;
				
				etot.metrics.scenes.each(function(sceneIndex, scene) {
					
					sceneOffset = previousSceneWidths - etot.state.progress.inPixels;

					// IE 9 rounds fractions of pixels instead of interpolating or finding their mathematical floor, which leaves intermittent gaps between tiled backgrounds
					// ...but since we're not tiling backgrounds for now, let's save some cycles by commenting this out
					// sceneOffset = sceneOffset.floor();
					
					scene.$.css(etot.originX, sceneOffset + 'px');
					
					sceneFarEdge = sceneOffset + etot.metrics.scenes[sceneIndex].width;
					nearEdgeBeyondViewport = sceneOffset >= etot.metrics.viewport.width;
					farEdgePastOrigin = sceneFarEdge < 0;
					
					// Scene visible in viewport. Apply parallax effect.
					if (!nearEdgeBeyondViewport && !farEdgePastOrigin) {

						if (!scene.inView) {
							scene.inView = true;
							stageLeftOrRight = etot.state.progress.isForward ? etot.farX : etot.originX;
							scene.$.trigger('enter', stageLeftOrRight);
						}
						
						scene.layers.each(function(layerIndex, layer) {

							layerOffset = sceneOffset * (1 - layer.rate);
							layerOffset = layerOffset.floor();

							layer.$.css(etot.originX, (0 - layerOffset) + 'px');

						});

					}
					else if (scene.inView) {
						scene.inView = false;
						stageLeftOrRight = etot.state.progress.isForward ? etot.originX : etot.farX;
						scene.$.trigger('exit', stageLeftOrRight);
					}
					
					previousSceneWidths += scene.width;
					
				});
				
				if (syncScrubber) {
					etot.state.scrub.to(etot.state.progress.percent());
				}

				// Temporary work-around for a Windows Chrome SVG rendering bug that occurs when scrubbing with zoom
				$('#chrome-svg-bug-work-around').hide();

			},
			
			goToPercent: function(percentage) {
				
				etot.state.progress.goToPixel(percentage * (etot.metrics.combinedWidth - etot.metrics.viewport.width));
				
			},

			// In pixels
			adjust: function(adjustment) {

				var maxProgress = etot.metrics.combinedWidth - etot.metrics.viewport.width;
				etot.state.progress.goToPixel((etot.state.progress.inPixels + adjustment).bound(0, maxProgress));

			}
			
		},
		
		scrub: {
			
			ing: false,
			pressOffset: null,
			
			to: function(percentage /*, needsSync, isAnimated */) {
				
				var needsSync = arguments.length > 1 && arguments[1] === true ? true : false,
					isAnimated = arguments.length > 2 && arguments[2] === true ? true : false,
					handleAnimation = {
						properties: {},
						options: {}
					},
					progressAnimation = {
						properties: {},
						options: {}
					};
				
				if (isAnimated) {
					
					if (etot.state.swipe.ing || etot.state.scrub.ing) {
						return;
					}

					etot.state.scrub.ing = true;
					
					handleAnimation.properties[etot.originX] = percentage * 100 + '%';
					progressAnimation.properties.width = percentage * 100 + '%';
					
					handleAnimation.options.duration = etot.settings.scrubSlideDurationMs;
					progressAnimation.options.duration = etot.settings.scrubSlideDurationMs;
					
					handleAnimation.options.complete = function() {
						etot.state.scrub.ing = false;
					};
					
					if (needsSync) {
						handleAnimation.options.step = function(stepPercent) {
							etot.state.progress.goToPercent(stepPercent / 100);
						};					
					}
					
					etot.$handle.animate(handleAnimation.properties, handleAnimation.options);
					etot.$progress.animate(progressAnimation.properties, progressAnimation.options);
					
				}
				
				else {
					
					etot.$handle.css(etot.originX, percentage * 100 + '%');
					etot.$progress.css('width', percentage * 100 + '%');
					
					if (needsSync) {
						etot.state.progress.goToPercent(percentage);
					}
					
				}
				
			}
			
		},
		
		
		animations: {

			2001: {
				
				timeouts: [],
				
				start: function() {

					var $waveArea = $('#waves-2001'),
						fadeInInstantly;
					
					$waveArea.find('.wave').each(function(waveNumber) {
						fadeInInstantly = waveNumber % 3 === 0 ? true : false;
						etot.state.animations.waveFade($(this), $waveArea, 2001, fadeInInstantly);
					});
					
				},
				
				stop: function() {
					
					etot.state.animations[2001].timeouts.each(function(timeoutId) {
						clearTimeout(timeoutId);
					});
					
				}
				
			},
			
			2002: {
				
				timeouts: [],
				
				start: function() {

					var $waveArea = $('#waves-2002'),
						fadeInInstantly;
					
					$waveArea.find('.wave').each(function(waveNumber) {
						fadeInInstantly = waveNumber % 3 === 0 ? true : false;
						etot.state.animations.waveFade($(this), $waveArea, 2002, fadeInInstantly);
					});
					
				},
				
				stop: function() {
					
					etot.state.animations[2002].timeouts.each(function(timeoutId) {
						clearTimeout(timeoutId);
					});
					
				}
				
			},
			
			2004: {
				
				timeouts: [],
				
				start: function() {

					var $waveArea = $('#waves-2004-1, #waves-2004-2, #waves-2004-3'),
						fadeInInstantly;
					
					$waveArea.find('.wave').each(function(waveNumber) {
						fadeInInstantly = waveNumber % 3 === 0 ? true : false;
						etot.state.animations.waveFade($(this), $(this).parent(), 2002, fadeInInstantly);
					});
					
				},
				
				stop: function() {
					
					etot.state.animations[2002].timeouts.each(function(timeoutId) {
						clearTimeout(timeoutId);
					});
					
				}
				
			},
			
			2006: {

                timeouts: [],

                start: function() {
					$('#timeline .scene.beach .layer.midground .dolphin_box img').addClass('engage');
                },

                stop: function() {
					$('#timeline .scene.beach .layer.midground .dolphin_box img').addClass('engage');
                }

            },
			
			2008: {
				
				timeouts: [],
				
				start: function() {

					var $waveArea = $('#waves-2008'),
						fadeInInstantly;
					
					$waveArea.find('.wave').each(function(waveNumber) {
						fadeInInstantly = waveNumber % 3 === 0 ? true : false;
						etot.state.animations.waveFade($(this), $waveArea, 2008, fadeInInstantly);
					});
					
				},
				
				stop: function() {
					
					etot.state.animations[2008].timeouts.each(function(timeoutId) {
						clearTimeout(timeoutId);
					});
					
				}
				
			},
			
			2010: {
				
				timeouts: [],
				
				start: function() {

					var $waveArea = $('#waves-2010-1, #waves-2010-2'),
						fadeInInstantly;
					
					$waveArea.find('.wave').each(function(waveNumber) {
						fadeInInstantly = waveNumber % 3 === 0 ? true : false;
						etot.state.animations.waveFade($(this), $(this).parent(), 2010, fadeInInstantly);
					});
					
				},
				
				stop: function() {
					
					etot.state.animations[2010].timeouts.each(function(timeoutId) {
						clearTimeout(timeoutId);
					});
					
				}
				
			},
			
			waveFade: function($wave, $waveArea, year, fadeInInstantly) {
				
				var timeoutId,
					loop,
					animation;
					
				loop = function() {
					
					var rangeMin = fadeInInstantly ? 0 : arguments[0] || 5000,
						rangeMax = fadeInInstantly ? 1000 : arguments[1] || 12000;
					
					timeoutId = setTimeout(animation, Number.random(rangeMin, rangeMax));
					etot.state.animations[year].timeouts.push(timeoutId);

				};

				animation = function() {

					etot.state.animations[year].timeouts.remove(timeoutId);

					$wave
						.css('left', Number.random(0, $waveArea.width() - $wave.width()) + 'px')
						.css('top', Number.random(0, $waveArea.height() - $wave.height()) + 'px')
						.fadeIn(2000, function() {
							$wave.fadeOut(2000, loop);
						});

				};

				loop(0, 12000);
				
			}
		}

	};

})();
