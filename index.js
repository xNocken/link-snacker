const request = require('sync-request');
const fs = require('fs');

String.prototype.nthIndexOf = function (char, count) {
  let index = -1;
  let foundCount = 0;

  this.split('').forEach((letter, i) => {
    if (letter === char) {
      foundCount++;

      if (foundCount === count) {
        index = i;
      }
    }
  });

  return index;
};

let count = 0;

const startURL = process.argv[2];
let baseUrl = startURL;

if (baseUrl.includes('/', baseUrl.indexOf('/') + 2)) {
  baseUrl = process.argv[3] || `${baseUrl.split('/')[0]}//${baseUrl.split('/')[2]}`;
}

const urlList = {};
urlList[startURL] = { visited: false, source: '' };

const hasUnvisited = () => {
  let unvisited = false;

  Object.values(urlList).forEach((page) => {
    if (!page.visited) {
      unvisited = true;
    }
  });

  return unvisited;
}

const handlePage = (res, targetUrl) => {
  urlList[targetUrl].visited = true;

  if (res.statusCode !== 200 || !res.url.match(baseUrl)) {
    return;
  }

  let urls = res.getBody('utf-8').match(/(src|href|action)="[\w\.\/\?=&:%-]+"/gi);

  count += 1;

  if (!urls) {
    return;
  }

  urls = urls.map((url) => {
    url = url.replace(/(src|href|action)="/, '').replace(/"/, '');

    switch (true) {
      case /https?/.test(url):
        return url;
      case url.charAt(0) === '/' && url.charAt(1) === '/':
        return baseURL.match(/(https?:)/)[0] + file;
      case url.charAt(0) === '/':
        return baseUrl.slice(0, baseUrl.nthIndexOf('/', 3)) + url;
      case /\.\.\//.test(url):
        let newUrl = res.url.slice(0, res.url.lastIndexOf('/'));

        while (/\.\.\//.test(url)) {
          newUrl = newUrl.slice(0, newUrl.lastIndexOf('/'));
          url = url.replace('../', '');
        }

        return newUrl + '/' + url;
      default:
        return res.url.slice(0, res.url.lastIndexOf('/') + 1) + url;
    }
  })

  urls.forEach((url) => {
    if (url.match(baseUrl) && urlList[url] === undefined) {
      urlList[url] = { visited: /\.(png|jpg|jpeg|pdf|webp|gif|)?($|\?)/.test(url), source: res.url };
    } else if (!url.match(baseUrl)) {
      urlList[url] = { visited: true, source: res.url };
    }
  });
};

const saveResult = () => {
  const results = {};

  Object.values(urlList).forEach((value) => {
    results[value.source] = [];
  });
  
  Object.entries(urlList)
  .sort((a, b) => { a[0] - b[0] })
  .sort((a, b) => { a[1].source - b[1].source })
  .forEach((url) => {
    if (!results[url[1].source || 'No source']) {
      results[url[1].source || 'No source'] = [];
    }
    
    results[url[1].source || 'No source'].push(url[0]);
  });

  fs.writeFileSync(`result-${baseUrl.replace(/https?:\/\//, '').replace(/\//g, '-')}.json`, JSON.stringify(results, null, 2))
}

while (hasUnvisited()) {
  console.log(`Already scanned ${count} links and found ${Object.keys(urlList).length} links`);

  saveResult();

  Object.entries(urlList).forEach((page) => {
    if (!page[1].visited) {
      handlePage(request('GET', page[0]), page[0]);
    }
  })
}
  
console.log(`Done. Scanned ${count} links and found ${Object.keys(urlList).length} links.`)

