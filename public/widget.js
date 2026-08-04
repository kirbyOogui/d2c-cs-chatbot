(function () {
  "use strict";

  // Origin is derived from this script's own <script src>, so the same file
  // works unmodified against localhost during testing and the real
  // deployment once installed on the client's site -- no origin to edit by
  // hand in the embed snippet.
  var currentScript = document.currentScript;
  var origin = new URL(currentScript.src).origin;

  var CLOSED_SIZE = { width: "88px", height: "88px" };
  var OPEN_SIZE_DESKTOP = { width: "392px", height: "560px" };

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed";
  iframe.title = "カスタマーサポートチャット";
  iframe.setAttribute("allowtransparency", "true");
  iframe.style.position = "fixed";
  iframe.style.bottom = "0";
  iframe.style.right = "0";
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = "normal";
  iframe.style.zIndex = "2147483000";
  iframe.style.width = CLOSED_SIZE.width;
  iframe.style.height = CLOSED_SIZE.height;

  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== "cs-chat-widget") return;

    if (data.open) {
      var isNarrow = window.innerWidth < 480;
      iframe.style.width = isNarrow ? "100vw" : OPEN_SIZE_DESKTOP.width;
      iframe.style.height = isNarrow ? "100vh" : OPEN_SIZE_DESKTOP.height;
    } else {
      iframe.style.width = CLOSED_SIZE.width;
      iframe.style.height = CLOSED_SIZE.height;
    }
  });

  document.body.appendChild(iframe);
})();
