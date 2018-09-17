#!/usr/bin/env python
# -*- coding: utf-8 -*-
import fontforge


def clean_without(font, glyphs):
    font.selection.none()
    for i in set(glyphs):
        font.selection.select(('more', 'unicode'), ord(i))
    font.selection.invert()
    font.clear()


if __name__ == '__main__':
    f_opensans = fontforge.open('../static/open-sans.woff')
    s_en = 'Shengjing ZhuSoftware Engineer & Debian Developer'.replace(' ', '')
    clean_without(f_opensans, s_en)
    f_opensans.generate('../static/open-sans-generated.woff')
