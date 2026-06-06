"use client";

import Script from "next/script";

export default function NgrokBypass() {
  return (
    <Script
      id="ngrok-bypass"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var origFetch = window.fetch;
            window.fetch = function(input, init) {
              init = init || {};
              init.headers = init.headers || {};
              init.headers["ngrok-skip-browser-warning"] = "true";
              return origFetch.call(window, input, init);
            };
          })();
        `,
      }}
    />
  );
}
