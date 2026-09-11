import React, { useState, useCallback, useRef, useEffect } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@500;600;700&display=swap');`;

function formatNumber(value) {
  if (value === "Error") return value;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "0";
  if (!Number.isFinite(num)) return "Error";
  const str = value.toString();
  if (str.includes(".") && !str.endsWith(".")) {
    const parts = str.split(".");
    if (parts[1].length > 8) return num.toPrecision(10).replace(/\.?0+$/, "");
  }
  if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential(4);
  }
  return str;
}

function compute(a, b, op) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  switch (op) {
    case "+": return x + y;
    case "−": return x - y;
    case "×": return x * y;
    case "÷": return y === 0 ? NaN : x / y;
    default: return y;
  }
}

const opSymbol = { "+": "+", "−": "−", "×": "×", "÷": "÷" };

export default function AddingMachine() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState(null);
  const [operator, setOperator] = useState(null);
  const [overwrite, setOverwrite] = useState(true);
  const [tape, setTape] = useState([]);
  const [pressed, setPressed] = useState(null);
  const tapeEndRef = useRef(null);

  useEffect(() => {
    tapeEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [tape]);

  const press = (id) => {
    setPressed(id);
    setTimeout(() => setPressed((p) => (p === id ? null : p)), 100);
  };

  const printLine = (text, kind) => {
    setTape((t) => [...t.slice(-11), { text, kind, id: Date.now() + Math.random() }]);
  };

  const inputDigit = useCallback(
    (digit) => {
      if (display === "Error") {
        setDisplay(digit);
        setOverwrite(false);
        return;
      }
      if (overwrite) {
        setDisplay(digit === "." ? "0." : digit);
        setOverwrite(false);
      } else {
        if (digit === "." && display.includes(".")) return;
        if (display === "0" && digit !== ".") setDisplay(digit);
        else setDisplay(display + digit);
      }
    },
    [display, overwrite]
  );

  const clearAll = () => {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setOverwrite(true);
    printLine("— cleared —", "meta");
  };

  const clearTape = () => setTape([]);

  const toggleSign = () => {
    if (display === "0" || display === "Error") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  };

  const percent = () => {
    const num = parseFloat(display);
    if (Number.isNaN(num)) return;
    setDisplay(formatNumber(String(num / 100)));
    setOverwrite(true);
  };

  const chooseOperator = (nextOp) => {
    if (display === "Error") return;
    if (operator && !overwrite) {
      const result = compute(stored, display, operator);
      const formatted = formatNumber(String(result));
      printLine(`${stored} ${opSymbol[operator]} ${display}`, "entry");
      printLine(`= ${formatted}`, "subtotal");
      setDisplay(formatted);
      setStored(formatted);
    } else {
      setStored(display);
    }
    setOperator(nextOp);
    setOverwrite(true);
  };

  const equals = () => {
    if (operator === null || stored === null) return;
    const result = compute(stored, display, operator);
    const formatted = formatNumber(String(result));
    printLine(`${stored} ${opSymbol[operator]} ${display}`, "entry");
    printLine(`TOTAL  ${formatted}`, "total");
    setDisplay(formatted);
    setStored(null);
    setOperator(null);
    setOverwrite(true);
  };

  const backspace = () => {
    setDisplay((d) => {
      if (d === "Error" || d.length <= 1) return "0";
      return d.slice(0, -1);
    });
  };

  useEffect(() => {
    const handler = (e) => {
      const { key } = e;
      if (/^[0-9]$/.test(key)) { inputDigit(key); press(key); }
      else if (key === ".") { inputDigit("."); press("."); }
      else if (key === "+") { chooseOperator("+"); press("plus"); }
      else if (key === "-") { chooseOperator("−"); press("minus"); }
      else if (key === "*") { chooseOperator("×"); press("times"); }
      else if (key === "/") { e.preventDefault(); chooseOperator("÷"); press("divide"); }
      else if (key === "Enter" || key === "=") { equals(); press("equals"); }
      else if (key === "Escape") { clearAll(); press("clear"); }
      else if (key === "%") { percent(); press("percent"); }
      else if (key === "Backspace") { backspace(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const keyStyle = (bg, fg, id) => ({
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: "19px",
    fontWeight: 600,
    border: "none",
    borderRadius: "8px",
    height: "58px",
    color: fg,
    background: bg,
    cursor: "pointer",
    boxShadow:
      pressed === id
        ? "inset 0 2px 3px rgba(0,0,0,0.45)"
        : "0 3px 0 rgba(0,0,0,0.35), 0 4px 6px rgba(0,0,0,0.25)",
    transform: pressed === id ? "translateY(2px)" : "translateY(0)",
    transition: "transform 70ms ease, box-shadow 70ms ease",
    userSelect: "none",
  });

  const digitKey = (id) => keyStyle("#EDE7D9", "#2B2823", id);
  const funcKey = (id) => keyStyle("#4A4640", "#EDE7D9", id);
  const opKey = (id) => keyStyle("#B23A2E", "#FBEDE9", id);
  const totalKey = (id) => keyStyle("#2F6F52", "#EAF6EF", id);

  const tapeLineStyle = (kind) => {
    const base = {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "14px",
      padding: "1px 0",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    };
    if (kind === "total") return { ...base, fontWeight: 600, color: "#1E4A38", borderTop: "1px dashed #C9C2AE", marginTop: "3px", paddingTop: "4px" };
    if (kind === "subtotal") return { ...base, color: "#6B655A" };
    if (kind === "meta") return { ...base, color: "#A79E8C", fontStyle: "italic" };
    return { ...base, color: "#3A362F" };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#141210",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <style>{FONT_IMPORT}</style>
      <div
        style={{
          width: "360px",
          background: "linear-gradient(180deg, #2A2622 0%, #211E1B 100%)",
          borderRadius: "18px 18px 26px 26px",
          padding: "18px 18px 22px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
          border: "1px solid #3A362F",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "2px 6px 12px",
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#8B8477",
            }}
          >
            Model 240 Adding Machine
          </span>
          <button
            onClick={clearTape}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#8B8477",
              background: "none",
              border: "1px solid #4A453D",
              borderRadius: "5px",
              padding: "3px 7px",
              cursor: "pointer",
            }}
          >
            new tape
          </button>
        </div>

        {/* Paper tape */}
        <div
          style={{
            background: "#F7F3E7",
            borderRadius: "4px 4px 2px 2px",
            padding: "10px 14px",
            height: "132px",
            overflowY: "auto",
            boxShadow: "inset 0 3px 8px rgba(0,0,0,0.25)",
            marginBottom: "4px",
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent, transparent 21px, rgba(0,0,0,0.03) 22px)",
          }}
        >
          {tape.length === 0 && (
            <div style={{ ...tapeLineStyle("meta") }}>tape is empty — start calculating</div>
          )}
          {tape.map((line) => (
            <div key={line.id} style={tapeLineStyle(line.kind)}>
              {line.text}
            </div>
          ))}
          <div ref={tapeEndRef} />
        </div>

        {/* Zig-zag tear edge */}
        <svg viewBox="0 0 340 10" width="100%" height="10" style={{ display: "block", marginBottom: "12px" }}>
          <polygon
            points="0,0 8,10 16,0 24,10 32,0 40,10 48,0 56,10 64,0 72,10 80,0 88,10 96,0 104,10 112,0 120,10 128,0 136,10 144,0 152,10 160,0 168,10 176,0 184,10 192,0 200,10 208,0 216,10 224,0 232,10 240,0 248,10 256,0 264,10 272,0 280,10 288,0 296,10 304,0 312,10 320,0 328,10 336,0 340,5 340,0 0,0"
            fill="#2A2622"
          />
        </svg>

        {/* Current entry display */}
        <div
          style={{
            background: "#EDE7D9",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "14px",
            textAlign: "right",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              color: "#8A8478",
              minHeight: "14px",
              marginBottom: "2px",
            }}
          >
            {stored !== null ? `${stored} ${opSymbol[operator]}` : "\u00A0"}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: display.length > 9 ? "28px" : "38px",
              fontWeight: 600,
              color: "#211E1B",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "9px" }}>
          <button style={funcKey("clear")} onClick={() => { clearAll(); press("clear"); }}>C</button>
          <button style={funcKey("sign")} onClick={() => { toggleSign(); press("sign"); }}>±</button>
          <button style={funcKey("percent")} onClick={() => { percent(); press("percent"); }}>%</button>
          <button style={opKey("divide")} onClick={() => { chooseOperator("÷"); press("divide"); }}>÷</button>

          {["7", "8", "9"].map((d) => (
            <button key={d} style={digitKey(d)} onClick={() => { inputDigit(d); press(d); }}>{d}</button>
          ))}
          <button style={opKey("times")} onClick={() => { chooseOperator("×"); press("times"); }}>×</button>

          {["4", "5", "6"].map((d) => (
            <button key={d} style={digitKey(d)} onClick={() => { inputDigit(d); press(d); }}>{d}</button>
          ))}
          <button style={opKey("minus")} onClick={() => { chooseOperator("−"); press("minus"); }}>−</button>

          {["1", "2", "3"].map((d) => (
            <button key={d} style={digitKey(d)} onClick={() => { inputDigit(d); press(d); }}>{d}</button>
          ))}
          <button style={opKey("plus")} onClick={() => { chooseOperator("+"); press("plus"); }}>+</button>

          <button style={{ ...digitKey("0"), gridColumn: "span 2" }} onClick={() => { inputDigit("0"); press("0"); }}>0</button>
          <button style={digitKey(".")} onClick={() => { inputDigit("."); press("."); }}>.</button>
          <button style={totalKey("equals")} onClick={() => { equals(); press("equals"); }}>=</button>
        </div>
      </div>
    </div>
  );
}