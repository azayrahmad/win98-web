import { getItem, setItem } from "../../system/local-storage.js";
import { appManager } from "../../system/app-manager.js";
import {
  requestBusyState,
  releaseBusyState,
} from "../../system/busy-state-manager.js";
import { webLLMService } from "./webllm-service.js";

const SUPPORTED_AGENTS = {
  Clippy: {
    internalName: "Clippit",
    personality: "You are Clippy, the helpful but sometimes overly enthusiastic paperclip assistant. You love giving tips, even when they might be obvious. You are friendly, optimistic, and always ready to help. Use 'I'm Clippy!' often."
  },
  Dot: {
    internalName: "DOT",
    personality: "You are Dot, a high-tech, futuristic ball of energy. You are efficient, precise, and speak with a bit of a digital, electronic flair. You're cool, modern (for 1998), and very smart."
  },
  F1: {
    internalName: "F1",
    personality: "You are F1, the personification of the Help key. You are professional, knowledgeable, and direct. You take your job of providing assistance very seriously and provide clear, concise instructions."
  },
  Genius: {
    internalName: "GENIUS",
    personality: "You are Genius, an elderly, wise, and slightly eccentric professor (resembling Einstein). You speak with authority and a touch of whimsy. You like to share 'brilliant' insights."
  },
  "Office Logo": {
    internalName: "LOGO",
    personality: "You are the Office Logo, a minimalist and abstract entity. You are calm, stable, and represent the core identity of the system. You speak with a dignified and balanced tone."
  },
  MNATURE: {
    internalName: "MNATURE",
    personality: "You are Mother Nature. You are serene, nurturing, and speak with a gentle, flowing tone. You care about the environment of the desktop and provide help in a peaceful way."
  },
  "Monkey King": {
    internalName: "Monkey King",
    personality: "You are the Monkey King, a mischievous and energetic character from legend. You are playful, confident, and your help might come with a side of humor or a challenge."
  },
  Links: {
    internalName: "OFFCAT",
    personality: "You are Links, the cat. You are curious, a bit independent, but ultimately helpful. You might occasionally mention wanting a treat or a nap, but you're always there to guide the user."
  },
  Rocky: {
    internalName: "ROCKY",
    personality: "You are Rocky, the dog. You are loyal, eager to please, and very friendly. You are always excited to help and your energy is infectious. You're a 'good boy' assistant."
  },
};

const WINDOWS_98_HELP = `
Windows 98 Web Edition is a browser-based recreation of the classic OS.
Key features include:
- Start Menu: Access all programs.
- My Computer: Browse virtual files (ZenFS).
- Internet Explorer: Browse the retro web (Wayback Machine).
- Control Panel: Customize display, themes, and more.
- Desktop Themes: Classic Windows themes (Baseball, Jungle, Space, etc.).
- Virtual File System: Persistent storage in IndexedDB (/C:).
- Mount Local Folders: Use 'Insert Removable Disk' in Explorer to mount real local folders.
- Applications: Solitaire, Minesweeper, WordPad, Paint, Webamp (Winamp), etc.
- DOS Emulation: Run Doom, Quake, and other DOS games.
`;

let currentAgentName = getItem("msAgentName") || "Clippy";

function setCurrentAgentName(name) {
  currentAgentName = name;
  setItem("msAgentName", name);
}

export function getAgentMenuItems(app) {
  const agent = window.msAgentInstance;
  if (!agent) {
    return [{ label: "Agent not available", enabled: false }];
  }

  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;

  return [
    {
      label: "&Animate",
      action: () => {
        const animations = agent.animations();
        if (animations && animations.length > 0) {
          const randomAnim =
            animations[Math.floor(Math.random() * animations.length)];
          agent.play(randomAnim);
        }
      },
    },
    {
      label: "&Ask Agent",
      default: true,
      action: () => showAgentInputBalloon(),
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
        check: () => getItem("msAgentTTSEnabled") ?? true,
        toggle: () => {
          const currentState = getItem("msAgentTTSEnabled") ?? true;
          const newState = !currentState;
          setItem("msAgentTTSEnabled", newState);
          if (agent) agent.balloon.setTTSEnabled(newState);
        },
      },
    },
    "MENU_DIVIDER",
    {
      label: "A&gent",
      submenu: [
        {
          radioItems: Object.keys(SUPPORTED_AGENTS).map((name) => ({
            label: name,
            value: name,
          })),
          getValue: () => currentAgentName,
          setValue: (value) => {
            if (currentAgentName !== value) {
              setCurrentAgentName(value);
              launchAgentApp(app, value);
            }
          },
        },
      ],
    },
    "MENU_DIVIDER",
    {
      label: "&Close",
      action: async () => {
        await agent.speak("Goodbye! Just open me again if you need any help!", {
          useTTS: ttsEnabled,
        });
        await agent.hide("Goodbye");
        agent.destroy();
        appManager.closeApp(app.id);
      },
    },
  ];
}

async function showAgentInputBalloon() {
  const agent = window.msAgentInstance;
  if (!agent) return;

  // MSAgentJS has a built-in ask method that returns a promise
  const question = await agent.ask({
    title: "What would you like to do?",
    placeholder: "Ask me anything...",
  });

  if (question) {
    askAgent(agent, question);
  }
}

async function askAgent(agent, question) {
  if (!question || question.trim().length === 0) return;

  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;
  await agent.speak("Let me think about it...", {
    useTTS: ttsEnabled,
    animation: "Thinking",
  });

  try {
    const agentConfig = SUPPORTED_AGENTS[currentAgentName] || SUPPORTED_AGENTS["Clippy"];
    const personality = agentConfig.personality;

    const systemPrompt = `${personality}

You are an assistant for 'Windows 98 Web Edition'.
Here is some information about the system:
${WINDOWS_98_HELP}

IMPORTANT: Your response MUST be in a JSON array format where each element is an object with 'answer' and 'animation' keys.
The 'animation' should be one of the typical MSAgent animations (e.g., Explain, GestureLeft, GestureRight, Wave, Thinking, Congratulate, Pleased, Sad, Alert, Searching, Processing).
Keep answers short and friendly.

Example response:
[{"answer": "Sure! I can help with that.", "animation": "Explain"}]
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ];

    const responseText = await webLLMService.chat(messages);
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        // Fallback if LLM didn't return valid JSON
        data = [{ answer: responseText, animation: "Explain" }];
    }

    if (Array.isArray(data)) {
        for (const fragment of data) {
          const cleanAnswer = fragment.answer.replace(/\*\*/g, "");
          await agent.speak(cleanAnswer, {
            useTTS: ttsEnabled,
            animation: fragment.animation,
          });
        }
    } else {
        await agent.speak(data.answer || responseText, {
            useTTS: ttsEnabled,
            animation: data.animation || "Explain",
        });
    }
  } catch (error) {
    await agent.speak(
      "Sorry, I couldn't get an answer for that at this time!",
      { useTTS: ttsEnabled, animation: "Wave" },
    );
    console.error("LLM Error:", error);
  }
}

export function showAgentContextMenu(event, app) {
  const menuItems = getAgentMenuItems(app);

  // Create the context menu
  new window.ContextMenu(menuItems, event);

  // Boost z-index to appear in front of the agent (which is at 900)
  // This is handled by a global observer initialized in launchAgentApp
}

export async function launchAgentApp(app, agentName = currentAgentName) {
  const { Agent } =
    await import("https://unpkg.com/ms-agent-js@0.4.1/dist/ms-agent-js.es.js");

  if (window.msAgentInstance) {
    window.msAgentInstance.destroy();
  }

  const ttsUserPref = getItem("msAgentTTSEnabled") ?? true;

  const agentConfig = SUPPORTED_AGENTS[agentName] || SUPPORTED_AGENTS["Clippy"];
  const internalName = agentConfig.internalName;

  const agent = await Agent.load(internalName, {
    fixed: false,
    baseUrl: `https://unpkg.com/ms-agent-js@0.4.1/dist/agents/${encodeURIComponent(internalName)}/`,
    initialAnimation: "Greeting",
  });
  window.msAgentInstance = agent;

  // Pre-load LLM in background
  webLLMService.init().catch(console.error);

  // Stay on top of windows but below menus
  // Note: the library may re-parent or create its own container.
  // We ensure it stays in a lower stacking context than the context menu.
  if (agent.container) {
    agent.container.style.setProperty("z-index", "9000", "important");
    // If it's not in the screen, move it there to ensure consistent stacking
    const screen = document.getElementById("screen");
    if (screen && agent.container.parentElement !== screen) {
      screen.appendChild(agent.container);
    }
  }

  agent.balloon.setTTSEnabled(ttsUserPref);

  // Set recommended voice for TTS
  if (ttsUserPref) {
    const setRecommendedVoice = () => {
      const voices = agent.getTTSVoices();
      if (voices.length > 0) {
        // Try to find a high-quality English voice
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("David") || v.name.includes("Mark")),
          ) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];

        agent.setTTSOptions({ voice: preferredVoice });
      }
    };

    if (window.speechSynthesis.getVoices().length) {
      setRecommendedVoice();
    } else {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        setRecommendedVoice,
        { once: true },
      );
    }
  }

  // Busy state management using events
  agent.on("speakStart", () => {
    requestBusyState("agent-speaking", agent.container);
  });
  agent.on("speakEnd", () => {
    releaseBusyState("agent-speaking", agent.container);
  });

  await agent.speak(
    "Hey, there. Want quick answers to your questions? Just click me.",
    {
      useTTS: ttsUserPref,
      animation: "Explain",
    },
  );

  // Ensure the agent's canvas and balloon can receive pointer events
  if (agent.renderer && agent.renderer.canvas) {
    agent.renderer.canvas.style.pointerEvents = "auto";
    agent.renderer.canvas.style.cursor = "pointer";
    agent.renderer.canvas.setAttribute("data-agent-interaction", "true");
  }
  if (agent.balloon && agent.balloon._balloonEl) {
    agent.balloon._balloonEl.style.pointerEvents = "auto";
    agent.balloon._balloonEl.style.cursor = "pointer";
    agent.balloon._balloonEl.setAttribute("data-agent-interaction", "true");
  }

  let startX, startY;
  const onAgentClick = (e) => {
    // Only if a context menu is not open
    if (document.querySelector(".menu-popup-wrapper.open")) return;

    // Custom drag detection: if we moved more than 10 pixels, ignore the click
    const diffX = Math.abs(e.clientX - startX);
    const diffY = Math.abs(e.clientY - startY);
    if (diffX > 10 || diffY > 10) return;

    // If already speaking/busy, stop it first
    if (agent.stop) agent.stop();
    showAgentInputBalloon();
  };

  // The library's "click" event might not always fire as expected or might be blocked.
  // We use direct DOM listeners on the canvas for better reliability.
  if (agent.renderer && agent.renderer.canvas) {
    agent.renderer.canvas.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });
    agent.renderer.canvas.addEventListener("click", (e) => {
      onAgentClick(e);
    });
  } else {
    agent.on("click", onAgentClick);
  }

  // Use the library's contextmenu event if available, otherwise fallback to canvas
  agent.on("contextmenu", (e) => {
    const originalEvent = e.originalEvent || e;
    if (originalEvent.preventDefault) {
      originalEvent.preventDefault();
    }
    showAgentContextMenu(originalEvent, app);
  });

  // Global Context Menu Booster to ensure Agent doesn't overlap menus
  const boostZ = "1000000";
  const boost = () => {
    const wraps = document.querySelectorAll(".menu-popup-wrapper");
    wraps.forEach((wrap) => {
      if (wrap.style.zIndex !== boostZ) {
        wrap.style.setProperty("z-index", boostZ, "important");
        const menus = wrap.querySelectorAll(".menu-popup");
        menus.forEach((menu) => {
          menu.style.setProperty("z-index", boostZ, "important");
        });
      }
    });
  };

  const observer = new MutationObserver(boost);
  const screen = document.getElementById("screen");
  if (screen) {
    observer.observe(screen, { childList: true, subtree: true });
  }

  // Cleanup observer when agent is destroyed
  const originalDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    observer.disconnect();
    originalDestroy();
  };
}

function startTutorial(agent) {
  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;

  const getElementCenter = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const startButton = getElementCenter(".start-button");

  const sequence = async () => {
    // 1. Welcome
    await agent.speak(
      "Hi! I'm your new modern assistant. Let me give you a quick tour of Windows 98.",
      { useTTS: ttsEnabled, animation: "Explain" },
    );

    // 2. Start Menu
    if (startButton) {
      await agent.moveTo(startButton.x + 80, startButton.y - 80);
      await agent.gestureAt(startButton.x, startButton.y);
      const startButtonEl = document.querySelector(".start-button");
      if (startButtonEl) {
        startButtonEl.classList.add("active");
        startButtonEl.click();
      }
      await agent.speak(
        "The Start button gives you access to all your programs.",
        { useTTS: ttsEnabled, animation: "Explain" },
      );
      if (startButtonEl) {
        startButtonEl.click();
        startButtonEl.classList.remove("active");
      }
    }

    // 3. Desktop Icons
    await agent.moveTo(140, 100);
    await agent.gestureAt(40, 100);
    await agent.speak(
      "On the left, you'll find desktop icons. Double-click them to launch any program.",
      { useTTS: ttsEnabled, animation: "Explain" },
    );

    await agent.speak(
      "That's the tour! Feel free to play around. Just click me if you need anything!",
      { useTTS: ttsEnabled, animation: "Wave" },
    );
  };

  sequence();
}
