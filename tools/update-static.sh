#!/bin/sh

hljs=11.5.1
marked=4.0.16
cd "$(dirname "$0")" || exit 1
curl -sSL -o ../blog/static/js/highlight-$hljs.js https://github.com/highlightjs/cdn-release/raw/$hljs/build/highlight.min.js
curl -sSL -o ../blog/static/css/highlight-$hljs.css https://github.com/highlightjs/cdn-release/raw/$hljs/build/styles/default.min.css
curl -sSL -o ../blog/static/js/marked-$marked.js https://github.com/markedjs/marked/raw/v$marked/marked.min.js
