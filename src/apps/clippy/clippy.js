import {
  getItem,
  setItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';
import {
  requestBusyState,
  releaseBusyState,
} from '../../system/busy-state-manager.js';
import { appManager } from '../../system/app-manager.js';

window.clippyAppInstance = null;
let currentAgentName =
  getItem(LOCAL_STORAGE_KEYS.CLIPPY_AGENT_NAME) || "Clippy";
let inputBalloonTimeout = null;

function setCurrentAgentName(name) {
  currentAgentName = name;
  setItem(LOCAL_STORAGE_KEYS.CLIPPY_AGENT_NAME, name);
}

function showClippyInputBalloon() {
  const agent = window.clippyAgent;
  if (!agent) return;

  agent.stop();

  const balloonContent = `
    <div class="clippy-input" style="display: flex; flex-direction: column; align-items: center; padding: 5px;">
      <b style="align-self: flex-start; margin-bottom: 5px;">What would you like to do?</b>
      <textarea rows="2" placeholder="Ask me anything..." style="width: 100%; margin-bottom: 10px; background-color: white; border: 1px solid grey; box-shadow: none; resize: none; font-family: inherit; font-size: inherit;"></textarea>
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <button class="ask-button default" style="margin-right: 5px; background-color: transparent; border: 1px solid grey; border-radius: 4px; width: 70px">Ask</button>
        <button class="cancel-button" style="background-color: transparent; border: 1px solid grey; border-radius: 4px; width: 70px">Cancel</button>
      </div>
    </div>
  `;

  agent._balloon.showHtml(balloonContent, true);

  const balloon = agent._balloon._balloon;
  const input = balloon.find("textarea");
  const askButton = balloon.find(".ask-button");
  const cancelButton = balloon.find(".cancel-button");

  input.focus();

  // Reposition balloon after a delay to allow for rendering
  setTimeout(() => {
    agent._balloon.reposition();
  }, 0);

  const resetBalloonTimeout = () => {
    if (inputBalloonTimeout) {
      clearTimeout(inputBalloonTimeout);
    }
    inputBalloonTimeout = setTimeout(() => {
      agent.closeBalloon();
    }, 60000); // 1 minute
  };

  const clearBalloonTimeout = () => {
    if (inputBalloonTimeout) {
      clearTimeout(inputBalloonTimeout);
    }
  };

  const askClippyHandler = () => {
    clearBalloonTimeout();
    const question = input.val();
    askClippy(agent, question);
    agent.closeBalloon();
  };

  input.on("keypress", (e) => {
    resetBalloonTimeout();
    if (e.which === 13) {
      e.preventDefault();
      askClippyHandler();
    }
  });

  askButton.on("click", askClippyHandler);

  cancelButton.on("click", () => {
    clearBalloonTimeout();
    agent.closeBalloon();
  });

  resetBalloonTimeout(); // Start the timer when the balloon is shown
}

async function askClippy(agent, question) {
  if (!question || question.trim().length === 0) return;

  const ttsEnabled = agent.isTTSEnabled();
  agent.speakAndAnimate("Let me think about it...", "Thinking", {
    useTTS: ttsEnabled,
  });

  try {
    const encodedQuestion = encodeURIComponent(question.trim());
    const response = await fetch(
      `https://resume-chat-api-nine.vercel.app/api/clippy-helper?query=${encodedQuestion}`,
    );
    const data = await response.json();

    for (const fragment of data) {
      const cleanAnswer = fragment.answer.replace(/\*\*/g, "");
      await agent.speakAndAnimate(cleanAnswer, fragment.animation, {
        useTTS: ttsEnabled,
      });
    }
  } catch (error) {
    agent.speakAndAnimate(
      "Sorry, I couldn't get an answer for that at this time!",
      "Wave",
      { useTTS: ttsEnabled },
    );
    console.error("API Error:", error);
  }
}

import { AGENT_NAMES } from '../../config/agents.js';

export function getClippyMenuItems(app) {
  const appInstance = app || window.clippyAppInstance;
  const agent = window.clippyAgent;
  if (!agent) {
    return [{ label: "Clippy not available", enabled: false }];
  }

  const ttsEnabled = agent.isTTSEnabled();

  return [
    {
      label: "&Animate",
      action: () => agent.animate(),
    },
    {
      label: "&Ask Clippy",
      default: true,
      action: () => showClippyInputBalloon(),
    },
    {
      label: "&Tutorial",
      action: () => {
        startTutorial(agent);
      },
    },
    {
      label: "Enable &TTS",
      checkbox: {
        check: () => getItem(LOCAL_STORAGE_KEYS.CLIPPY_TTS_ENABLED) ?? true,
        toggle: () => {
          const currentState =
            getItem(LOCAL_STORAGE_KEYS.CLIPPY_TTS_ENABLED) ?? true;
          const newState = !currentState;
          setItem(LOCAL_STORAGE_KEYS.CLIPPY_TTS_ENABLED, newState);
          if (agent) agent.setTTSEnabled(newState);
        },
      },
    },
    "MENU_DIVIDER",
    {
      label: "A&gent",
      submenu: [
        {
          radioItems: AGENT_NAMES.map((name) => ({ label: name, value: name })),
          getValue: () => currentAgentName,
          setValue: (value) => {
            if (currentAgentName !== value) {
              setCurrentAgentName(value);
              launchClippyApp(appInstance, value);
            }
          },
        },
      ],
    },
    "MENU_DIVIDER",
    {
      label: "&Close",
      action: () => {
        agent.speakAndAnimate(
          "Goodbye! Just open me again if you need any help!",
          "Wave",
          {
            useTTS: ttsEnabled,
            callback: () => {
              agent.play(agent.getGoodbyeAnimation(), 5000, () => {
                if (appInstance) {
                  appManager.closeApp(appInstance.id);
                }
              });
            },
          },
        );
      },
    },
  ];
}

export function showClippyContextMenu(event, app) {
  const menuItems = getClippyMenuItems(app);
  new window.ContextMenu(menuItems, event);
}

export function launchClippyApp(app, agentName = currentAgentName) {
  if (app) {
    window.clippyAppInstance = app;
  }
  const appInstance = app || window.clippyAppInstance;

  if (window.clippyAgent) {
    // Gracefully hide and remove the current agent before loading a new one
    window.clippyAgent.hide(() => {
      $(".clippy, .clippy-balloon").remove();
    });
  } else {
    $(".clippy, .clippy-balloon").remove();
  }

  // Ensure the menu is removed if it exists
  const existingMenus = document.querySelectorAll(".menu-popup");
  existingMenus.forEach((menu) => menu.remove());

  clippy.load(agentName, function (agent) {
    window.clippyAgent = agent;
    agent._el[0].setAttribute('data-testid', 'clippy-agent');

    const ttsUserPref = getItem(LOCAL_STORAGE_KEYS.CLIPPY_TTS_ENABLED) ?? true;
    agent.setTTSEnabled(ttsUserPref);

    agent.show();

    let contextMenuOpened = false;

    const ttsEnabled = agent.isTTSEnabled();
    if (ttsEnabled) {
      const setDefaultVoice = () => {
        const voices = agent.getTTSVoices();
        if (voices.length > 0) {
          // Improved voice selection logic
          const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

          // Prioritize male-sounding voices by name patterns
          let defaultVoice = englishVoices.find(
            (v) =>
              v.name.toLowerCase().includes("male") ||
              v.name.toLowerCase().includes("david") ||
              v.name.toLowerCase().includes("alex") ||
              v.name.toLowerCase().includes("fred") ||
              v.name.toLowerCase().includes("daniel") ||
              v.name.toLowerCase().includes("george") ||
              v.name.toLowerCase().includes("paul") ||
              v.name.toLowerCase().includes("tom") ||
              v.name.toLowerCase().includes("mark") ||
              v.name.toLowerCase().includes("james") ||
              v.name.toLowerCase().includes("michael"),
          );

          // If no male voice found, prefer voices that are NOT obviously female
          if (!defaultVoice) {
            const femaleNames = [
              "zira",
              "hazel",
              "samantha",
              "susan",
              "karen",
              "sara",
              "emma",
              "lucy",
              "anna",
            ];
            const nonFemaleVoices = englishVoices.filter(
              (v) =>
                !femaleNames.some((name) =>
                  v.name.toLowerCase().includes(name),
                ) && !v.name.toLowerCase().includes("female"),
            );

            if (nonFemaleVoices.length > 0) {
              defaultVoice = nonFemaleVoices[0]; // Take first non-female voice
            } else {
              defaultVoice = englishVoices[0]; // Fallback to any English voice
            }
          }

          agent.setTTSOptions({
            voice: defaultVoice,
            rate: 0.9,
            pitch: 0.9,
            volume: 0.8,
          });
        }
      };
      if (window.speechSynthesis.getVoices().length) {
        setDefaultVoice();
      } else {
        window.speechSynthesis.addEventListener(
          "voiceschanged",
          setDefaultVoice,
          { once: true },
        );
      }
    }

    agent.isSpeaking = false; // Initial state

    // Wrap the original speakAndAnimate function
    const originalSpeakAndAnimate = agent.speakAndAnimate;
    agent.speakAndAnimate = function (text, animation, options) {
      agent.isSpeaking = true;

      const clippyEl = agent._el[0];
      const balloonEl = agent._balloon._balloon[0];
      const speakId = `speak-${Date.now()}`;
      requestBusyState(speakId, clippyEl);
      requestBusyState(speakId, balloonEl);

      const originalCallback = options?.callback;
      const newOptions = {
        ...options,
        callback: () => {
          if (originalCallback) {
            originalCallback();
          }
          agent.isSpeaking = false;
          releaseBusyState(speakId, clippyEl);
          releaseBusyState(speakId, balloonEl);
        },
      };
      return originalSpeakAndAnimate.call(this, text, animation, newOptions);
    };

    agent.speakAndAnimate(
      "Hey, there. Want quick answers to your questions? Just click me.",
      "Explain",
      { useTTS: ttsEnabled },
    );

    agent._el.on("click", (e) => {
      if (contextMenuOpened) {
        contextMenuOpened = false;
        return;
      }
      if (agent.isSpeaking) return;
      // Also check if a context menu is open
      if (document.querySelector(".menu-popup")) return;
      showClippyInputBalloon();
    });

    agent._el.on("contextmenu", function (e) {
      if (agent.isSpeaking) return;
      e.preventDefault();
      contextMenuOpened = true;
      showClippyContextMenu(e, appInstance);
    });
  });
}

function startTutorial(agent) {
  if (!agent || agent.isSpeaking) return;

  agent.stop();
  const ttsEnabled = agent.isTTSEnabled();
  const initialPos = agent._el.offset();

  const getElementTopLeft = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  };

  const getElementCenter = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const playGesture = (x, y, callback) => {
    const direction = agent._getDirection(x, y);
    const gestureAnim = "Gesture" + direction;
    const lookAnim = "Look" + direction;
    const animation = agent.hasAnimation(gestureAnim) ? gestureAnim : lookAnim;
    agent.play(animation, 3000, callback);
  };

  const toggleIconHighlight = (iconEl, highlight) => {
    if (!iconEl) return;
    const iconImg = iconEl.querySelector(".icon img");
    const iconLabel = iconEl.querySelector(".icon-label");
    const action = highlight ? "add" : "remove";
    if (iconImg) iconImg.classList[action]("highlighted-icon");
    if (iconLabel) {
      iconLabel.classList[action]("highlighted-label", "selected");
    }
  };

  const startButton = getElementCenter(".start-button");
  const iconsArea = { x: 40, y: 100 };

  const sequence = [];

  // 1. Welcome
  sequence.push((done) =>
    agent.speakAndAnimate(
      "Hi! I'm Clippy, your Windows 98 assistant. Let me give you a quick tour of Windows 98.",
      "Explain",
      { useTTS: ttsEnabled, callback: done },
    ),
  );

  // 2. Start Menu
  if (startButton) {
    sequence.push((done) =>
      agent._el.animate(
        { top: startButton.y - 80, left: startButton.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) =>
      playGesture(startButton.x, startButton.y, () => {
        const startButtonEl = document.querySelector(".start-button");
        if (startButtonEl) {
          startButtonEl.classList.add("active");
          setTimeout(() => {
            startButtonEl.click(); // This opens the menu
            done(); // Done with opening the menu
          }, 500);
        } else {
          done();
        }
      }),
    );
    sequence.push((done) =>
      agent.speakAndAnimate(
        "The Start button gives you access to all your programs.",
        "Explain",
        {
          useTTS: ttsEnabled,
          callback: () => {
            const startButtonEl = document.querySelector(".start-button");
            if (startButtonEl) {
              startButtonEl.click(); // Click to close the menu
              startButtonEl.classList.remove("active"); // Remove the active class
            }
            done(); // Indicate that this sequence step is complete
          },
        },
      ),
    );
  }

  // 3. Desktop Icons
  sequence.push((done) =>
    agent._el.animate(
      { top: iconsArea.y, left: iconsArea.x + 100 },
      1500,
      done,
    ),
  );
  sequence.push((done) => playGesture(iconsArea.x, iconsArea.y, done));
  sequence.push((done) =>
    agent.speakAndAnimate(
      "On the left, you'll find desktop icons. Double-click them to launch any program.",
      "Explain",
      { useTTS: ttsEnabled, callback: done },
    ),
  );

  const internetExplorerIcon = getElementTopLeft(
    '.desktop-icon[data-app-id="internet-explorer"]',
  );
  const webampIcon = getElementTopLeft('.desktop-icon[data-app-id="webamp"]');
  const pinballIcon = getElementTopLeft('.desktop-icon[data-app-id="pinball"]');
  const briefcaseIcon = getElementTopLeft(
    '.desktop-icon[data-app-id="my-briefcase"]',
  );
  const coffeeIcon = getElementTopLeft(
    '.desktop-icon[data-app-id="buy-me-a-coffee"]',
  );
  const readmeIcon = getElementTopLeft(
    '.desktop-icon[data-app-id="file-readme"]',
  );

  // 4. Internet Explorer
  if (internetExplorerIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="internet-explorer"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: internetExplorerIcon.y, left: internetExplorerIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(internetExplorerIcon.x, internetExplorerIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "Surf the web like it's 1999. Open any URL and Internet Explorer will load the page as it was in 1999. Really.",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 5. Winamp
  if (webampIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="webamp"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: webampIcon.y, left: webampIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(webampIcon.x, webampIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "Got some mp3 files? Play it with Winamp! Customize the skin as well!",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 6. Pinball
  if (pinballIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="pinball"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: pinballIcon.y, left: pinballIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(pinballIcon.x, pinballIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "Try playing a round of the classic Space Cadet Pinball game.",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 7. My Briefcase
  if (briefcaseIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="my-briefcase"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: briefcaseIcon.y, left: briefcaseIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(briefcaseIcon.x, briefcaseIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "Drag files from your device to an open My Briefcase window to use it in Windows 98.",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 8. Buy me a coffee
  if (coffeeIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="buy-me-a-coffee"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: coffeeIcon.y, left: coffeeIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(coffeeIcon.x, coffeeIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "If you have some to spare, consider supporting this project to keep it alive and well.",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 9. Readme.md
  if (readmeIcon) {
    const iconEl = document.querySelector(
      '.desktop-icon[data-app-id="file-readme"]',
    );
    sequence.push((done) =>
      agent._el.animate(
        { top: readmeIcon.y, left: readmeIcon.x + 80 },
        1500,
        done,
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, true);
      playGesture(readmeIcon.x, readmeIcon.y, () => {
        setTimeout(done, 500);
      });
    });
    sequence.push((done) =>
      agent.speakAndAnimate(
        "For more information about the project, read the README.md file here.",
        "Explain",
        { useTTS: ttsEnabled, callback: done },
      ),
    );
    sequence.push((done) => {
      toggleIconHighlight(iconEl, false);
      done();
    });
  }

  // 10. Return home
  sequence.push((done) =>
    agent._el.animate(
      { top: initialPos.top, left: initialPos.left },
      2000,
      done,
    ),
  );
  sequence.push((done) =>
    agent.speakAndAnimate(
      "That's the tour! Feel free to play around with Windows 98. If you have any questions or need assistance, feel free to ask. Just click me!",
      "Wave",
      { useTTS: ttsEnabled, callback: done },
    ),
  );

  // --- Sequence Executor ---
  let currentIndex = 0;
  function runNext() {
    if (currentIndex < sequence.length) {
      const step = sequence[currentIndex];
      currentIndex++;
      step(runNext); // Pass the executor as the 'done' callback
    }
  }

  runNext();
}
