'use strict'

const CURRENT_CACHE = 'v0.1.15'
const OLD_CACHE = 'v0.1.14'

addEventListener('install', event => {

   skipWaiting()

   event.waitUntil(
      caches
         .open(CURRENT_CACHE)
         .then(cache => cache.addAll([
            './',
            './index.html',
            './style.css',
            './app.js',
            './core-funcs.js',
            './form-data.js',
            './manifest.json',
            './icons/favicon.png',
            './icons/content_copy.png',
            './icons/copy_all.png',
            './icons/delete.png',
            './icons/edit.png'
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