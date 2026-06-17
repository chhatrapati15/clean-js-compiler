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

function setStatus(text) {
  els.status.textContent = text;
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

function loadCode() {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) ||
      `// Welcome to Sweet JS Compiler

console.log("Hello World");
`
    );
  } catch {
    return `console.log("Hello World")`;
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
        enabled: true,
      },

      fontSize: 14,

      tabSize: 2,

      wordWrap: "on",

      smoothScrolling: true,

      cursorBlinking: "smooth",

      cursorSmoothCaretAnimation: "on",

      formatOnPaste: true,

      formatOnType: true,

      roundedSelection: true,

      scrollBeyondLastLine: false,
    }
  );

  editor.onDidChangeModelContent(() => {
    saveCode();

    if (!els.autorun.checked) return;

    clearTimeout(debounceId);

    debounceId = setTimeout(
      runCode,
      800
    );
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
    setStatus("Nothing to Run");
    return;
  }

  clearOutput();

  setStatus("Running...");

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
.forEach(method => {

const original =
console[method];

console[method] =
(...args) => {

const output =
args.map(arg => {

if(typeof arg === "object"){
return safeStringify(arg);
}

return String(arg);

}).join(" ");

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

try {

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

    if (!data?.type) return;

    if (data.type === "done") {
      setStatus(
        data.msg === "success"
          ? "Completed"
          : "Error"
      );
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

    setStatus("Cleared");
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

setStatus("Ready");
