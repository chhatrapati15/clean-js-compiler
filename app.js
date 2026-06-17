let editor;

const STORAGE_KEY = "sweetjs_code";
const THEME_KEY = "sweetjs_theme";

const els = {
  run: document.getElementById("run"),
  clear: document.getElementById("clear"),
  theme: document.getElementById("theme"),
  autorun: document.getElementById("autorun"),
  output: document.getElementById("output"),
  status: document.getElementById("status"),
  sandbox: document.getElementById("sandbox"),
};

let debounceId = null;

let isDark =
  localStorage.getItem(THEME_KEY) !== "light";

function setStatus(text, color) {
  els.status.textContent = text;

  if (color) {
    els.status.style.color = color;
  }
}

function clearOutput() {
  els.output.innerHTML = "";
}

function appendLine(type, message) {
  const line = document.createElement("div");

  line.className = `log-line log-${type}`;

  line.textContent = message;

  els.output.appendChild(line);

  els.output.scrollTop =
    els.output.scrollHeight;
}

function saveCode() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      editor.getValue()
    );
  } catch {}
}

function getDefaultCode() {
  return `console.log("Hello World");`;
}

function loadCode() {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) ||
      getDefaultCode()
    );
  } catch {
    return getDefaultCode();
  }
}

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
  },
});

require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(
    document.getElementById("editor"),
    {
      value: loadCode(),

      language: "javascript",

      theme: isDark
        ? "vs-dark"
        : "vs",

      automaticLayout: true,

      minimap: {
        enabled: false,
      },

      fontSize: 18,

      lineHeight: 28,

      tabSize: 2,

      wordWrap: "on",

      smoothScrolling: false,

      cursorBlinking: "blink",

      cursorSmoothCaretAnimation: "off",

      roundedSelection: true,

      scrollBeyondLastLine: false,

      renderLineHighlight: "gutter",

      overviewRulerBorder: false,

      showFoldingControls: "never",
      padding: {
        top: 16,
        bottom: 16
      },

      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    }
  );

  editor.onDidChangeModelContent(() => {
    saveCode();

    if (!els.autorun.checked) {
      return;
    }

    clearTimeout(debounceId);

    debounceId = setTimeout(() => {
      runCode();
    }, 700);
  });

  editor.addCommand(
    monaco.KeyMod.CtrlCmd |
      monaco.KeyCode.Enter,
    () => {
      runCode();
    }
  );
});

function runCode() {
  if (!editor) return;

  const code = editor.getValue();

  if (!code.trim()) {
    setStatus(
      "Nothing to run",
      "#f59e0b"
    );
    return;
  }

  clearOutput();

  setStatus(
    "Running...",
    "#3b82f6"
  );

  const sandboxDoc = `
<!DOCTYPE html>
<html>
<body>

<script>

(async () => {

const send = (type,msg) =>
parent.postMessage(
{
type,
msg
},
"*"
);

function safeStringify(obj){

const seen = new WeakSet();

return JSON.stringify(
obj,
(key,val)=>{

if(
typeof val === "object" &&
val !== null
){

if(seen.has(val)){
return "[Circular]";
}

seen.add(val);
}

return val;

},
2
);

}

["log","warn","error","info"]
.forEach(method=>{

const original =
console[method];

console[method] =
(...args)=>{

const output =
args.map(arg=>{

if(
typeof arg === "object"
){

return safeStringify(arg);

}

return String(arg);

})
.join(" ");

send(
method,
output
);

original.apply(
console,
args
);

};

});

try{

const fn =
new Function(\`
return (async () => {
${code}
})();
\`);

const result =
await fn();

if(
result !== undefined
){

send(
"info",
typeof result === "object"
? safeStringify(result)
: String(result)
);

}

send(
"done",
"success"
);

}
catch(error){

send(
"error",
error.stack ||
error.message ||
String(error)
);

send(
"done",
"error"
);

}

})();

<\/script>

</body>
</html>
`;

  els.sandbox.srcdoc =
    sandboxDoc;
}

window.addEventListener(
  "message",
  (event) => {
    const data = event.data;

    if (!data?.type) {
      return;
    }

    if (data.type === "done") {
      if (
        data.msg === "success"
      ) {
        setStatus(
          "Completed",
          "#34d399"
        );
      } else {
        setStatus(
          "Error",
          "#ef4444"
        );
      }

      return;
    }

    appendLine(
      data.type,
      data.msg
    );
  }
);

els.run.addEventListener(
  "click",
  runCode
);

els.clear.addEventListener(
  "click",
  () => {
    if (!editor) return;

    editor.setValue("");

    clearOutput();

    setStatus(
      "Cleared",
      "#9ca3af"
    );
  }
);

els.theme.addEventListener(
  "click",
  () => {
    isDark = !isDark;

    monaco.editor.setTheme(
      isDark
        ? "vs-dark"
        : "vs"
    );

    localStorage.setItem(
      THEME_KEY,
      isDark
        ? "dark"
        : "light"
    );
  }
);

setStatus(
  "Ready",
  "#34d399"
);
