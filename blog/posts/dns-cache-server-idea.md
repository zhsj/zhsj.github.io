# Idea: A DNS Cache Server

## Reason

I use Dnsmasq on my laptop, but I'm not satisfied with it.

## Feature

* DNS cache pre-fetch
* Can use a proxy server

## Detail

A cache list, with LRU. A loop to check the expiring record and pre-fetch.

When a client query a expiring record, we return the old record. But we will refresh it afterwards.

We get the record by forwarding. No recursive.

Maybe using python asyncio is easy to do DNS query.
