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
import { AGENT_NAMES } from '../../config/agents.js';
import { loadAgent } from './clippy-service.js';

window.clippyAppInstance = null;
let currentAgentName =
  getItem(LOCAL_STORAGE_KEYS.CLIPPY_AGENT_NAME) || "Clippy";

const activeBusyStates = new Set();

function setCurrentAgentName(name) {
  currentAgentName = name;
  setItem(LOCAL_STORAGE_KEYS.CLIPPY_AGENT_NAME, name);
}

function clearAllBusyStates() {
    const agent = window.clippyAgent;
    if (!agent) return;

    const clippyEl = agent._el;
    const balloonEl = agent._balloon._balloon;

    activeBusyStates.forEach(speakId => {
        releaseBusyState(speakId, clippyEl);
        releaseBusyState(speakId, balloonEl);
    });
    activeBusyStates.clear();
}

function showClippyInputBalloon() {
  const agent = window.clippyAgent;
  if (!agent) return;

  agent.ask({
    onAsk: (question) => {
      askClippy(agent, question);
    },
  });
}

async function askClippy(agent, question) {
  if (!question || question.trim().length === 0) return;

  const ttsEnabled = agent.isTTSEnabled();
  const clippyEl = agent._el;
  const balloonEl = agent._balloon._balloon;
  const speakId = `speak-${Date.now()}`;

  agent.speakAndAnimate("Let me think about it...", "Thinking", {
    useTTS: ttsEnabled,
  });

  try {
    const encodedQuestion = encodeURIComponent(question.trim());
    const response = await fetch(
      `https://resume-chat-api-nine.vercel.app/api/clippy-helper?query=${encodedQuestion}`,
    );
    const data = await response.json();

    requestBusyState(speakId, clippyEl);
    requestBusyState(speakId, balloonEl);
    activeBusyStates.add(speakId);

    // Streaming implementation using speakStream
    async function* answerStream() {
        for (const fragment of data) {
            const cleanAnswer = fragment.answer.replace(/\*\*/g, "");
            yield cleanAnswer + " ";
        }
    }

    await agent.speakStream(answerStream(), {
        tts: ttsEnabled
    });

  } catch (error) {
    agent.speakAndAnimate(
      "Sorry, I couldn't get an answer for that at this time!",
      "Wave",
      { useTTS: ttsEnabled },
    );
    console.error("API Error:", error);
  } finally {
      releaseBusyState(speakId, clippyEl);
      releaseBusyState(speakId, balloonEl);
      activeBusyStates.delete(speakId);
  }
}

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
              const goodbyeAnim = agent.getGoodbyeAnimation();
              agent.play(goodbyeAnim, 5000, () => {
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

let isLaunching = false;
export async function launchClippyApp(app, agentName = currentAgentName) {
  if (isLaunching) return;
  isLaunching = true;

  if (app) {
    window.clippyAppInstance = app;
  }
  const appInstance = app || window.clippyAppInstance;

  // Ensure the menu is removed if it exists
  const existingMenus = document.querySelectorAll(".menu-popup");
  existingMenus.forEach((menu) => menu.remove());

  const oldAgent = window.clippyAgent;
  if (oldAgent) {
    clearAllBusyStates();
    await new Promise((resolve) => {
      oldAgent.hide(false, () => {
        oldAgent.dispose();
        $(".clippy, .clippy-balloon").remove();
        resolve();
      });
    });
    window.clippyAgent = null;
  } else {
    $(".clippy, .clippy-balloon").remove();
  }

  try {
      const agent = await loadAgent(agentName);
      window.clippyAgent = agent;
      agent._el.setAttribute('data-testid', 'clippy-agent');

      const ttsUserPref = getItem(LOCAL_STORAGE_KEYS.CLIPPY_TTS_ENABLED) ?? true;
      agent.setTTSEnabled(ttsUserPref);

      agent.show();

      let contextMenuOpened = false;

      const ttsEnabled = agent.isTTSEnabled();

      agent.isSpeaking = false; // Initial state

      // Wrap the original speakAndAnimate function
      const originalSpeakAndAnimate = agent.speakAndAnimate;
      agent.speakAndAnimate = function (text, animation, options) {
        agent.isSpeaking = true;

        const clippyEl = agent._el;
        const balloonEl = agent._balloon._balloon;
        const speakId = `speak-${Date.now()}`;
        requestBusyState(speakId, clippyEl);
        requestBusyState(speakId, balloonEl);
        activeBusyStates.add(speakId);

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
            activeBusyStates.delete(speakId);
          },
        };
        return originalSpeakAndAnimate.call(this, text, animation, newOptions);
      };

      agent.speakAndAnimate(
        "Hey, there. Want quick answers to your questions? Just click me.",
        "Explain",
        { useTTS: ttsEnabled },
      );

      $(agent._el).on("click", (e) => {
        if (contextMenuOpened) {
          contextMenuOpened = false;
          return;
        }
        if (agent.isSpeaking) return;
        // Also check if a context menu is open
        if (document.querySelector(".menu-popup")) return;
        showClippyInputBalloon();
      });

      $(agent._el).on("contextmenu", function (e) {
        if (agent.isSpeaking) return;
        e.preventDefault();
        contextMenuOpened = true;
        showClippyContextMenu(e, appInstance);
      });
  } catch (error) {
      console.error("Failed to load clippy agent:", error);
  } finally {
      isLaunching = false;
  }
}

function startTutorial(agent) {
  if (!agent || agent.isSpeaking) return;

  agent.stop();
  const ttsEnabled = agent.isTTSEnabled();
  const $el = $(agent._el);
  const initialPos = $el.offset();

  const getElementCenter = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const playGesture = (x, y, callback) => {
    agent.gestureAt(x, y);
    // Gesture animations in clippyjs are just animations that are queued.
    // They don't have a direct callback but we can queue one.
    agent.delay(3000);
    agent._addToQueue((complete) => {
        if (callback) callback();
        complete();
    });
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
      $el.animate(
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
    $el.animate(
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

  const appsToTour = [
    { id: "internet-explorer", text: "Surf the web like it's 1999. Open any URL and Internet Explorer will load the page as it was in 1999. Really." },
    { id: "webamp", text: "Got some mp3 files? Play it with Winamp! Customize the skin as well!" },
    { id: "pinball", text: "Try playing a round of the classic Space Cadet Pinball game." },
    { id: "my-briefcase", text: "Drag files from your device to an open My Briefcase window to use it in Windows 98." },
    { id: "buy-me-a-coffee", text: "If you have some to spare, consider supporting this project to keep it alive and well." },
    { id: "file-readme", text: "For more information about the project, read the README.md file here." }
  ];

  appsToTour.forEach(app => {
      const iconEl = document.querySelector(`.desktop-icon[data-app-id="${app.id}"]`);
      if (iconEl) {
          const rect = iconEl.getBoundingClientRect();
          sequence.push((done) =>
            $el.animate(
              { top: rect.top, left: rect.left + 80 },
              1500,
              done,
            ),
          );
          sequence.push((done) => {
            toggleIconHighlight(iconEl, true);
            playGesture(rect.left, rect.top, () => {
              setTimeout(done, 500);
            });
          });
          sequence.push((done) =>
            agent.speakAndAnimate(
              app.text,
              "Explain",
              { useTTS: ttsEnabled, callback: done },
            ),
          );
          sequence.push((done) => {
            toggleIconHighlight(iconEl, false);
            done();
          });
      }
  });

  // 10. Return home
  sequence.push((done) =>
    $el.animate(
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
