'use strict'

const CURRENT_CACHE = 'v0.1.6'
const OLD_CACHE = 'v0.1.5'

addEventListener('install', event => {

   skipWaiting()

   event.waitUntil(
      caches
         .open(CURRENT_CACHE)
         .then(cache => cache.addAll([
            './',
            './index.html',
            './app.js',
            './l-s-tables.js',
            './form-data.js',
            './manifest.json'
         ]))
   )
})

addEventListener('activate', event => {

   event.waitUntil(
      caches
         .keys()
         .then(keys => Promise.all(keys.map(key => key !== CURRENT_CACHE ? caches.delete(key) : null)))
         .then(() => clients.claim())
   )
})

addEventListener("fetch", event => {

   event.respondWith(
      caches
         .match(event.request)
         .then(cachedResponse => cachedResponse ?? fetch(event.request))
   )
})

addEventListener('message', event => {

   if (event.data === 'delete cache')
   {
      event.waitUntil(caches.delete(CURRENT_CACHE))
   }
})