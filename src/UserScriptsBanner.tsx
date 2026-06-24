import { isUserScriptsAvailable } from "./userscripts";

/** Shown in popup + options when "Allow user scripts" is off (injection no-ops until enabled). */
export function UserScriptsBanner() {
  if (isUserScriptsAvailable()) return null;
  return (
    <div className="banner">
      <strong>“Allow user scripts” is off — injection is disabled.</strong>
      <ol>
        <li>
          Open <code>chrome://extensions</code>
        </li>
        <li>
          Find <b>Site Customizer</b> → click <b>Details</b>
        </li>
        <li>
          Turn on <b>Allow user scripts</b> (you may need <b>Developer mode</b> on first)
        </li>
        <li>Reload the page you want to customize</li>
      </ol>
    </div>
  );
}
