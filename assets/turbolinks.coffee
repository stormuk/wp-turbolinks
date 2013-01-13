initialized    = false
currentState   = null
referer        = document.location.href
loadedAssets   = null
pageCache      = {}
createDocument = null
requestMethod  = document.cookie.match(/request_method=(\w+)/)?[1].toUpperCase() or ''
xhr            = null

visit = (url) ->
  if browserSupportsPushState
    cacheCurrentPage()
    reflectNewUrl url
    fetchReplacement url
  else
    document.location.href = url


fetchReplacement = (url) ->
  triggerEvent 'page:fetch'

  # Remove hash from url to ensure IE 10 compatibility
  safeUrl = removeHash url

  xhr?.abort()
  xhr = new XMLHttpRequest
  xhr.open 'GET', safeUrl, true
  xhr.setRequestHeader 'Accept', 'text/html, application/xhtml+xml, application/xml'
  xhr.setRequestHeader 'X-XHR-Referer', referer

  xhr.onload = =>
    doc = createDocument xhr.responseText

    if assetsChanged doc
      document.location.reload()
    else
      changePage extractTitleAndBody(doc)...
      reflectRedirectedUrl xhr
      if document.location.hash
        document.location.href = document.location.href
      else
        resetScrollPosition()
      triggerEvent 'page:load'

  xhr.onloadend = -> xhr = null
  xhr.onabort   = -> rememberCurrentUrl()
  xhr.onerror   = -> document.location.href = url

  xhr.send()

fetchHistory = (state) ->
  cacheCurrentPage()

  if page = pageCache[state.position]
    xhr?.abort()
    changePage page.title, page.body
    recallScrollPosition page
    triggerEvent 'page:restore'
  else
    fetchReplacement document.location.href


cacheCurrentPage = ->
  rememberInitialPage()

  pageCache[currentState.position] =
    url:       document.location.href,
    body:      document.body,
    title:     document.title,
    positionY: window.pageYOffset,
    positionX: window.pageXOffset

  constrainPageCacheTo(10)

constrainPageCacheTo = (limit) ->
  for own key, value of pageCache
    pageCache[key] = null if key <= currentState.position - limit

changePage = (title, body, runScripts) ->
  document.title = title
  document.documentElement.replaceChild body, document.body
  executeScriptTags() if runScripts
  currentState = window.history.state
  triggerEvent 'page:change'

executeScriptTags = ->
  for script in document.body.getElementsByTagName 'script' when script.type in ['', 'text/javascript']
    copy = document.createElement 'script'
    copy.setAttribute attr.name, attr.value for attr in script.attributes
    copy.appendChild document.createTextNode script.innerHTML
    { parentNode, nextSibling } = script
    parentNode.removeChild script
    parentNode.insertBefore copy, nextSibling


reflectNewUrl = (url) ->
  if url isnt document.location.href
    referer = document.location.href
    window.history.pushState { turbolinks: true, position: currentState.position + 1 }, '', url

reflectRedirectedUrl = (xhr) ->
  if (location = xhr.getResponseHeader 'X-XHR-Current-Location') and location isnt document.location.pathname + document.location.search
    window.history.replaceState currentState, '', location + document.location.hash

rememberCurrentUrl = ->
  window.history.replaceState { turbolinks: true, position: Date.now() }, '', document.location.href

rememberCurrentState = ->
  currentState = window.history.state

rememberInitialPage = ->
  unless initialized
    rememberCurrentUrl()
    rememberCurrentState()
    createDocument = browserCompatibleDocumentParser()
    initialized = true

recallScrollPosition = (page) ->
  window.scrollTo page.positionX, page.positionY

resetScrollPosition = ->
  window.scrollTo 0, 0

removeHash = (url) ->
  link = url
  unless url.href?
    link = document.createElement 'A'
    link.href = url
  link.href.replace link.hash, ''


triggerEvent = (name) ->
  event = document.createEvent 'Events'
  event.initEvent name, true, true
  document.dispatchEvent event


extractTrackAssets = (doc) ->
  (node.src || node.href) for node in doc.head.childNodes when node.getAttribute?('data-turbolinks-track')?

assetsChanged = (doc) ->
  loadedAssets ||= extractTrackAssets document
  fetchedAssets  = extractTrackAssets doc
  fetchedAssets.length isnt loadedAssets.length or intersection(fetchedAssets, loadedAssets).length isnt loadedAssets.length

intersection = (a, b) ->
  [a, b] = [b, a] if a.length > b.length
  value for value in a when value in b

extractTitleAndBody = (doc) ->
  title = doc.querySelector 'title'
  [ title?.textContent, doc.body, 'runScripts' ]

browserCompatibleDocumentParser = ->
  createDocumentUsingParser = (html) ->
    (new DOMParser).parseFromString html, 'text/html'

  createDocumentUsingWrite = (html) ->
    doc = document.implementation.createHTMLDocument ''
    doc.open 'replace'
    doc.write html
    doc.close()
    doc

  if window.DOMParser
    testDoc = createDocumentUsingParser '<html><body><p>test'

  if testDoc?.body?.childNodes.length is 1
    createDocumentUsingParser
  else
    createDocumentUsingWrite


installClickHandlerLast = (event) ->
  unless event.defaultPrevented
    document.removeEventListener 'click', handleClick
    document.addEventListener 'click', handleClick

handleClick = (event) ->
  unless event.defaultPrevented
    link = extractLink event
    if link.nodeName is 'A' and !ignoreClick(event, link)
      visit link.href
      event.preventDefault()


extractLink = (event) ->
  link = event.target
  link = link.parentNode until !link.parentNode or link.nodeName is 'A'
  link

crossOriginLink = (link) ->
  location.protocol isnt link.protocol or location.host isnt link.host

anchoredLink = (link) ->
  ((link.hash and removeHash(link)) is removeHash(location)) or
    (link.href is location.href + '#')

nonHtmlLink = (link) ->
  link.href.match(/\.[a-z]+(\?.*)?$/g) and not link.href.match(/\.html?(\?.*)?$/g)

noTurbolink = (link) ->
  until ignore or link is document
    ignore = link.getAttribute('data-no-turbolink')?
    link = link.parentNode
  ignore

targetLink = (link) ->
  link.target.length isnt 0

nonStandardClick = (event) ->
  event.which > 1 or event.metaKey or event.ctrlKey or event.shiftKey or event.altKey

ignoreClick = (event, link) ->
  crossOriginLink(link) or anchoredLink(link) or nonHtmlLink(link) or noTurbolink(link) or targetLink(link) or nonStandardClick(event)


initializeTurbolinks = ->
  document.addEventListener 'click', installClickHandlerLast, true
  window.addEventListener 'popstate', (event) ->
    fetchHistory event.state if event.state?.turbolinks

browserSupportsPushState =
  window.history and window.history.pushState and window.history.replaceState and window.history.state != undefined

browserIsntBuggy =
  !navigator.userAgent.match /CriOS\//

requestMethodIsSafe =
  requestMethod in ['GET','']

initializeTurbolinks() if browserSupportsPushState and browserIsntBuggy and requestMethodIsSafe

# Call Turbolinks.visit(url) from client code
@Turbolinks = { visit }
Window size: x 
Viewport size: x