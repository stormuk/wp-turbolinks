var anchoredLink, assetsChanged, browserCompatibleDocumentParser, browserIsntBuggy, browserSupportsPushState, cacheCurrentPage, changePage, constrainPageCacheTo, createDocument, crossOriginLink, currentState, executeScriptTags, extractLink, extractTitleAndBody, extractTrackAssets, fetchHistory, fetchReplacement, handleClick, ignoreClick, initializeTurbolinks, initialized, installClickHandlerLast, intersection, loadedAssets, noTurbolink, nonHtmlLink, nonStandardClick, pageCache, recallScrollPosition, referer, reflectNewUrl, reflectRedirectedUrl, rememberCurrentState, rememberCurrentUrl, rememberInitialPage, removeHash, requestMethod, requestMethodIsSafe, resetScrollPosition, targetLink, triggerEvent, visit, xhr, _ref,
  __hasProp = {}.hasOwnProperty,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

initialized = false;

currentState = null;

referer = document.location.href;

loadedAssets = null;

pageCache = {};

createDocument = null;

requestMethod = ((_ref = document.cookie.match(/request_method=(\w+)/)) != null ? _ref[1].toUpperCase() : void 0) || '';

xhr = null;

visit = function(url) {
  if (browserSupportsPushState) {
    cacheCurrentPage();
    reflectNewUrl(url);
    return fetchReplacement(url);
  } else {
    return document.location.href = url;
  }
};

fetchReplacement = function(url) {
  var safeUrl,
    _this = this;
  triggerEvent('page:fetch');
  safeUrl = removeHash(url);
  if (xhr != null) {
    xhr.abort();
  }
  xhr = new XMLHttpRequest;
  xhr.open('GET', safeUrl, true);
  xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml, application/xml');
  xhr.setRequestHeader('X-XHR-Referer', referer);
  xhr.onload = function() {
    var doc;
    doc = createDocument(xhr.responseText);
    if (assetsChanged(doc)) {
      return document.location.reload();
    } else {
      changePage.apply(null, extractTitleAndBody(doc));
      reflectRedirectedUrl(xhr);
      if (document.location.hash) {
        document.location.href = document.location.href;
      } else {
        resetScrollPosition();
      }
      return triggerEvent('page:load');
    }
  };
  xhr.onloadend = function() {
    return xhr = null;
  };
  xhr.onabort = function() {
    return rememberCurrentUrl();
  };
  xhr.onerror = function() {
    return document.location.href = url;
  };
  return xhr.send();
};

fetchHistory = function(state) {
  var page;
  cacheCurrentPage();
  if (page = pageCache[state.position]) {
    if (xhr != null) {
      xhr.abort();
    }
    changePage(page.title, page.body);
    recallScrollPosition(page);
    return triggerEvent('page:restore');
  } else {
    return fetchReplacement(document.location.href);
  }
};

cacheCurrentPage = function() {
  rememberInitialPage();
  pageCache[currentState.position] = {
    url: document.location.href,
    body: document.body,
    title: document.title,
    positionY: window.pageYOffset,
    positionX: window.pageXOffset
  };
  return constrainPageCacheTo(10);
};

constrainPageCacheTo = function(limit) {
  var key, value, _results;
  _results = [];
  for (key in pageCache) {
    if (!__hasProp.call(pageCache, key)) continue;
    value = pageCache[key];
    if (key <= currentState.position - limit) {
      _results.push(pageCache[key] = null);
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

changePage = function(title, body, runScripts) {
  document.title = title;
  document.documentElement.replaceChild(body, document.body);
  if (runScripts) {
    executeScriptTags();
  }
  currentState = window.history.state;
  return triggerEvent('page:change');
};

executeScriptTags = function() {
  var attr, copy, nextSibling, parentNode, script, _i, _j, _len, _len1, _ref1, _ref2, _ref3, _results;
  _ref1 = document.body.getElementsByTagName('script');
  _results = [];
  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
    script = _ref1[_i];
    if (!((_ref2 = script.type) === '' || _ref2 === 'text/javascript')) {
      continue;
    }
    copy = document.createElement('script');
    _ref3 = script.attributes;
    for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
      attr = _ref3[_j];
      copy.setAttribute(attr.name, attr.value);
    }
    copy.appendChild(document.createTextNode(script.innerHTML));
    parentNode = script.parentNode, nextSibling = script.nextSibling;
    parentNode.removeChild(script);
    _results.push(parentNode.insertBefore(copy, nextSibling));
  }
  return _results;
};

reflectNewUrl = function(url) {
  if (url !== document.location.href) {
    referer = document.location.href;
    return window.history.pushState({
      turbolinks: true,
      position: currentState.position + 1
    }, '', url);
  }
};

reflectRedirectedUrl = function(xhr) {
  var location;
  if ((location = xhr.getResponseHeader('X-XHR-Current-Location')) && location !== document.location.pathname + document.location.search) {
    return window.history.replaceState(currentState, '', location + document.location.hash);
  }
};

rememberCurrentUrl = function() {
  return window.history.replaceState({
    turbolinks: true,
    position: Date.now()
  }, '', document.location.href);
};

rememberCurrentState = function() {
  return currentState = window.history.state;
};

rememberInitialPage = function() {
  if (!initialized) {
    rememberCurrentUrl();
    rememberCurrentState();
    createDocument = browserCompatibleDocumentParser();
    return initialized = true;
  }
};

recallScrollPosition = function(page) {
  return window.scrollTo(page.positionX, page.positionY);
};

resetScrollPosition = function() {
  return window.scrollTo(0, 0);
};

removeHash = function(url) {
  var link;
  link = url;
  if (url.href == null) {
    link = document.createElement('A');
    link.href = url;
  }
  return link.href.replace(link.hash, '');
};

triggerEvent = function(name) {
  var event;
  event = document.createEvent('Events');
  event.initEvent(name, true, true);
  return document.dispatchEvent(event);
};

extractTrackAssets = function(doc) {
  var node, _i, _len, _ref1, _results;
  _ref1 = doc.head.childNodes;
  _results = [];
  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
    node = _ref1[_i];
    if ((typeof node.getAttribute === "function" ? node.getAttribute('data-turbolinks-track') : void 0) != null) {
      _results.push(node.src || node.href);
    }
  }
  return _results;
};

assetsChanged = function(doc) {
  var fetchedAssets;
  loadedAssets || (loadedAssets = extractTrackAssets(document));
  fetchedAssets = extractTrackAssets(doc);
  return fetchedAssets.length !== loadedAssets.length || intersection(fetchedAssets, loadedAssets).length !== loadedAssets.length;
};

intersection = function(a, b) {
  var value, _i, _len, _ref1, _results;
  if (a.length > b.length) {
    _ref1 = [b, a], a = _ref1[0], b = _ref1[1];
  }
  _results = [];
  for (_i = 0, _len = a.length; _i < _len; _i++) {
    value = a[_i];
    if (__indexOf.call(b, value) >= 0) {
      _results.push(value);
    }
  }
  return _results;
};

extractTitleAndBody = function(doc) {
  var title;
  title = doc.querySelector('title');
  return [title != null ? title.textContent : void 0, doc.body, 'runScripts'];
};

browserCompatibleDocumentParser = function() {
  var createDocumentUsingParser, createDocumentUsingWrite, testDoc, _ref1;
  createDocumentUsingParser = function(html) {
    return (new DOMParser).parseFromString(html, 'text/html');
  };
  createDocumentUsingWrite = function(html) {
    var doc;
    doc = document.implementation.createHTMLDocument('');
    doc.open('replace');
    doc.write(html);
    doc.close();
    return doc;
  };
  if (window.DOMParser) {
    testDoc = createDocumentUsingParser('<html><body><p>test');
  }
  if ((testDoc != null ? (_ref1 = testDoc.body) != null ? _ref1.childNodes.length : void 0 : void 0) === 1) {
    return createDocumentUsingParser;
  } else {
    return createDocumentUsingWrite;
  }
};

installClickHandlerLast = function(event) {
  if (!event.defaultPrevented) {
    document.removeEventListener('click', handleClick);
    return document.addEventListener('click', handleClick);
  }
};

handleClick = function(event) {
  var link;
  if (!event.defaultPrevented) {
    link = extractLink(event);
    if (link.nodeName === 'A' && !ignoreClick(event, link)) {
      visit(link.href);
      return event.preventDefault();
    }
  }
};

extractLink = function(event) {
  var link;
  link = event.target;
  while (!(!link.parentNode || link.nodeName === 'A')) {
    link = link.parentNode;
  }
  return link;
};

crossOriginLink = function(link) {
  return location.protocol !== link.protocol || location.host !== link.host;
};

anchoredLink = function(link) {
  return ((link.hash && removeHash(link)) === removeHash(location)) || (link.href === location.href + '#');
};

nonHtmlLink = function(link) {
  return link.href.match(/\.[a-z]+(\?.*)?$/g) && !link.href.match(/\.html?(\?.*)?$/g);
};

noTurbolink = function(link) {
  var ignore;
  while (!(ignore || link === document)) {
    ignore = link.getAttribute('data-no-turbolink') != null;
    link = link.parentNode;
  }
  return ignore;
};

targetLink = function(link) {
  return link.target.length !== 0;
};

nonStandardClick = function(event) {
  return event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
};

ignoreClick = function(event, link) {
  return crossOriginLink(link) || anchoredLink(link) || nonHtmlLink(link) || noTurbolink(link) || targetLink(link) || nonStandardClick(event);
};

initializeTurbolinks = function() {
  document.addEventListener('click', installClickHandlerLast, true);
  return window.addEventListener('popstate', function(event) {
    var _ref1;
    if ((_ref1 = event.state) != null ? _ref1.turbolinks : void 0) {
      return fetchHistory(event.state);
    }
  });
};

browserSupportsPushState = window.history && window.history.pushState && window.history.replaceState && window.history.state !== void 0;

browserIsntBuggy = !navigator.userAgent.match(/CriOS\//);

requestMethodIsSafe = requestMethod === 'GET' || requestMethod === '';

if (browserSupportsPushState && browserIsntBuggy && requestMethodIsSafe) {
  initializeTurbolinks();
}

this.Turbolinks = {
  visit: visit
};

Window({
  size: x
});

Viewport({
  size: x
});
