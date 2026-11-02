#!/usr/bin/env python
# -*- coding: utf-8 -*-
from html.parser import HTMLParser
from fontTools import subset


class TextParser(HTMLParser):
    tags = ('p', 'h1')
    depth = 0
    chars = set()
    def handle_starttag(self, tag, attrs): self.depth += tag in self.tags
    def handle_endtag(self, tag): self.depth -= tag in self.tags
    def handle_data(self, data):
        if self.depth: self.chars |= set(data)


def subset_font(font, chars):
    ss = subset.Subsetter()
    ss.populate(unicodes=[ord(c) for c in chars])
    ss.subset(font)


if __name__ == '__main__':
    parser = TextParser()
    parser.feed(open('../index.html').read())
    s_en = {c for c in parser.chars if 0x20 < ord(c) < 0x7f}
    f_opensans = subset.load_font('../static/open-sans.woff', subset.Options())
    subset_font(f_opensans, s_en)
    f_opensans.flavor = 'woff'
    f_opensans.save('../static/open-sans-generated.woff')
