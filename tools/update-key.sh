#!/bin/sh
gpg --export --export-options export-minimal --export-filter keep-uid="uid =~ i@zhsj.me" \
  43673975973406E650A64124CF0E265B7DFBB2F2  > "$(dirname "$0")"/../.well-known/openpgpkey/hu/yoshewjxwxj3dtezbu34waxgwahxoo4n
