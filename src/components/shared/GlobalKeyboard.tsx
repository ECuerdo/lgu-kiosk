"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Delete, 
  CornerDownLeft, 
  ChevronDown, 
  Space, 
  ArrowUp, 
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [layout, setLayout] = useState<"lowercase" | "uppercase" | "symbols" | "numeric">("lowercase");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);

  const keyboardRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);

  // Monitor document focus events globally
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        
        // Skip hidden, checkbox, radio, file, etc.
        const type = inputEl.getAttribute("type") || "text";
        if (["checkbox", "radio", "file", "hidden", "submit", "button", "reset", "range"].includes(type)) {
          return;
        }

        setActiveInput(inputEl);
        setIsVisible(true);

        // Auto-switch to numeric layout for number/tel fields
        if (type === "number" || type === "tel") {
          setLayout("numeric");
        } else {
          setLayout("lowercase");
        }
      }
    };

    // Capture interactions in the capture phase before any React unmounting happens
    const handleInteractionCapture = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (
        keyboardRef.current?.contains(target) ||
        target.closest("[data-keyboard]")
      ) {
        isInteracting.current = true;
      }
    };

    const handleDocumentClick = (e: MouseEvent) => {
      if (isInteracting.current) {
        isInteracting.current = false;
        return;
      }

      const target = e.target as HTMLElement;
      
      // If we click outside the input and outside the keyboard, close it
      const clickedInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (!clickedInput) {
        setIsVisible(false);
        setActiveInput(null);
      }
    };

    const handleFocusOut = (_e: FocusEvent) => {
      setTimeout(() => {
        if (isInteracting.current) return;
        const active = document.activeElement;
        const isInputActive = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
        if (!isInputActive) {
          setIsVisible(false);
          setActiveInput(null);
        }
      }, 100);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    document.addEventListener("mousedown", handleInteractionCapture, { capture: true });
    document.addEventListener("touchstart", handleInteractionCapture, { capture: true });
    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("mousedown", handleInteractionCapture, { capture: true });
      document.removeEventListener("touchstart", handleInteractionCapture, { capture: true });
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  // Auto-close if the active input is removed from the DOM (e.g. page navigation or OTP success)
  useEffect(() => {
    if (!isVisible || !activeInput) return;

    const interval = setInterval(() => {
      if (!document.body.contains(activeInput)) {
        setIsVisible(false);
        setActiveInput(null);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible, activeInput]);

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;

    // Focus input to keep typing experience fluent
    activeInput.focus();

    if (key === "backspace") {
      // Dispatch keydown for backspace to allow custom handling (like in OTP inputs)
      const keyEvent = new KeyboardEvent("keydown", {
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        which: 8,
        bubbles: true,
        cancelable: true,
      });
      activeInput.dispatchEvent(keyEvent);
      
      // If the component moved focus during keydown (e.g. OTP moving to previous input), stop processing
      if (document.activeElement !== activeInput) {
        return;
      }
    }

    const start = activeInput.selectionStart ?? 0;
    const end = activeInput.selectionEnd ?? 0;
    const val = activeInput.value;

    let newVal = val;
    let newCursorPos = start;

    if (key === "backspace") {
      if (start === end) {
        if (start > 0) {
          newVal = val.slice(0, start - 1) + val.slice(start);
          newCursorPos = start - 1;
        }
      } else {
        newVal = val.slice(0, start) + val.slice(end);
        newCursorPos = start;
      }
    } else if (key === "space") {
      newVal = val.slice(0, start) + " " + val.slice(end);
      newCursorPos = start + 1;
    } else if (key === "enter") {
      // Dispatch submit or enter keypress event
      const keyEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      activeInput.dispatchEvent(keyEvent);
      
      // Blur if standard input or if we want to submit/close
      if (activeInput.tagName !== "TEXTAREA") {
        activeInput.blur();
        setIsVisible(false);
        return;
      } else {
        newVal = val.slice(0, start) + "\n" + val.slice(end);
        newCursorPos = start + 1;
      }
    } else if (key === "clear") {
      newVal = "";
      newCursorPos = 0;
    } else {
      newVal = val.slice(0, start) + key + val.slice(end);
      newCursorPos = start + key.length;
    }

    // Trigger standard React state updates
    const setter = Object.getOwnPropertyDescriptor(
      activeInput.tagName === "TEXTAREA" 
        ? window.HTMLTextAreaElement.prototype 
        : window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (setter) {
      setter.call(activeInput, newVal);
    } else {
      Object.assign(activeInput, { value: newVal });
    }

    // Fire the React input change event
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Only set cursor position if the input is still focused
    if (document.activeElement === activeInput) {
      setTimeout(() => {
        if (document.activeElement === activeInput) {
          activeInput.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }

    // If shift was active and we typed a standard letter, turn off shift (unless caps lock is on)
    if (isShiftActive && key !== "backspace" && key !== "space") {
      setIsShiftActive(false);
      if (layout === "uppercase" && !isCapsLock) {
        setLayout("lowercase");
      }
    }
  };

  const toggleShift = () => {
    if (isCapsLock) {
      setIsCapsLock(false);
      setIsShiftActive(false);
      setLayout("lowercase");
    } else if (isShiftActive) {
      setIsCapsLock(true);
      setLayout("uppercase");
    } else {
      setIsShiftActive(true);
      setLayout("uppercase");
    }
  };

  // Keyboard layout key arrays
  const keys = {
    lowercase: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
      ["123", "space", "clear", "enter"]
    ],
    uppercase: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["shift", "Z", "X", "C", "V", "B", "N", "M", "backspace"],
      ["123", "space", "clear", "enter"]
    ],
    symbols: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["-", "/", ":", ";", "(", ")", "$", "&", "@", `"`],
      ["[", "]", "{", "}", "#", "%", "^", "*", "+", "=", "\\"],
      ["abc", ".", ",", "?", "!", "_", "backspace"],
      ["clear", "space", "enter"]
    ],
    numeric: [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["clear", "0", "backspace"],
      ["enter"]
    ]
  };

  const renderKey = (key: string, index: number) => {
    // Large special keys classes
    let keyClass = "h-12 flex-1 font-semibold rounded-lg text-sm transition-all duration-100 flex items-center justify-center select-none active:scale-95 active:bg-emerald-500 text-white shadow-md ";

    if (key === "shift") {
      const isShifted = isShiftActive || isCapsLock;
      keyClass += isShifted 
        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 border border-emerald-400" 
        : "bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-800/50";
      return (
        <Button
          key={`shift-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            toggleShift();
          }}
        >
          <ArrowUp className={`w-4 h-4 ${isCapsLock ? "fill-slate-900" : ""}`} />
        </Button>
      );
    }

    if (key === "backspace") {
      keyClass += "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 max-w-[90px] md:max-w-[120px]";
      return (
        <Button
          key={`backspace-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            handleKeyPress("backspace");
          }}
        >
          <Delete className="w-4 h-4" />
        </Button>
      );
    }

    if (key === "enter") {
      keyClass += "bg-emerald-600 hover:bg-emerald-500 hover:text-emerald-50 border border-emerald-500 flex-grow font-black";
      return (
        <Button
          key={`enter-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            handleKeyPress("enter");
          }}
        >
          <span className="mr-1.5 text-xs tracking-wider uppercase font-bold">Done</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </Button>
      );
    }

    if (key === "space") {
      keyClass += "bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-800/30 flex-[3]";
      return (
        <Button
          key={`space-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            handleKeyPress("space");
          }}
        >
          <Space className="w-4 h-4 opacity-50" />
        </Button>
      );
    }

    if (key === "123") {
      keyClass += "bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/50 text-xs tracking-wider max-w-[80px]";
      return (
        <Button
          key={`layout-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            setLayout("symbols");
          }}
        >
          ?123
        </Button>
      );
    }

    if (key === "abc") {
      keyClass += "bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/50 text-xs tracking-wider max-w-[80px]";
      return (
        <Button
          key={`layout-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            setLayout("lowercase");
          }}
        >
          ABC
        </Button>
      );
    }

    if (key === "clear") {
      keyClass += "bg-red-950/40 hover:bg-red-900/60 border border-red-900/30 text-red-200 text-xs uppercase font-bold max-w-[80px]";
      return (
        <Button
          key={`clear-${index}`}
          variant="outline"
          className={keyClass}
          onPointerDown={(e) => {
            e.preventDefault();
            handleKeyPress("clear");
          }}
        >
          Clear
        </Button>
      );
    }

    // Standard character key
    keyClass += "bg-emerald-900/50 hover:bg-emerald-800/75 border border-emerald-800/30 text-base md:text-lg font-medium";
    return (
      <Button
        key={`key-${key}-${index}`}
        variant="outline"
        className={keyClass}
        onPointerDown={(e) => {
          e.preventDefault();
          handleKeyPress(key);
        }}
      >
        {key}
      </Button>
    );
  };

  // Build key rows based on selected layout
  const activeKeys = keys[layout] || keys.lowercase;

  return (
    <>


      {/* Keyboard Panel Container */}
      <div
        ref={keyboardRef}
        data-keyboard="true"
        className={`fixed left-0 right-0 bottom-0 z-[999999] w-full p-4 pb-6 transition-all duration-300 ease-in-out transform shadow-[0_-15px_30px_-5px_rgba(4,120,87,0.3)] bg-gradient-to-b from-slate-950/95 to-slate-900/98 backdrop-blur-xl border-t border-emerald-500/20 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Header toolbar */}
          <div className="flex justify-between items-center px-1 border-b border-emerald-500/10 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                Kiosk Keyboard
                <Sparkles className="w-3 h-3 text-emerald-300" />
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Layout switcher quick helpers */}
              {layout !== "numeric" && (
                <div className="flex rounded-md overflow-hidden border border-emerald-500/20 bg-slate-950/50 p-0.5">
                  <Button
                    variant="ghost"
                    className={`h-6 px-2 text-[10px] uppercase font-bold rounded ${
                      layout === "lowercase" || layout === "uppercase"
                        ? "bg-emerald-900/50 text-emerald-400"
                        : "text-slate-400"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setLayout("lowercase");
                    }}
                  >
                    ABC
                  </Button>
                  <Button
                    variant="ghost"
                    className={`h-6 px-2 text-[10px] uppercase font-bold rounded ${
                      layout === "symbols" ? "bg-emerald-900/50 text-emerald-400" : "text-slate-400"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setLayout("symbols");
                    }}
                  >
                    Symbols
                  </Button>
                </div>
              )}
              
              <Button
                variant="ghost"
                className="h-7 w-7 rounded-full hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 flex items-center justify-center p-0"
                onClick={() => setIsVisible(false)}
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Keyboard Grid */}
          <div className={`flex flex-col gap-2 ${layout === "numeric" ? "max-w-xs mx-auto" : ""}`}>
            {activeKeys.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="flex gap-1.5 w-full justify-center">
                {row.map((key, keyIndex) => renderKey(key, keyIndex))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
