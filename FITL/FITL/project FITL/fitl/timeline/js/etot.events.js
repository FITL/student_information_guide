/*jshint browser:true, jquery:true, devel:true*/
/*global etot*/

(function() {
	
	'use strict';

	etot.events = {

		ready: function() {

			// Declare variables used in $.each() here rather than redeclaring them in every iteration
			var $background,
				$backgroundImg,
				sceneProgressStart;

			// Query once for commonly used DOM elements and attributes
			etot.$html = $('html');
			etot.$body = $('body');
			etot.$noElastic = $(etot.settings.noElasticSelector);
			etot.$viewport = $(etot.settings.viewportSelector);
			etot.$scenes = etot.$viewport.children('.scene');
			etot.$layers = etot.$scenes.children('.layer');
			etot.$scrubber = $(etot.settings.scrubberSelector);
			etot.$handle = etot.$scrubber.find(etot.settings.scrubberHandleSelector);
			etot.$progress = etot.$scrubber.find(etot.settings.scrubberProgressSelector);
			etot.$dollarsSaved = $(etot.settings.dollarsSavedSelector);
			etot.$energySaved = $(etot.settings.energySavedSelector);
			etot.$thermsSaved = $(etot.settings.thermsSavedSelector);
			etot.$footerYears = $(etot.settings.footerYearsSelector);
			etot.originX = etot.$viewport.attr('data-origin-x');
			etot.farX = etot.originX === 'left' ? 'right' : 'left';

			etot.metrics.measure();

			// Event delegation doesn't work with div scroll events
			etot.$noElastic.scroll(etot.events.scroll);

			etot.metrics.scenes.each(function(sceneIndex, scene) {
			
				// Position the scenes side-by-side
				scene.$.css(etot.originX, etot.metrics.combinedWidth);
				scene.progress.start = etot.metrics.combinedWidth;
				scene.progress.end = etot.metrics.combinedWidth += scene.width;
				
				// Load all the individual SVGs and the first 'tile' of each background
				scene.layers.each(function(layerIndex, layer) {

					$background = layer.$.children('.background').first().css('width', layer.width + 'px');

					if ($background && $background.attr('data-src')) {

						$backgroundImg = $(document.createElement('img'))
							.attr('src', $background.attr('data-src'))
							.css('position', 'absolute')
							.css($background.attr('data-origin-y'), 0)
							.appendTo($background);

						// Load event delegation doesn't appear to work on dynamically injected SVGs, so we use the deprecated $.bind()
						$backgroundImg.load(function() {

							var $firstTile = $(this),
								tileWidth = $firstTile.width(),
								tileCount = (layer.$.parent().width() / $firstTile.width()).ceil();

							// Now that we have something to measure, load the remaining background tiles
							(tileCount - 1).times(function(tileNumber) {
								$firstTile
									.clone()
									.css(etot.originX, tileWidth * (tileNumber + 1) + 'px')
									.appendTo($firstTile.parent());
							});

						});

					}
					
				});
				
				if (scene.$.is('[data-year]')) {
					sceneProgressStart = scene.progress.start;
					// Per Josh's request, include the lead-ins in the the ticker numbers
					if (sceneIndex > 1 && etot.metrics.scenes[sceneIndex - 1].$.is('.lead-in')) {
						sceneProgressStart -= etot.metrics.scenes[sceneIndex - 1].width;
					}
					etot.metrics.ticker.ranges[[sceneProgressStart, scene.progress.end].join('-')] = {
						dollars: scene.$.attr('data-dollars-saved').toNumber(),
						energy: scene.$.attr('data-energy-saved').toNumber(),
						therms: scene.$.attr('data-therms-saved').toNumber()
					};
				}
				
			});
			
			// Better to call the event handler directly than risk the call getting stuck in some event queue by triggering the event
			etot.events.resize();
						
		},
		
		scroll: function(event) {

			var scrollEnd,
				sceneSelector,
				handleSelector;
				
			if (etot.touch) {
				scrollEnd = etot.$noElastic.width() - etot.$noElastic.scrollLeft() <= etot.settings.introThreshold;
			}
			else {
				scrollEnd = etot.$noElastic.height() - etot.$noElastic.scrollTop() <= etot.settings.introThreshold;
			}

			// Is the intro div scrolled to the bottom?
			if (scrollEnd) {
				
				sceneSelector = etot.settings.viewportSelector + ' ' + etot.settings.sceneSelector;
				handleSelector = etot.settings.scrubberSelector + ' ' + etot.settings.scrubberHandleSelector;

				etot.$noElastic.unbind('scroll');
				$('#intro').remove();
				$('html.touch ' + etot.settings.viewportSelector).css('left', 0);
				
				// Event delegates for parallax
				$(window)
					.on('mousewheel', etot.events.mousewheel)
					.on('keyup', etot.events.bigstoryclose);
				$(document)
					.on('touchstart mousedown', sceneSelector, etot.events.pressstart)
					.on('touchmove mousemove', sceneSelector, etot.events.pressmove)
					.on('touchend mouseup', etot.events.pressend)
					.on('touchstart mousedown', handleSelector, etot.events.scrubstart)
					.on('touchmove mousemove', etot.events.scrubmove)
					.on('touchend mouseup', etot.events.scrubend)
					.on('touchstart mousedown', etot.settings.controlsSelector, etot.events.scrubpress)
					.on('touchstart mouseenter', etot.settings.iconStoryButtonSelector, etot.events.iconstoryopen)
					.on('touchstart mousedown', etot.settings.smallStorySelector, etot.events.smallstorytoggle)
					.on('touchstart mousedown', etot.settings.bigStorySelector, etot.events.bigstoryopen)
					.on('touchstart mousedown', etot.settings.modalSwitchSelector, etot.events.bigstoryswitch)
					.on('touchstart mousedown', etot.settings.modalCloseSelector, etot.events.bigstoryclose)
					.on('enter exit', etot.settings.sceneSelector, etot.events.scenechange);
				$(etot.settings.viewportSelector)
					.on('progresschange', etot.events.progresschange);
					
					setTimeout(function() {
						$('#timeline .scene.intro .copy .text div.intro-left').fadeIn();
					}, 250);
					
					setTimeout(function() {
						$('#timeline .scene.intro .copy .text div.intro-right').fadeIn();
					}, 500);
					
			}
			
		},

		mousewheel: function(event, delta) {
			
			if (etot.state.modal) {
				return;
			}
			
			event.preventDefault();
			delta *= etot.settings.mousewheelMultiplier;
			etot.state.progress.adjust(0 - delta);
			
		},

		pressstart: function(event) {
			
			// http://stackoverflow.com/questions/1206203/how-to-distinguish-between-left-and-right-mouse-click-with-jquery
			if (!etot.touch && event.which !== 1 || etot.state.modal) {
				return;
			}
			
			event.preventDefault();
			etot.state.swipe.ing = true;
			etot.$viewport.addClass('grabbing');
			
			if (event.type === 'touchstart') {
				etot.state.swipe.startX = event.originalEvent.touches.item(0).clientX;
			}
			else if (event.type === 'mousedown') {
				etot.state.swipe.startX = event.clientX;
			}
			
			etot.state.swipe.progressOffset = etot.state.progress.inPixels;

		},

		pressend: function(event) {
			
			event.preventDefault();
			etot.state.swipe.ing = false;
			etot.$viewport.removeClass('grabbing');
			
		},

		pressmove: function(event) {
			
			var clientX;
			
			if (!etot.state.swipe.ing || etot.state.scrub.ing) {
				return;
			}
			else if (event.type === 'touchmove') {
				clientX = event.originalEvent.touches.item(0).clientX;
			}
			else if (event.type === 'mousemove') {
				clientX = event.originalEvent.clientX;
			}

			etot.state.progress.goToPixel(etot.state.swipe.startX - clientX + etot.state.swipe.progressOffset);
			
		},
		
		scrubstart: function(event) {
			
			event.preventDefault();
			etot.state.scrub.ing = true;
			etot.$viewport.addClass('grabbing');
			
			if (!etot.touch && event.which !== 1 || etot.state.modal) {
				return;
			}

			if (event.type === 'touchstart') {
				etot.state.scrub.pressOffset = (etot.$handle.offset().left + (etot.$handle.width() / 2)) - event.originalEvent.touches.item(0).clientX;
			}
			else if (event.type === 'mousedown') {
				etot.state.scrub.pressOffset = (etot.$handle.offset().left + (etot.$handle.width() / 2)) - event.clientX;
			}
			
		},
		
		scrubend: function(event) {
			event.preventDefault();
			etot.state.scrub.ing = false;
			etot.$viewport.removeClass('grabbing');
		},
		
		scrubmove: function(event) {

			var clientX,
				percentage,
				scrubberOffset = etot.$scrubber.offset().left * etot.metrics.zoom,
				scrubberWidth = etot.$scrubber.width() * etot.metrics.zoom;

			if (!etot.state.scrub.ing) {
				return;
			}
			
			if (event.type === 'touchmove') {
				clientX = event.originalEvent.touches.item(0).clientX;
			}
			else if (event.type === 'mousemove') {
				clientX = event.originalEvent.clientX;
			}
			
			percentage = (clientX - scrubberOffset) / scrubberWidth;
			percentage = percentage.bound(0, 1);
			etot.state.scrub.to(percentage, true);

		},
		
		scrubpress: function(event) {

			var clientX,
				percentage,
				scrubberOffset = etot.$scrubber.offset().left * etot.metrics.zoom,
				scrubberWidth = etot.$scrubber.width() * etot.metrics.zoom;

			if (!etot.touch && event.which !== 1 || etot.state.modal) {
				return;
			}

			if (event.type === 'touchstart') {
				clientX = event.originalEvent.touches.item(0).clientX;
			}
			else if (event.type === 'mousedown') {
				clientX = event.originalEvent.clientX;
			}

			percentage = (clientX - scrubberOffset) / scrubberWidth;
			percentage = percentage.bound(0, 1);

			if ($(event.target).is(etot.settings.footerYearsSelector)) {
				// Fudge a little to the left to show that there's a previous scene
				percentage = etot.metrics.nearestLeadIn(percentage) - 0.005;
			}

			etot.state.scrub.to(percentage, true, true);

		},
		
		scenechange: function(event, stageLeftOrRight) {
			
			var $scene = $(this),
				year = $scene.attr('data-year'),
				triggerAnimation,
				$prevScene;

			triggerAnimation = function(startOrStop) {
				if (year && etot.state.animations[year]) {
					etot.state.animations[year][startOrStop]();
				}
			};
			
			if (event.type === 'enter') {
				$scene.addClass('in-view');
				triggerAnimation('start');
			}
			else {
				$scene.removeClass('in-view');
				triggerAnimation('stop');
			}
			
			// Assume that any scene that isn't a lead-in or the intro is a main year
			if (event.type === 'enter' && !$scene.hasClass('lead-in') && !$scene.hasClass('intro')) {
				$prevScene = stageLeftOrRight === 'right' ? $scene.prev() : $scene.next();
				if ($prevScene.find('.bubble.hidden').length) {
					// Let the touch event handler figure out how to display the icon
					$prevScene.find('.icons img').first().trigger('touchstart');
				}
			}
			
			if (event.type === 'enter' && $scene.find('.big.story').length) {
				setTimeout(function() {
					$scene.find('.big.story').fadeIn();
				}, 1000);
			}

		},
		
		iconstoryopen: function(event) {
			
			var $icon = $(this),
				$bubble = $icon.parents(etot.settings.sceneSelector).find(etot.settings.iconStorySelector),
				storyNumber = $icon.attr('class').split(' ').intersect('one', 'two', 'three'),
				iconstoryclose;

			$bubble.filter(':visible').addClass('hidden');

			$bubble = $bubble.filter('.' + storyNumber[0]);
			$bubble.removeClass('hidden');
			
			iconstoryclose = function(event) {
				$bubble.addClass('hidden');
				$bubble.off('mouseleave', iconstoryclose);
			};
			
			$icon.on('mouseleave', iconstoryclose);
						
		},
		
		smallstorytoggle: function(event) {
			
			var $target = $(event.target),
				$targetBubble = $target.parents(etot.settings.smallStorySelector);
			
			if (!etot.touch && event.which !== 1 || etot.state.modal) {
				return;
			}

			if ($targetBubble.hasClass('hidden')) {
				$(etot.settings.smallStorySelector + ':visible').addClass('hidden');
				$targetBubble.removeClass('hidden');
			}
			else {
				$targetBubble.addClass('hidden');
			}
			
		},
		
		bigstoryopen: function(event) {
			
			var animationProperties = {},
				animationOptions = {},
				$modalBox;
			
			if (!etot.touch && event.which !== 1 || etot.state.modal) {
				return;
			}

			etot.state.modal = true;
			animationProperties.opacity = 1;
			animationOptions.duration = etot.settings.modalOverlayFadeDurationMs;
			$modalBox = $(this).siblings('.modal-box').toggleClass('visible');
			
			$(etot.settings.modalOverlaySelector)
				.removeClass('hidden')
				.animate(animationProperties, animationOptions);
				
			var videoURL = $modalBox.find('.video').attr('data-url');
			
			$('<iframe width="711" height="400" frameborder="0" src="'+ videoURL +'">').appendTo($modalBox.find('.video'));

			
		},
		
		bigstoryswitch: function(event) {

			var $modalLink = $(this),
				$newModalBox,
				$videoContainer,
				videoURL;
			
			$('.modal-box').find('iframe').remove();
			$modalLink.parent('.modal-box').toggleClass('visible');
			$newModalBox = $('#' + $modalLink.attr('data-story-id') + ' .modal-box');
			$videoContainer = $newModalBox.find('.video');
			videoURL = $videoContainer.attr('data-url');
			$videoContainer.append('<iframe width="711" height="400" frameborder="0" src="'+ videoURL +'">');
			$newModalBox.toggleClass('visible');
			
		},
		
		bigstoryclose: function(event) {

			var animationProperties = {},
				animationOptions = {};
			
			// 1 === left mouse button, 27 === esc
			if (!etot.touch && event.which !== 1 && event.which !== 27) {
				return;
			}

			animationProperties.opacity = 0;
			animationOptions.duration = etot.settings.modalOverlayFadeDurationMs;
			animationOptions.complete = function() {
				$(etot.settings.modalOverlaySelector).addClass('hidden');
				etot.state.modal = false;
			};

			$('.modal-box.visible').removeClass('visible');
			$(etot.settings.modalOverlaySelector).animate(animationProperties, animationOptions);
			
			$('.modal-box').find('iframe').remove();
			
		},
		
		resize: function() {
			
			var years,
				yearXs = {},
				firstYearPercent,
				lastYearPercent,
				approximateWidthOfAFourCharacterLabel;
			
			etot.metrics.measure();

			approximateWidthOfAFourCharacterLabel = 0.018;
			years = etot.$footerYears.text().split(' ');

			etot.metrics.scenes.each(function(sceneIndex) {
				if (this.name === 'lead-in') {
					yearXs[etot.metrics.scenes[sceneIndex + 1].year] = this.progress.start;
				}
			});
			
			firstYearPercent = etot.metrics.progressToPercent(yearXs[years[0]]);
			lastYearPercent = etot.metrics.progressToPercent(yearXs[years[years.length - 1]]);
			
			etot.$footerYears
				.css('width', (lastYearPercent - firstYearPercent + approximateWidthOfAFourCharacterLabel) * 100 + '%')
				.css('margin-left', ((firstYearPercent - (approximateWidthOfAFourCharacterLabel / 2)) * 100) + '%');
			
		}

	};
	
})();
