# Using StrongSwan to build a VPN

FYI, ipv6 currently is not working.

It's a note to build a VPN on Digitalocean's VPS
which works on Android, iOS, Linux, Windows clients.

## Overview

| VPS Side                | Client Side                                               |
| ----------------------- | --------------------------------------------------------- |
| StrongSwan              | Android, iOS, Windows have system pre-installed client    |
| Dnsmasq (dns server)    | Linux desktop user can install network-manager-strongswan |
| Freeradius (auth)       |                                                           |

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
ipsec pki --gen --outform pem > serverkey.pem
ipsec pki --pub --in serverKey.pem | \
    ipsec pki --issue --cacert caCert.pem --cakey caKey.pem \
    --dn "C=CN, ST=Anhui, L=Hefei, O=ZHSJ, CN=do2.zhsj.me" \
    --san do2.zhsj.me --san @107.170.251.213 \
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

## Ipsec Conf

```
config setup
    uniqueids= no

conn ios
    keyexchange=ikev1
    authby=xauthrsasig
    xauth=server
    left=%defaultroute
    leftsubnet=0.0.0.0/0,::/0
    leftfirewall=yes
    leftcert=serverCert.pem
    right=%any
    rightsourceip=10.254.254.0/24,fd12:3456:789a:1::0/64
    rightcert=clientCert.pem
    pfs=no
    dpdaction=clear
    auto=add

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
    ike=aes256-sha1-modp1024!
    rekey=no
    left=%defaultroute
    leftauth=pubkey
    leftsubnet=0.0.0.0/0,::/0
    leftcert=serverCert.pem
    right=%any
    rightauth=eap-radius
    rightsourceip=10.254.254.0/24,fd12:3456:789a:1::0/64
    rightfirewall=yes
    rightsendcert=never
    eap_identity=%any
    auto=add
```

## StrongSwan Conf

```
charon {
    load_modular = yes
    plugins {
        include strongswan.d/charon/*.conf
        eap-radius {
            accounting = yes
            servers {
                local {
                    address = 107.170.251.213
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
    dns1 = 10.254.253.1
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
#dnsmasq config
listen-address=127.0.0.1
listen-address=10.254.253.1

log-queries

address=/.ingress.com/2607:f8b0:400e:c02::79
address=/.ingress.com/10.254.253.2
address=/.googlehosted.com/2607:f8b0:400e:c02::79
address=/.googlehosted.com/10.254.253.2
address=/.appspot.com/2607:f8b0:400e:c04::8d
address=/.appspot.com/10.254.253.3
```

```
# /etc/network/interfaces
#dns
auto eth0:0
iface eth0:0 inet static
  address 10.254.253.1
  netmask 255.255.255.0

#ingress
auto eth0:1
iface eth0:1 inet static
  address 10.254.253.2
  netmask 255.255.255.0
auto eth0:1
iface eth0:2 inet static
  address 10.254.253.3
  netmask 255.255.255.0
```

```bash
# using socat to forward traffic
socat TCP4-LISTEN:443,bind=10.254.253.2,fork,su=nobody \
    TCP6:[2607:f8b0:400e:c02::79]:443
socat TCP4-LISTEN:443,bind=10.254.253.3,fork,su=nobody \
    TCP6:[2607:f8b0:400e:c04::8d]:443
socat TCP4-LISTEN:80,bind=10.254.253.2,fork,su=nobody \
    TCP6:[2607:f8b0:400e:c02::79]:80
socat TCP4-LISTEN:80,bind=10.254.253.3,fork,su=nobody \
    TCP6:[2607:f8b0:400e:c04::8d]:80
```
