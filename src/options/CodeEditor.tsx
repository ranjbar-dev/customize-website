import CodeMirror from "@uiw/react-codemirror";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export function CodeEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (v: string) => void;
  language: "css" | "js";
}) {
  return (
    <CodeMirror
      value={value}
      height="180px"
      extensions={[language === "css" ? css() : javascript()]}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false }}
    />
  );
}
