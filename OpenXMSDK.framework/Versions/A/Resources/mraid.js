(function() {
	var mraid = window.mraid = {};
	mraid.eventListeners = {};
	mraid.state = "loading";
	mraid.viewable = false;
	mraid.resizePropertiesInitialized = false;
	var _isIOS = (/iphone|ipad|ipod/i).test(window.navigator.userAgent);
	var _logConsole = 0;

	mraid.orientationProperties = {
		allowOrientationChange: true,
		forceOrientation: "none"
	};

	mraid.expandProperties = {
		width: 0,
		height: 0,
		useCustomClose: false
	};

	/* customClosePosition: top-left, top-right, center, bottom-left, bottom-right, top-center, bottom-center */
	mraid.resizeProperties = {
		width: 0,
		height: 0,
		customClosePosition: "top-right",
		offsetX: 0,
		offsetY: 0,
		allowOffscreen: true
	};

	if (_isIOS) {
		mraid.placementType = "inline";
		mraid.currentPosition = {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
		mraid.maxSize = {
			width: 0,
			height: 0
		};
		mraid.defaultPosition = {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
		mraid.screenSize = {
			width: 0,
			height: 0
		};
		mraid.allSupports = {
			sms: false,
			tel: false,
			email: false,
			calendar: false,
			storePicture: false,
			inlinevideo: false
		};
	}

	var safeString = function(str) {
		return str ? str : '';
	};

	/* cross-platform abstraction for calling to the container. */
	var callContainer = function(command) {
		var args = Array.prototype.slice.call(arguments);
		args.shift();
		if (_isIOS) {
			for (var i=0; i < args.length; i++)
				args[i] = encodeURIComponent(args[i]);
			var joinedArgs = args.join('/');
			window.open("mraid:" + command + '/' + joinedArgs);
		} else {
			jsBridge[command].apply(jsBridge, args);
		}
	};
 
	var log = function(str) {
		if (_logConsole)
			console.log(str);
	};

	/* The open method will display an embedded browser window in the application that loads an external URL. */
	/* On device platforms that do not allow an embedded browser, */
	/* the open method invokes the native browser with the external URL */

	/* url - the URL of the web page */
	mraid.open = function(url) {
		log('mraid.open(' + url + ')');
		callContainer('open', url);
	};

	/*The resize method will cause the existing Webview to change size using the existing HTML document. Like expand(), resize() size changes happen at highest z-order in the view hierarchy,
 and so do not shift or otherwise reposition underlying content. The resize method will move the state from "default" to "resized" and fire the stateChange event.
 Resize can be called multiple times by the creative. Additional calls to resize will also fire the stateChanged event although the state value will remain “resized”.
 Calls to resize from an “expanded” state will throw an error event and not change the state.
 Use this method to request a resize of the default ad view to a desired size and screen position. Note that resize() relies on parameters that are stored in the resizeProperties JSON object.
 Thus the creative must set those parameters via the setResizeProperties() method BEFORE attempting to resize(). Calling resize() before setResizeProperties will result in an error.
 The SDK will notify the app of the resize request so that the app can react to the change as appropriate. If the resize is valid, then the sizeChange event is fired.
 If the parameters are out of range, then the error event identifies the exception.
 */
	mraid.resize = function() {
		if (mraid.resizePropertiesInitialized) {
			callContainer('resize');
		} else {
			mraid.onError("[width] and [height] parameters must be at least 1px. Set them using setResizeProperties() MRAID method.", "resize");
		}
	};

	/* The expand method may change the size of the ad container, and will move state */
	/* from 'default' to 'expanded' and fire the stateChange event. Calling expand more */
	/* than once is permissible, but has no effect on state (which remains ?expanded?). */
	/* It will occur a new dialog creation with embedded browser at the highest z-order in */
	/* the view hierarchy and advertisement loading in it. While an ad is in an expanded */
	/* state, the default position will generally be obscured or inaccessible to the viewer, */
	/* so the default position should take no action while the expanded state is available. */
	/* An expanded view will provide an end-user with the ability to close the expanded creative */

	/* URL optional. The URL for the document to be displayed in a new overlay view. */
	/* If null, the body of the current ad will be used in the current webview */
	mraid.expand = function(url) {
		log('mraid.expand(' + url + ')');
		if (url) {
			callContainer('expand', url);
		} else {
			callContainer('expand');
		}
	};

	/* The close method will cause the ad webview to downgrade its state. It will */
	/* also fire the stateChange event. For ads in an expanded state, the close() */
	/* method moves to a default state */
	mraid.close = function() {
		callContainer('close');
	};

	/* For efficiency, ad designers sometimes flight a single piece of creative in */
	/* both banner and interstitial placements. So that the creative can be aware of */
	/* its placement, and therefore potentially behave differently, each ad container */
	/* has a placement type determining whether the ad is being displayed inline with */
	/* content (i.e. a banner) or as an interstitial overlaid content (e.g. during a
	/* content transition). The SDK returns the value of the placement to creative so */
	/* that creative can behave differently as necessary. The SDK does not determine */
	/* whether a banner is an expandable (the creative does) and thus does not return a */
	/* separate type for expandable. Controller should determine view placement type */
	/* basing on layout paramaters and set it respectively*/
	mraid.getPlacementType = function() {
		if (_isIOS) return mraid.placementType;
		return jsBridge.getPlacementType();
	};

	/* The getState method returns the current state of the ad container, returning */
	/* whether the ad container is in its default, fixed position or is in an expanded, */
	/* larger position. Manages at the native code layer. Instance of native bridge */
	/* provides field for that purpose. In case state was changed, field will changed */
	/* appropriately */
	mraid.getState = function() {
		return mraid.state;
	};

	/* The MRAID specification that this SDK is certified against. For the current */
	/* version of MRAID, getVersion() will return '1.0' */
	mraid.getVersion = function() {
		return '2.0';
	};

	/* In addition to the state of the ad container, it is possible that the container */
	/* is loaded off-screen as part of an application's buffer to help provide a smooth */
	/* user experience. This is especially prevalent in apps that employ scrolling views */
	/* or in ads that display interstitials, for example between levels of a game. */
	/*	  The isViewable method returns whether the ad container is currently on or off the */
	/* screen. The	viewableChange event fires when the ad moves from on-screen to */
	/* off-screen and vice versa. In any situation where an ad may be loaded offscreen, */
	/* it is a good practice for the ad to check on its viewable state and/or register for */
	/* viewableChange before taking any action. */
	/*	  It may be determined either simple view property or on/off-screen hardware state as */
	/* additional */
	mraid.isViewable = function() {
		return mraid.viewable;
	};

	/* The getScreenSize method returns the current actual pixel width and height, based on the current orientation, */
	/* in density-independent pixels, of the device on which the ad is running. */
	mraid.getScreenSize = function() {
		if (_isIOS) return mraid.screenSize;
		return JSON.parse(jsBridge.getScreenSize());
	};

	/* The getDefaultPosition method returns the position and size of the default ad view, measured in */
	/* density-independent pixels, regardless of what state the calling view is in. */
	mraid.getDefaultPosition = function() {
		if (_isIOS) return mraid.defaultPosition;
		return JSON.parse(jsBridge.getDefaultPosition());
	};

	/* The getCurrentPosition method will return the current position and size of the ad view, measured in */
	/* density-independent pixels. */
	mraid.getCurrentPosition = function() {
		if (_isIOS) return mraid.currentPosition;
		return JSON.parse(jsBridge.getCurrentPosition());
	};

	/* The getMaxSize method returns the maximum size (in density-independent pixel width and height) an ad can expand */
	/* or resize to. */
	mraid.getMaxSize = function() {
		if (_isIOS) return mraid.maxSize;
		return JSON.parse(jsBridge.getMaxSize());
	};

	/* The supports method allows the ad to interrogate the device for support of specific features. */
	mraid.supports = function(feature) {
		if (_isIOS) return mraid.allSupports[feature];
		return jsBridge.supports(feature);
	};

	/* Use this method to play a video on the device via the device’s native, external player. */
	mraid.playVideo = function(url) {
		callContainer('playVideo', url);
	};

	/* Use this method to subscribe a specific handler method to a specific event. In this way, */
	/* multiple listeners can subscribe to a specific event, and a single listener can handle */
	/* multiple events. When event occurred all subscribers will be notified. It will be local */
	/* variable, inside an JavaScript variables set, which will contain all added subscribers */

	/* event - name of event  to listen for, listener - function name (or anonymous function) */
	/* to execute*/
	mraid.addEventListener = function(event, listener) {
		var handlers = mraid.eventListeners[event];
		if (handlers == null) { /* no handlers defined yet, set it up */
			handlers = mraid.eventListeners[event] = [];
		}

		/* see if the listener is already present */
		for (var handler = 0; handler < handlers.length; handler++) {
			if (listener == handlers[handler]) { /* listener already present, nothing to do */
				return;
			}
		}

		/* not present yet, go ahead and add it */
		handlers.push(listener);
	};

	/* Use this method to unsubscribe a specific handler method from a specific event. Event */
	/* listeners should always be removed when they are no longer useful to avoid errors. If */
	/* no listener function is provided, then all functions listening to the event will be */
	/* removed. When removeEventListener called it will occur subscriber deletion from JavaScript */
	/* variables set*/

	/* event - name of event, function name (or anonymous function) to be removed */
	mraid.removeEventListener = function(event, listener) {
		var handlers = mraid.eventListeners[event];
		if (handlers != null) {
			for (var handler = 0; handler < handlers.length; handler++) {
				if (handlers[handler] == listener) {
					handlers.splice(handler, 1);
					break;
				}
			}
		}
	};

	/* The setOrientationProperties method sets the JavaScript orientationProperties object. */
	mraid.setOrientationProperties = function(properties) {
		if (!properties)
			return;
		var aoc = properties.allowOrientationChange;
		if (aoc === true || aoc === false) {
			mraid.orientationProperties.allowOrientationChange = aoc;
		}

		var fo = properties.forceOrientation;
		if (fo == 'landscape' || fo == 'portrait' || fo == 'none') {
			mraid.orientationProperties.forceOrientation = fo;
		}

		callContainer('onOrientationPropertiesChanged', JSON.stringify(mraid.getOrientationProperties()));
	};

	/* The getOrientationProperties method returns the whole JavaScript object orientationProperties object. */
	mraid.getOrientationProperties = function() {
		return mraid.orientationProperties;
	};

	/* The getResizeProperties method returns the whole JavaScript object resizeProperties object. */
	mraid.getResizeProperties = function() {
		return mraid.resizeProperties;
	};

	/* The getExpandProperties method returns the whole JSON expandProperties object. This object */
	/* lies inside JavaScript code. When SDK handles event an expansion this object will be used */
	/* for construction purpose*/
	mraid.getExpandProperties = function() {
		mraid.expandProperties.isModal = true;
		return mraid.expandProperties;
	};

	/* The setResizeProperties method sets the whole JavaScript object. */
	mraid.setResizeProperties = function(properties) {
		if (properties && properties.width != null && typeof properties.width !== 'undefined' && !isNaN(properties.width)) {
			mraid.resizeProperties.width = properties.width;
		}

		if (properties && properties.height != null && typeof properties.height !== 'undefined' && !isNaN(properties.height)) {
			mraid.resizeProperties.height = properties.height;
		}

		if (properties && properties.customClosePosition != null && typeof properties.customClosePosition !== 'undefined' && isNaN(properties.customClosePosition)) {
			mraid.resizeProperties.customClosePosition = properties.customClosePosition;
		}

		if (properties && properties.offsetX != null && typeof properties.offsetX !== 'undefined' && !isNaN(properties.offsetX)) {
			mraid.resizeProperties.offsetX = properties.offsetX;
		}

		if (properties && properties.offsetY != null && typeof properties.offsetY !== 'undefined' && !isNaN(properties.offsetY)) {
			mraid.resizeProperties.offsetY = properties.offsetY;
		}

		if (properties && properties.allowOffscreen == true || properties.allowOffscreen == false) {
			mraid.resizeProperties.allowOffscreen = properties.allowOffscreen;
		}

		mraid.resizePropertiesInitialized = mraid.resizeProperties.width > 0 && mraid.resizeProperties.height > 0;
	};

	/* Use this method to set the ad's expand properties, in particular the maximum width and */
	/* height of the ad creative. This method will change expandProperties object properties */
	/* inside JavaScript variables set*/

	/* properties - JSON {...} this object contains the width and height of expanded ad */
	mraid.setExpandProperties = function(properties) {
		if (properties && properties.width != null && typeof properties.width !== 'undefined' && !isNaN(properties.width)) {
			mraid.expandProperties.width = properties.width;
		}

		if (properties && properties.height != null && typeof properties.height !== 'undefined' && !isNaN(properties.height)) {
			mraid.expandProperties.height = properties.height;
		}
	};


	/* An MRAID-compliant SDK must provide an end-user with the ability to close an expanded or */
	/* interstitial ad. This is a requirement to ensure that users are always able to return to */
	/* the publisher content even if an ad has an error. The ad designer may optionally provide */
	/* additional design elements to close the expanded or interstitial view via the close() */
	/* method. This method will hange expandProperties object property inside JavaScript variables set. */
	/* By default this option is disabled and SDK supply user ad close indicator (50x50). This clickable */
	/* area will be placed at the highest z-order possible, and must always be available to the end user*/

	/* useCustomClose - true if ad creative supplies its own designs for the close area, false if SDK */
	/* default image should be displayed for the close area */
	mraid.useCustomClose = function(useCustomClose) {
		if (useCustomClose == true || useCustomClose == false) {
			mraid.expandProperties.useCustomClose = useCustomClose;
		}
	};

	/* Fire specific event with arguments */

	/* event - event name, args - arguments */
	mraid.fireEvent = function(event, args) {
		var handlers = mraid.eventListeners[event];
		if (handlers == null) { /* no handlers defined yet, set it up */
			return;
		}

		/* see if the listener is present */
		for (var handler = 0; handler < handlers.length; handler++) {
			if (event == 'ready') {
				handlers[handler]();
			} else if (event == 'error') {
				handlers[handler](args[0], args[1]);
			} else if (event == 'stateChange') {
				handlers[handler](args);
			} else if (event == 'viewableChange') {
				handlers[handler](args);
			} else if (event == 'sizeChange') {
				handlers[handler](args[0], args[1]);
			}
		}
	};

	/* The createCalendarEvent method opens the device UI to create a new calendar event. */
	mraid.createCalendarEvent = function(parameters) {
		callContainer('createCalendarEvent', JSON.stringify(parameters));
	};

	/* The storePicture method will place a picture in the device's photo album. */
	mraid.storePicture = function(url) {
		callContainer('storePicture', url);
	};

	/* This error is thrown whenever an SDK error occurs */

	/* message - description of the type of error, action - name of action that caused error */
	mraid.onError = function(message, action) {
		mraid.fireEvent("error", [message, action]);
	};

	/* This event fires when the SDK is fully loaded, initialized, and ready for any calls from the ad creative */
	mraid.onReady = function() {
		mraid.onStateChange("default");
		mraid.fireEvent("ready");
	};

	/* The sizeChange event fires when the ad’s size within the app UI changes. */
	mraid.onSizeChange = function(width, height) {
		mraid.fireEvent("sizeChange", [width, height]);
	};

	/* This event fires when the state is changed programmatically by the ad or by the environment */
	/* state may be loading, default, expanded or hidden */
	mraid.onStateChange = function(state) {
		mraid.state = state;
		mraid.fireEvent("stateChange", mraid.getState());
	};

	/* This event fires when the ad moves from on-screen to off-screen and vice versa */

	/* true: container is on-screen and viewable by user; false: container is off-screen and not viewable */
	mraid.onViewableChange = function(isViewable) {
		mraid.viewable = isViewable;
		mraid.fireEvent("viewableChange", mraid.isViewable());
	};
}());
