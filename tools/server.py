#!/usr/bin/env python3
import os
import re
from http.server import test, SimpleHTTPRequestHandler
from http import HTTPStatus


class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        path = re.sub(r'view/.*', 'index.html', path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None
        ctype = self.guess_type(path)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", ctype)
        fs = os.fstat(f.fileno())
        self.send_header("Content-Length", str(fs[6]))
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        return f


if __name__ == '__main__':
    test(HandlerClass=Handler, port=8000, bind='127.0.0.1')
