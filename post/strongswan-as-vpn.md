# Using StrongSwan to build a VPN

Ipv6 currently is not working.

It's a note to build a VPN on Digitalocean's VPS
which works on Android, iOS, Linux, Windows clients.

*It is not a guide. It is just for memorandum.*

## Overview

| VPS Side                | Client Side                                               |
| ----------------------- | --------------------------------------------------------- |
| StrongSwan              | Android supports IKEv1                                    |
| Dnsmasq (dns server)    | Linux desktop user can install network-manager-strongswan |
| Freeradius (auth)       | Windows, iOS 9 and OS X support IKEv2                      |

On Debian 8 server, I installed following packages,

```bash
apt install strongswan libstrongswan-extra-plugins libcharon-extra-plugins \
    dnsmasq \
    freeradius
```

## Generate Certs

```bash
# ca
ipsec pki --gen --outform pem > caKey.pem
ipsec pki --self --ca --in caKey.pem \
    --dn "C=CN, ST=Anhui, L=Hefei, O=ZHSJ, CN=ZHSJCA" \
    --outform pem > caCert.pem

# server
ipsec pki --gen --outform pem > serverKey.pem
ipsec pki --pub --in serverKey.pem | \
    ipsec pki --issue --cacert caCert.pem --cakey caKey.pem \
    --dn "C=CN, ST=Anhui, L=Hefei, O=ZHSJ, CN=do.zhsj.me" \
    --san do.zhsj.me --san @159.203.13.225 \
    --flag serverAuth --flag ikeIntermediate \
    --outform pem > serverCert.pem

# client
ipsec pki --gen --outform pem > clientKey.pem
ipsec pki --pub --in clientKey.pem | \
    ipsec pki --issue --cacert caCert.pem --cakey caKey.pem \
    --dn "C=CN, ST=Anhui, L=Hefei, O=ZHSJ, CN=zhsj-client" \
    --outform pem > clientCert.pem
openssl pkcs12 -export -inkey clientKey.pem -in clientCert.pem \
    -name "zhsj-client" -certfile caCert.pem -caname "ZHSJCA" \
    -out clientCert.p12
```

Besides, the server certification can be issued by StartSSL if you don't need to issue a client
certification. Remember to put the StartSSL CA and the intermediate CA to `/etc/ipsec.d/cacerts`.

## Ipsec Conf

```
# /etc/ipsec.conf
config setup
    uniqueids= no

conn android_xauth_psk
    keyexchange=ikev1
    left=%defaultroute
    leftauth=psk
    leftsubnet=0.0.0.0/0,::/0
    right=%any
    rightauth=psk
    rightauth2=xauth
    rightsourceip=10.254.254.0/24,fd12:3456:789a:1::0/64
    auto=add

conn radius-eap
    keyexchange=ikev2
    # Win7 is aes256, sha-1, modp1024; iOS is aes256, sha-256, modp1024;
    # OS X is 3DES, sha-1, modp1024
    ike=aes256-sha1-modp1024,aes128-sha1-modp1024,3des-sha1-modp1024!
    # Win 7 is aes256-sha1, iOS is aes256-sha256, OS X is 3des-shal1
    esp=aes256-sha256,aes256-sha1,3des-sha1!
    rekey=no
    left=%defaultroute
    leftauth=pubkey
    leftsubnet=0.0.0.0/0
    leftcert=server2Cert.pem
    leftsendcert=always
    right=%any
    rightauth=eap-radius
    rightsourceip=10.254.254.0/24
    rightsendcert=never
    eap_identity=%any
    auto=add

conn ios
    also=radius-eap
    leftid=do.zhsj.me
```

```
# /etc/ipsec.secrets
: RSA serverKey.pem
: PSK "secrets"
```

## StrongSwan Conf

```
# /etc/strongswan.conf
charon {
    load_modular = yes
    plugins {
        include strongswan.d/charon/*.conf
        eap-radius {
            accounting = yes
            servers {
                local {
                    address = 159.203.13.225
                    auth_port = 1812
                    acct_port = 1813
                    secret =
                }
            }
        }
        xauth-eap {
            backend = radius
        }
    }
    install_virtual_ip = yes
    i_dont_care_about_security_and_use_aggressive_mode_psk = yes
    duplicheck.enable = no
    # self dns or use public dns like 8.8.8.8
    dns1 = 10.254.253.1
}
```

## Freeradius Conf

I just use plain text to store the username and password :(

```
# /etc/freeradius/users
# only show the lines added

test  Cleartext-Password := "test"

```

```
# /etc/freeradius/clients.conf
# only show the lines added

client do.zhsj.me {
        ipaddr = 159.203.13.225
        secret = zhsj.me
}

```

## Routing

```bash
# nat
iptables -t nat -A POSTROUTING -j MASQUERADE
# mangle
iptables -t mangle -A FORWARD -o eth0 -p tcp -m tcp \
    --tcp-flags SYN,RST SYN -m tcpmss --mss 1361:1536 -j TCPMSS --set-mss 1360
```

## Hijack Ingress

Ingress has banned the DigitalOcean's ipv4 address. But ipv6 address is not.

Since the VPN client only has ipv4 address currently, I hijacked the Ingress's
domains.

```
# /etc/dnsmasq.d/local.conf
# dnsmasq config
listen-address=127.0.0.1
listen-address=10.254.253.1

log-queries

address=/.ingress.com/2607:f8b0:400e:c02::79
address=/.ingress.com/10.254.253.1
address=/.googlehosted.com/2607:f8b0:400e:c02::79
address=/.googlehosted.com/10.254.253.1
address=/.appspot.com/2607:f8b0:400e:c04::8d
address=/.appspot.com/10.254.253.1
```

```
# /etc/network/interfaces

# used for dnsmasq and sniproxy
auto eth0:0
iface eth0:0 inet static
  address 10.254.253.1
  netmask 255.255.255.0
```

```bash
# /etc/sniproxy.conf
# using sniproxy to forward traffic
listen 10.254.253.1:80 {
    proto http
    table ingress
    access_log {
        filename /var/log/sniproxy/http_access.log
        priority notice
    }
}

listen 10.254.253.1:443 {
    proto tls
    table ingress
    access_log {
        filename /var/log/sniproxy/https_access.log
        priority notice
    }
}
table ingress {
    .*\.ingress\.com [2607:f8b0:400e:c02::79]
    .*\.googlehosted\.com [2607:f8b0:400e:c02::79]
    .*\.appspot\.com [2607:f8b0:400e:c04::8d]
}
```
