var clippy = {};

/******
 *
 *
 * @constructor
 */
clippy.Agent = function (path, data, sounds) {
  this.path = path;

  this._queue = new clippy.Queue($.proxy(this._onQueueEmpty, this));

  this._el = $('<div class="clippy"></div>').hide();

  $("#screen").append(this._el);

  this._animator = new clippy.Animator(this._el, path, data, sounds);

  this._balloon = new clippy.Balloon(this._el);

  this._setupEvents();
};

clippy.Agent.prototype = {
  _wasDragged: false,
  _touchTimer: null,
  _touchStartX: 0,
  _touchStartY: 0,
  _longPressFired: false,
  _touchMoveHandle: null,
  _touchEndHandle: null,

  /**************************** API ************************************/

  /***
   *
   * @param {Number} x
   * @param {Number} y
   */
  gestureAt: function (x, y) {
    var d = this._getDirection(x, y);
    var gAnim = "Gesture" + d;
    var lookAnim = "Look" + d;

    var animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  },

  /***
   *
   * @param {Boolean=} fast
   *
   */
  hide: function (fast, callback) {
    this._hidden = true;
    var el = this._el;
    this.stop();
    if (fast) {
      this._el.hide();
      this.stop();
      this.pause();
      if (callback) callback();
      return;
    }

    return this._playInternal("Hide", function () {
      el.hide();
      this.pause();
      if (callback) callback();
    });
  },

  moveTo: function (x, y, duration) {
    var dir = this._getDirection(x, y);
    var anim = "Move" + dir;
    if (duration === undefined) duration = 1000;

    this._addToQueue(function (complete) {
      // the simple case
      if (duration === 0) {
        this._el.css({ top: y, left: x });
        this.reposition();
        complete();
        return;
      }

      // no animations
      if (!this.hasAnimation(anim)) {
        this._el.animate({ top: y, left: x }, duration, complete);
        return;
      }

      var callback = $.proxy(function (name, state) {
        // when exited, complete
        if (state === clippy.Animator.States.EXITED) {
          complete();
        }
        // if waiting,
        if (state === clippy.Animator.States.WAITING) {
          this._el.animate(
            { top: y, left: x },
            duration,
            $.proxy(function () {
              // after we're done with the movement, do the exit animation
              this._animator.exitAnimation();
            }, this),
          );
        }
      }, this);

      this._playInternal(anim, callback);
    }, this);
  },

  _playInternal: function (animation, callback) {
    // if we're inside an idle animation,
    if (
      this._isIdleAnimation() &&
      this._idleDfd &&
      this._idleDfd.state() === "pending"
    ) {
      this._idleDfd.done(
        $.proxy(function () {
          this._playInternal(animation, callback);
        }, this),
      );
    }

    this._animator.showAnimation(animation, callback);
  },

  play: function (animation, timeout, cb) {
    if (!this.hasAnimation(animation)) return false;

    if (timeout === undefined) timeout = 5000;

    this._addToQueue(function (complete) {
      var completed = false;
      // handle callback
      var callback = function (name, state) {
        if (state === clippy.Animator.States.EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      // if has timeout, register a timeout function
      if (timeout) {
        window.setTimeout(
          $.proxy(function () {
            if (completed) return;
            // exit after timeout
            this._animator.exitAnimation();
          }, this),
          timeout,
        );
      }

      this._playInternal(animation, callback);
    }, this);

    return true;
  },

  /***
   *
   * @param {Boolean=} fast
   */
  show: function (fast) {
    this._hidden = false;
    if (fast) {
      this._el.show();
      this.resume();
      this._onQueueEmpty();
      return;
    }

    if (this._el.css("top") === "auto" || !this._el.css("left") === "auto") {
      const screen = $("#screen");
      var left = screen.width() * 0.8;
      var top = screen.height() * 0.8;
      this._el.css({ top: top, left: left });
    }

    this.resume();
    var animation = this.hasAnimation("Greeting") ? "Greeting" : "Show";
    return this.play(animation);
  },

  /***
   *
   * @param {String} text
   * @param {Boolean} hold - Whether to hold the speech balloon
   * @param {Boolean} useTTS - Whether to use text-to-speech
   */
  speak: function (text, hold, useTTS) {
    this._addToQueue(function (complete) {
      this._balloon.speak(complete, text, hold, useTTS);
    }, this);
  },

  /***
   * Close the current balloon
   */
  closeBalloon: function () {
    this._balloon.hide(true);
  },

  /***
   * TTS Configuration Methods
   */

  /**
   * Configure TTS settings for this agent
   * @param {Object} options - TTS configuration options
   * @param {SpeechSynthesisVoice} options.voice - Voice to use
   * @param {Number} options.rate - Speech rate (0.1 to 10)
   * @param {Number} options.pitch - Speech pitch (0 to 2)
   * @param {Number} options.volume - Speech volume (0 to 1)
   * @returns {Boolean} - True if TTS is available and configured
   */
  setTTSOptions: function (options) {
    return this._balloon.setTTSOptions(options);
  },

  /**
   * Get available TTS voices
   * @returns {Array} Array of available voices
   */
  getTTSVoices: function () {
    return this._balloon.getTTSVoices();
  },

  /**
   * Check if TTS is supported and enabled
   * @returns {Boolean}
   */
  isTTSEnabled: function () {
    return this._balloon.isTTSEnabled();
  },

  /**
   * Stop current TTS speech
   */
  stopTTS: function () {
    this._balloon.stopTTS();
  },

  setTTSEnabled: function (enabled) {
    this._balloon.setTTSEnabled(enabled);
  },

  delay: function (time) {
    time = time || 250;

    this._addToQueue(function (complete) {
      this._onQueueEmpty();
      window.setTimeout(complete, time);
    });
  },

  /***
   * Skips the current animation
   */
  stopCurrent: function () {
    this._animator.exitAnimation();
    this._balloon.close();
  },

  stop: function () {
    // clear the queue
    this.stopTTS();
    this._queue.clear();
    this._animator.exitAnimation();
    this._balloon.hide();
  },

  /***
   *
   * @param {String} name
   * @returns {Boolean}
   */
  hasAnimation: function (name) {
    return this._animator.hasAnimation(name);
  },

  /***
   * Gets a list of animation names
   *
   * @return {Array.<string>}
   */
  animations: function () {
    return this._animator.animations();
  },

  /***
   * Play a random animation
   * @return {jQuery.Deferred}
   */
  animate: function () {
    var animations = this.animations();
    var anim = animations[Math.floor(Math.random() * animations.length)];
    // skip idle animations
    if (anim.indexOf("Idle") === 0) {
      return this.animate();
    }
    return this.play(anim);
  },

  /**************************** Utils ************************************/

  /***
   *
   * @param {Number} x
   * @param {Number} y
   * @return {String}
   * @private
   */
  _getDirection: function (x, y) {
    var offset = this._el.offset();
    var h = this._el.height();
    var w = this._el.width();

    var centerX = offset.left + w / 2;
    var centerY = offset.top + h / 2;

    var a = centerY - y;
    var b = centerX - x;

    var r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    // Left and Right are for the character, not the screen :-/
    if (-45 <= r && r < 45) return "Right";
    if (45 <= r && r < 135) return "Up";
    if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
    if (-135 <= r && r < -45) return "Down";

    // sanity check
    return "Top";
  },

  /**************************** Queue and Idle handling ************************************/

  /***
   * Handle empty queue.
   * We need to transition the animation to an idle state
   * @private
   */
  _onQueueEmpty: function () {
    if (this._hidden || this._isIdleAnimation()) return;
    var idleAnim = this._getIdleAnimation();
    this._idleDfd = $.Deferred();

    this._animator.showAnimation(idleAnim, $.proxy(this._onIdleComplete, this));
  },

  _onIdleComplete: function (name, state) {
    if (state === clippy.Animator.States.EXITED) {
      this._idleDfd.resolve();
    }
  },

  /***
   * Is the current animation is Idle?
   * @return {Boolean}
   * @private
   */
  _isIdleAnimation: function () {
    var c = this._animator.currentAnimationName;
    return c && c.indexOf("Idle") === 0;
  },

  /**
   * Gets a random Idle animation
   * @return {String}
   * @private
   */
  _getIdleAnimation: function () {
    var animations = this.animations();
    var r = [];
    for (var i = 0; i < animations.length; i++) {
      var a = animations[i];
      if (a.indexOf("Idle") === 0) {
        r.push(a);
      }
    }

    // pick one
    var idx = Math.floor(Math.random() * r.length);
    return r[idx];
  },

  /**************************** Events ************************************/

  _setupEvents: function () {
    $(window).on("resize", $.proxy(this.reposition, this));

    this._el.on("mousedown", $.proxy(this._onMouseDown, this));
    this._el.on("touchstart", $.proxy(this._onTouchStart, this));

    this._el.on("dblclick", $.proxy(this._onDoubleClick, this));
  },

  _onDoubleClick: function () {
    if (this._balloon.isAnimating()) return;
    if (!this.play("ClickedOn")) {
      this.animate();
    }
  },

  reposition: function () {
    if (!this._el.is(":visible")) return;
    var o = this._el.offset();
    var bH = this._el.outerHeight();
    var bW = this._el.outerWidth();

    const screen = $("#screen");
    var wW = screen.width();
    var wH = screen.height();
    var sT = screen.scrollTop();
    var sL = screen.scrollLeft();

    var top = o.top - sT;
    var left = o.left - sL;
    var m = 5;
    if (top - m < 0) {
      top = m;
    } else if (top + bH + m > wH) {
      top = wH - bH - m;
    }

    if (left - m < 0) {
      left = m;
    } else if (left + bW + m > wW) {
      left = wW - bW - m;
    }

    this._el.css({ left: left, top: top });
    // reposition balloon
    this._balloon.reposition();
  },

  _onTouchStart: function (e) {
    e.preventDefault();
    this._wasDragged = false;
    this._longPressFired = false;
    const coords = this._getEventCoords(e);
    this._touchStartX = coords.pageX;
    this._touchStartY = coords.pageY;

    this._touchTimer = window.setTimeout($.proxy(function () {
      this._longPressFired = true;
      // Trigger a contextmenu event, making sure to pass touch coordinates
      const contextMenuEvent = $.Event("contextmenu");
      contextMenuEvent.pageX = this._touchStartX;
      contextMenuEvent.pageY = this._touchStartY;
      this._el.trigger(contextMenuEvent);
    }, this), 750);

    this._touchMoveHandle = $.proxy(this._onTouchMove, this);
    this._touchEndHandle = $.proxy(this._onTouchEnd, this);

    $(window).on("touchmove", this._touchMoveHandle);
    $(window).on("touchend", this._touchEndHandle);
  },

  _onTouchMove: function (e) {
    const coords = this._getEventCoords(e);
    const dx = Math.abs(coords.pageX - this._touchStartX);
    const dy = Math.abs(coords.pageY - this._touchStartY);

    if (dx > 10 || dy > 10) {
      this._wasDragged = true;
      window.clearTimeout(this._touchTimer);
      // Unbind touch handlers to prevent conflicts
      $(window).off("touchmove", this._touchMoveHandle);
      $(window).off("touchend", this._touchEndHandle);
      // It's a drag, start the drag logic
      this._startDrag(e);
    }
  },

  _onTouchEnd: function (e) {
    window.clearTimeout(this._touchTimer);
    $(window).off("touchmove", this._touchMoveHandle);
    $(window).off("touchend", this._touchEndHandle);

    if (this._wasDragged || this._longPressFired) {
      return;
    }

    // It's a tap, trigger a click event
    this._el.trigger("click");
  },

  _onMouseDown: function (e) {
    if (e.which !== 1) return;
    e.preventDefault();
    this._startDrag(e);
  },

  /**************************** Drag ************************************/

  _startDrag: function (e) {
    // pause animations
    this.pause();
    this._balloon.hide(true);
    this._offset = this._calculateClickOffset(e);

    this._moveHandle = $.proxy(this._dragMove, this);
    this._upHandle = $.proxy(this._finishDrag, this);

    const isTouchEvent = e.type.startsWith("touch");
    const moveEvent = isTouchEvent ? "touchmove" : "mousemove";
    const upEvent = isTouchEvent ? "touchend" : "mouseup";

    $(window).on(moveEvent, this._moveHandle);
    $(window).on(upEvent, this._upHandle);


    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  },

  _getEventCoords: function (e) {
    const originalEvent = e.originalEvent || e;
    const touch = originalEvent.touches && originalEvent.touches[0];
    return touch || e;
  },

  _calculateClickOffset: function (e) {
    const coords = this._getEventCoords(e);
    var o = this._el.offset();
    return {
      top: coords.pageY - o.top,
      left: coords.pageX - o.left,
    };
  },

  _updateLocation: function () {
    this._el.css({ top: this._targetY, left: this._taregtX });
    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  },

  _dragMove: function (e) {
    e.preventDefault();
    const coords = this._getEventCoords(e);
    var x = coords.clientX - this._offset.left;
    var y = coords.clientY - this._offset.top;
    this._taregtX = x;
    this._targetY = y;
  },

  _finishDrag: function (e) {
    window.clearTimeout(this._dragUpdateLoop);

    const isTouchEvent = e.type.startsWith("touch");
    const moveEvent = isTouchEvent ? "touchmove" : "mousemove";
    const upEvent = isTouchEvent ? "touchend" : "mouseup";

    // remove handles
    $(window).off(moveEvent, this._moveHandle);
    $(window).off(upEvent, this._upHandle);
    // resume animations
    this._balloon.show();
    this.reposition();
    this.resume();
  },

  _addToQueue: function (func, scope) {
    if (scope) func = $.proxy(func, scope);
    this._queue.queue(func);
  },

  /**************************** Pause and Resume ************************************/

  pause: function () {
    this._animator.pause();
    this._balloon.pause();
  },

  resume: function () {
    this._animator.resume();
    this._balloon.resume();
  },
};

/******
 *
 *
 * @constructor
 */
clippy.Animator = function (el, path, data, sounds) {
  this._el = el;
  this._data = data;
  this._path = path;
  this._currentFrameIndex = 0;
  this._currentFrame = undefined;
  this._exiting = false;
  this._currentAnimation = undefined;
  this._endCallback = undefined;
  this._started = false;
  this._sounds = {};
  this.currentAnimationName = undefined;
  this.preloadSounds(sounds);
  this._overlays = [this._el];
  var curr = this._el;

  this._setupElement(this._el);
  for (var i = 1; i < this._data.overlayCount; i++) {
    var inner = this._setupElement($("<div></div>"));

    curr.append(inner);
    this._overlays.push(inner);
    curr = inner;
  }
};

clippy.Animator.prototype = {
  _setupElement: function (el) {
    var frameSize = this._data.framesize;
    el.css("display", "none");
    el.css({ width: frameSize[0], height: frameSize[1] });
    el.css("background", "url('" + this._path + "/map.png') no-repeat");

    return el;
  },

  animations: function () {
    var r = [];
    var d = this._data.animations;
    for (var n in d) {
      r.push(n);
    }
    return r;
  },

  preloadSounds: function (sounds) {
    for (var i = 0; i < this._data.sounds.length; i++) {
      var snd = this._data.sounds[i];
      var uri = sounds[snd];
      if (!uri) continue;
      this._sounds[snd] = new Audio(uri);
    }
  },

  _getAnimationByName: function (name) {
    if (!name) return null;
    var anims = this._data.animations;
    for (var animName in anims) {
      if (animName.toLowerCase() === name.toLowerCase()) {
        return animName;
      }
    }
    return null;
  },

  hasAnimation: function (name) {
    return !!this._getAnimationByName(name);
  },

  exitAnimation: function () {
    this._exiting = true;
  },

  showAnimation: function (animationName, stateChangeCallback) {
    this._exiting = false;

    var correctedName = this._getAnimationByName(animationName);
    if (!correctedName) {
      return false;
    }

    this._currentAnimation = this._data.animations[correctedName];
    this.currentAnimationName = correctedName;

    if (!this._started) {
      this._step();
      this._started = true;
    }

    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._endCallback = stateChangeCallback;

    return true;
  },

  _draw: function () {
    var images = [];
    if (this._currentFrame) images = this._currentFrame.images || [];

    for (var i = 0; i < this._overlays.length; i++) {
      if (i < images.length) {
        var xy = images[i];
        var bg = -xy[0] + "px " + -xy[1] + "px";
        this._overlays[i].css({ "background-position": bg, display: "block" });
      } else {
        this._overlays[i].css("display", "none");
      }
    }
  },

  _getNextAnimationFrame: function () {
    if (!this._currentAnimation) return undefined;
    // No current frame. start animation.
    if (!this._currentFrame) return 0;
    var currentFrame = this._currentFrame;
    var branching = this._currentFrame.branching;

    if (this._exiting && currentFrame.exitBranch !== undefined) {
      return currentFrame.exitBranch;
    } else if (branching) {
      var rnd = Math.random() * 100;
      for (var i = 0; i < branching.branches.length; i++) {
        var branch = branching.branches[i];
        if (rnd <= branch.weight) {
          return branch.frameIndex;
        }

        rnd -= branch.weight;
      }
    }

    return this._currentFrameIndex + 1;
  },

  _playSound: function () {
    var s = this._currentFrame.sound;
    if (!s) return;
    var audio = this._sounds[s];
    if (audio) audio.play();
  },

  _atLastFrame: function () {
    return this._currentFrameIndex >= this._currentAnimation.frames.length - 1;
  },

  _step: function () {
    if (!this._currentAnimation) return;
    var newFrameIndex = Math.min(
      this._getNextAnimationFrame(),
      this._currentAnimation.frames.length - 1,
    );
    var frameChanged =
      !this._currentFrame || this._currentFrameIndex !== newFrameIndex;
    this._currentFrameIndex = newFrameIndex;

    // always switch frame data, unless we're at the last frame of an animation with a useExitBranching flag.
    if (!(this._atLastFrame() && this._currentAnimation.useExitBranching)) {
      this._currentFrame =
        this._currentAnimation.frames[this._currentFrameIndex];
    }

    this._draw();
    this._playSound();

    this._loop = window.setTimeout(
      $.proxy(this._step, this),
      this._currentFrame.duration,
    );

    // fire events if the frames changed and we reached an end
    if (this._endCallback && frameChanged && this._atLastFrame()) {
      if (this._currentAnimation.useExitBranching && !this._exiting) {
        this._endCallback(
          this.currentAnimationName,
          clippy.Animator.States.WAITING,
        );
      } else {
        this._endCallback(
          this.currentAnimationName,
          clippy.Animator.States.EXITED,
        );
      }
    }
  },

  /***
   * Pause animation execution
   */
  pause: function () {
    window.clearTimeout(this._loop);
  },

  /***
   * Resume animation
   */
  resume: function () {
    this._step();
  },
};

clippy.Animator.States = { WAITING: 1, EXITED: 0 };

/******
 *
 *
 * @constructor
 */
clippy.Balloon = function (targetEl) {
  this._targetEl = targetEl;

  this._hidden = true;
  this._ttsEnabled = window.System.speechManager.isSupported();
  this._ttsUserEnabled = this._ttsEnabled;
  this._isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  this._ttsOptions = {
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };
  this._setup();
};

clippy.Balloon.prototype = {
  WORD_SPEAK_TIME: 320,
  CLOSE_BALLOON_DELAY: 2000,

  _setup: function () {
    this._balloon = $(
      '<div class="clippy-balloon"><div class="clippy-tip"></div><div class="clippy-content"></div></div> ',
    ).hide();
    this._content = this._balloon.find(".clippy-content");

    $(document.body).append(this._balloon);
  },

  reposition: function () {
    var sides = ["top-left", "top-right", "bottom-left", "bottom-right"];

    for (var i = 0; i < sides.length; i++) {
      var s = sides[i];
      this._position(s);
      if (!this._isOut()) break;
    }
  },

  _BALLOON_MARGIN: 15,

  /***
   *
   * @param side
   * @private
   */
  _position: function (side) {
    var o = this._targetEl.offset();
    var h = this._targetEl.height();
    var w = this._targetEl.width();

    var bH = this._balloon.outerHeight();
    var bW = this._balloon.outerWidth();

    this._balloon.removeClass("clippy-top-left");
    this._balloon.removeClass("clippy-top-right");
    this._balloon.removeClass("clippy-bottom-right");
    this._balloon.removeClass("clippy-bottom-left");

    var left, top;
    switch (side) {
      case "top-left":
        // right side of the balloon next to the right side of the agent
        left = o.left + w - bW;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "top-right":
        // left side of the balloon next to the left side of the agent
        left = o.left;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "bottom-right":
        // right side of the balloon next to the right side of the agent
        left = o.left;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
      case "bottom-left":
        // left side of the balloon next to the left side of the agent
        left = o.left + w - bW;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
    }

    this._balloon.css({ top: top, left: left });
    this._balloon.addClass("clippy-" + side);
  },

  _isOut: function () {
    var o = this._balloon.offset();
    var bH = this._balloon.outerHeight();
    var bW = this._balloon.outerWidth();

    var wW = $(window).width();
    var wH = $(window).height();
    var sT = $(document).scrollTop();
    var sL = $(document).scrollLeft();

    var top = o.top - sT;
    var left = o.left - sL;
    var m = 5;
    if (top - m < 0 || left - m < 0) return true;
    if (top + bH + m > wH || left + bW + m > wW) return true;

    return false;
  },

  showHtml: function (html, hold) {
    const self = this;
    this._hidden = false;
    // Set visibility to hidden and position off-screen to calculate dimensions
    this._balloon.css({
      visibility: 'hidden',
      top: '-9999px',
      left: '-9999px'
    });
    this.show(); // This sets display: block

    const c = this._content;
    c.height('auto');
    c.width('auto');
    c.html(html);

    // Use a nested requestAnimationFrame to ensure rendering is complete
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        self.reposition();
        self._balloon.css('visibility', 'visible');
        // Restore state management
        self._active = true;
        self._hold = hold;
      });
    });
  },

  speak: function (complete, text, hold, useTTS) {
    this._hidden = false;
    this.show();
    var c = this._content;
    // set height to auto
    c.height("auto");
    c.width("auto");
    // add the text
    c.text(text);
    // set height
    c.height(c.height());
    c.width(c.width());
    c.text("");
    this.reposition();

    this._complete = complete;
    var self = this;

    // Use TTS if requested and available, otherwise fall back to visual-only
    if (useTTS && this._ttsEnabled) {
      // Handle asynchronous voice loading in browsers like Chrome mobile.
      var voices = window.System.speechManager.getVoices();
      if (voices.length === 0) {
        // If voices are not available, wait a moment for them to load.
        window.setTimeout(function () {
          var voices = window.System.speechManager.getVoices();
          if (voices.length === 0) {
            // If still no voices, fall back to silent words.
            self._sayWords(text, hold, complete);
          } else {
            // Voices loaded, proceed with TTS.
            self._sayWordsWithTTS(text, hold, complete);
          }
        }, 250); // 250ms delay is a pragmatic workaround for the voice loading race condition.
      } else {
        // Voices were available immediately.
        this._sayWordsWithTTS(text, hold, complete);
      }
    } else {
      this._sayWords(text, hold, complete);
    }
  },

  show: function () {
    if (this._hidden) return;
    this._balloon.show();
  },

  hide: function (fast) {
    if (fast) {
      this._balloon.hide();
      return;
    }

    this._hiding = window.setTimeout(
      $.proxy(this._finishHideBalloon, this),
      this.CLOSE_BALLOON_DELAY,
    );
  },

  _finishHideBalloon: function () {
    if (this._active) return;
    this._balloon.hide();
    this._hidden = true;
    this._hiding = null;
  },

  isAnimating: function () {
    return this._active;
  },

  _sayWords: function (text, hold, complete) {
    this._active = true;
    this._hold = hold;
    var words = text.split(/[^\S-]/);
    var time = this.WORD_SPEAK_TIME;
    var el = this._content;
    var idx = 1;

    this._addWord = $.proxy(function () {
      if (!this._active) return;
      if (idx > words.length) {
        this._active = false;
        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        el.text(words.slice(0, idx).join(" "));
        idx++;
        this._loop = window.setTimeout($.proxy(this._addWord, this), time);
      }
    }, this);

    this._addWord();
  },

  _sayWordsWithTTS: function (text, hold, complete) {
    this._active = true;
    this._hold = hold;
    var words = text.split(/[^\S-]/);
    var el = this._content;
    var idx = 1;
    var self = this;

    // --- Mobile Fallback ---
    // Use a timer-based approach on mobile because the 'onboundary' event is unreliable.
    if (this._isMobile) {
      // Define the onEnd callback for TTS
      var onEnd = function () {
        // Ensure the timer is cleared and all text is displayed
        if (self._mobileTTSTimer) {
          window.clearTimeout(self._mobileTTSTimer);
          self._mobileTTSTimer = null;
        }
        el.text(words.join(" "));

        self._active = false;
        if (!self._hold) {
          complete();
          self.hide();
        }
      };

      // Start TTS audio playback
      this._speakTTS(text, null, onEnd);

      // --- Simulated Word Streaming ---
      // Calculate word display speed based on TTS rate
      var timePerWord = (this.WORD_SPEAK_TIME / (this._ttsOptions.rate || 1.0));

      var addWord = function () {
        if (!self._active) return; // Stop if speech was cancelled
        if (idx > words.length) {
          // Stop when all words are displayed; TTS onEnd will handle completion.
          return;
        }
        el.text(words.slice(0, idx).join(" "));
        idx++;
        self._mobileTTSTimer = window.setTimeout(addWord, timePerWord);
      };

      addWord();
      return; // Exit, preventing desktop logic from running
    }

    // --- Desktop Logic (onboundary-based with timer fallback) ---
    var boundaryEventsReceived = 0;
    var lastBoundaryTime = Date.now();

    // Clear any existing fallback timer
    if (this._ttsFallbackTimer) {
      window.clearTimeout(this._ttsFallbackTimer);
      this._ttsFallbackTimer = null;
    }

    // Start fallback timer in case boundary events don't work (Chrome issue)
    var startFallbackTimer = function () {
      var timePerWord = (self.WORD_SPEAK_TIME / (self._ttsOptions.rate || 1.0)) * 1.2; // Slightly slower to be safe

      var addWord = function () {
        if (!self._active) return; // Stop if speech was cancelled
        if (idx > words.length) return;

        el.text(words.slice(0, idx).join(" "));
        idx++;

        if (idx <= words.length) {
          self._ttsFallbackTimer = window.setTimeout(addWord, timePerWord);
        }
      };

      // Start fallback after a short delay to allow boundary events to take precedence
      self._ttsFallbackTimer = window.setTimeout(addWord, 300);
    };

    this._speakTTS(text,
      // onWord callback
      function (charIndex, spokenWords) {
        boundaryEventsReceived++;
        lastBoundaryTime = Date.now();

        var currentWordIndex = 0;
        var charCount = 0;
        for (var i = 0; i < spokenWords.length; i++) {
          charCount += spokenWords[i].length + 1;
          if (charIndex < charCount) {
            currentWordIndex = i;
            break;
          }
        }
        if (currentWordIndex + 1 > idx) {
          idx = currentWordIndex + 1;
          el.text(words.slice(0, idx).join(" "));
        }
      },
      // onEnd callback
      function () {
        // Clear any pending fallback timer
        if (self._ttsFallbackTimer) {
          window.clearTimeout(self._ttsFallbackTimer);
          self._ttsFallbackTimer = null;
        }

        el.text(words.join(" "));
        self._active = false;
        if (!self._hold) {
          complete();
          self.hide();
        }
      }
    );

    // Start fallback timer for browsers that don't fire boundary events reliably
    startFallbackTimer();
  },

  close: function () {
    if (this._active) {
      this._hold = false;
    } else if (this._hold) {
      this._complete();
    }
  },

  pause: function () {
    window.clearTimeout(this._loop);
    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
    // Clear TTS fallback timer if active
    if (this._ttsFallbackTimer) {
      window.clearTimeout(this._ttsFallbackTimer);
      this._ttsFallbackTimer = null;
    }
  },

  resume: function () {
    if (this._addWord) this._addWord();
    this._hiding = window.setTimeout(
      $.proxy(this._finishHideBalloon, this),
      this.CLOSE_BALLOON_DELAY,
    );
  },

  /**************************** TTS Functionality ************************************/

  /**
   * Configure TTS settings
   * @param {Object} options - TTS configuration options
   * @param {SpeechSynthesisVoice} options.voice - Voice to use
   * @param {Number} options.rate - Speech rate (0.1 to 10)
   * @param {Number} options.pitch - Speech pitch (0 to 2)
   * @param {Number} options.volume - Speech volume (0 to 1)
   */
  setTTSOptions: function (options) {
    if (!this._ttsEnabled) return false;

    this._ttsOptions = $.extend({}, this._ttsOptions, options);
    return true;
  },

  /**
   * Get available TTS voices
   * @returns {Array} Array of available voices
   */
  getTTSVoices: function () {
    return window.System.speechManager.getVoices();
  },

  /**
   * Check if TTS is supported and enabled
   * @returns {Boolean}
   */
  isTTSEnabled: function () {
    return this._ttsUserEnabled;
  },

  setTTSEnabled: function (enabled) {
    this._ttsUserEnabled = this._ttsEnabled && enabled;
  },

  /**
   * Stop current TTS utterance
   */
  stopTTS: function () {
    window.System.speechManager.stop();
  },

  /**
   * Speak text using TTS (synchronized with visual word streaming)
   * @param {String} text - Text to speak
   * @param {Function} onWord - Callback fired for each word boundary
   * @param {Function} onEnd - Callback fired when speech ends
   */
  _speakTTS: function (text, onWord, onEnd) {
    if (!this._ttsEnabled || !text) {
      if (onEnd) onEnd();
      return;
    }

    var words = text.split(/[^\S-]/);
    window.System.speechManager.speak(text, {
      rate: this._ttsOptions.rate,
      pitch: this._ttsOptions.pitch,
      volume: this._ttsOptions.volume,
      voice: this._ttsOptions.voice,
      onBoundary: function (event) {
        if (event.name === 'word' && onWord) {
          onWord(event.charIndex, words);
        }
      },
      onEnd: onEnd
    });
  },
};

clippy.BASE_PATH = "clippy/agents/";

clippy.load = function (name, successCb, failCb) {
  var path = clippy.BASE_PATH + name;

  var mapDfd = clippy.load._loadMap(path);
  var agentDfd = clippy.load._loadAgent(name, path);
  var soundsDfd = clippy.load._loadSounds(name, path);

  var data;
  agentDfd.done(function (d) {
    data = d;
  });

  var sounds;

  soundsDfd.done(function (d) {
    sounds = d;
  });

  // wrapper to the success callback
  var cb = function () {
    var a = new clippy.Agent(path, data, sounds);
    successCb(a);
  };

  $.when(mapDfd, agentDfd, soundsDfd).done(cb).fail(failCb);
};

clippy.load._maps = {};
clippy.load._loadMap = function (path) {
  var dfd = clippy.load._maps[path];
  if (dfd) return dfd;

  // set dfd if not defined
  dfd = clippy.load._maps[path] = $.Deferred();

  var src = path + "/map.png";
  var img = new Image();

  img.onload = dfd.resolve;
  img.onerror = dfd.reject;

  // start loading the map;
  img.setAttribute("src", src);

  return dfd.promise();
};

clippy.load._sounds = {};

clippy.load._loadSounds = function (name, path) {
  var dfd = clippy.load._sounds[name];
  if (dfd) return dfd;

  // set dfd if not defined
  dfd = clippy.load._sounds[name] = $.Deferred();

  var audio = document.createElement("audio");
  var canPlayMp3 = !!audio.canPlayType && "" != audio.canPlayType("audio/mpeg");
  var canPlayOgg =
    !!audio.canPlayType &&
    "" != audio.canPlayType('audio/ogg; codecs="vorbis"');

  if (!canPlayMp3 && !canPlayOgg) {
    dfd.resolve({});
  } else {
    var src = path + (canPlayMp3 ? "/sounds-mp3.js" : "/sounds-ogg.js");
    // load
    clippy.load._loadScript(src);
  }

  return dfd.promise();
};

clippy.load._data = {};
clippy.load._loadAgent = function (name, path) {
  var dfd = clippy.load._data[name];
  if (dfd) return dfd;

  dfd = clippy.load._getAgentDfd(name);

  var src = path + "/agent.js";

  clippy.load._loadScript(src);

  return dfd.promise();
};

clippy.load._loadScript = function (src) {
  var script = document.createElement("script");
  script.setAttribute("src", src);
  script.setAttribute("async", "async");
  script.setAttribute("type", "text/javascript");

  document.head.appendChild(script);
};

clippy.load._getAgentDfd = function (name) {
  var dfd = clippy.load._data[name];
  if (!dfd) {
    dfd = clippy.load._data[name] = $.Deferred();
  }
  return dfd;
};

clippy.ready = function (name, data) {
  var dfd = clippy.load._getAgentDfd(name);
  dfd.resolve(data);
};

clippy.soundsReady = function (name, data) {
  var dfd = clippy.load._sounds[name];
  if (!dfd) {
    dfd = clippy.load._sounds[name] = $.Deferred();
  }

  dfd.resolve(data);
};

/******
 * Tiny Queue
 *
 * @constructor
 */
clippy.Queue = function (onEmptyCallback) {
  this._queue = [];
  this._onEmptyCallback = onEmptyCallback;
};

clippy.Queue.prototype = {
  /***
   *
   * @param {function(Function)} func
   * @returns {jQuery.Deferred}
   */
  queue: function (func) {
    this._queue.push(func);

    if (this._queue.length === 1 && !this._active) {
      this._progressQueue();
    }
  },

  _progressQueue: function () {
    // stop if nothing left in queue
    if (!this._queue.length) {
      this._onEmptyCallback();
      return;
    }

    var f = this._queue.shift();
    this._active = true;

    // execute function
    var completeFunction = $.proxy(this.next, this);
    f(completeFunction);
  },

  clear: function () {
    this._queue = [];
  },

  next: function () {
    this._active = false;
    this._progressQueue();
  },
};
