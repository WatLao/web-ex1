/*
 * Cross-origin iframe auto-height helper.
 * Include this file inside every page rendered in the iframe.
 */
(function () {
  'use strict';

  var allowedParentOrigins = [
    'https://www.watlaomelbourne.com.au',
    'https://watlaomelbourne.com.au'
  ];
  var lastHeight = 0;
  var scheduled = false;

  function getHeight() {
    var body = document.body;
    var html = document.documentElement;
    return Math.ceil(Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      body ? body.clientHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0,
      html ? html.clientHeight : 0
    ));
  }

  function getTargetOrigin() {
    // The parent sends its origin with the request. Before that, use the
    // production origin so the helper also works when opened directly.
    return allowedParentOrigins.indexOf(document.referrer ? new URL(document.referrer).origin : '') >= 0
      ? new URL(document.referrer).origin
      : allowedParentOrigins[0];
  }

  function sendHeight(force) {
    scheduled = false;
    var height = getHeight();
    if (!force && height === lastHeight) return;
    lastHeight = height;
    window.parent.postMessage({
      type: 'watlao:iframe-height',
      height: height,
      path: window.location.pathname,
      source: 'watlao-embed'
    }, getTargetOrigin());
  }

  function scheduleSend(force) {
    if (scheduled && !force) return;
    scheduled = true;
    window.requestAnimationFrame(function () { sendHeight(force); });
  }

  window.addEventListener('message', function (event) {
    if (allowedParentOrigins.indexOf(event.origin) === -1) return;
    if (!event.data || event.data.type !== 'watlao:request-height') return;
    sendHeight(true);
  });

  window.addEventListener('load', function () {
    scheduleSend(true);
    [100, 400, 1000, 2000].forEach(function (delay) {
      window.setTimeout(function () { scheduleSend(true); }, delay);
    });
  });

  window.addEventListener('resize', function () { scheduleSend(false); });

  if (window.ResizeObserver) {
    var resizeObserver = new ResizeObserver(function () { scheduleSend(false); });
    resizeObserver.observe(document.documentElement);
    if (document.body) resizeObserver.observe(document.body);
  }

  if (window.MutationObserver && document.body) {
    var mutationObserver = new MutationObserver(function () { scheduleSend(false); });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { scheduleSend(true); });
  }
})();
