# Install Debian on xhyve(OS X)

## Install xhyve

```bash
brew edit xhyve
```

Add the following lines to patch xhyve.

```patch
diff --git a/Formula/xhyve.rb b/Formula/xhyve.rb
index 6668fbc0ba..8a66685495 100644
--- a/Formula/xhyve.rb
+++ b/Formula/xhyve.rb
@@ -16,6 +16,11 @@ class Xhyve < Formula
 
   depends_on :macos => :yosemite
 
+  patch do
+    url "https://github.com/mist64/xhyve/pull/119.patch"
+    sha256 "95708821a85d216e3e6adfe0a6f85b435cc51a9969ec15c194de4e14d0ac45b3"
+  end
+
   def install
     args = []
     args << "GIT_VERSION=#{version}" if build.stable?
```

Now install xhyve from HEAD.

```bash
brew install --HEAD xhyve
```

## Download Debian unstable

```
mkdir vm; cd vm
wget https://d-i.debian.org/daily-images/amd64/daily/netboot/debian-installer/amd64/linux
wget https://d-i.debian.org/daily-images/amd64/daily/netboot/debian-installer/amd64/initrd.gz
wget https://d-i.debian.org/daily-images/amd64/daily/netboot/mini.iso
```

## Installing

Generate a blank disk image to install.
```
dd if=/dev/zero of=hdd.img bs=1g count=32
```

Following script is modified from https://github.com/mist64/xhyve/blob/master/xhyverun.sh

```bash
#!/bin/sh

KERNEL="linux"
INITRD="initrd.gz"
CMDLINE="earlyprintk=serial console=ttyS0"

MEM="-m 1G"
#SMP="-c 2"
NET="-s 2:0,virtio-net"
IMG_CD="-s 3,ahci-cd,mini.iso"
IMG_HDD="-s 4,virtio-blk,hdd.img"
PCI_DEV="-s 0:0,hostbridge -s 31,lpc"
LPC_DEV="-l com1,stdio"
ACPI="-A"
UUID="-U 0BA52110-CA52-4BF2-9891-28EE12F80E8A"

xhyve $ACPI $MEM $SMP $PCI_DEV $LPC_DEV $NET $IMG_CD $IMG_HDD $UUID \
      -f kexec,$KERNEL,$INITRD,"$CMDLINE"
```

Start xhyve.
```
sudo ./xhyverun.sh
```

...normal Debian install steps...

Before the installer telling you to reboot, press `Ctrl+A` and `2` to switch to a shell.

```
chroot /target bash
ip a
python3 -m http.server
```

Now in your OS X, download the `vmlinuz` and `initrd.img` outside the VM.

## Start

```bash
#!/bin/sh

KERNEL="vmlinuz"
INITRD="initrd.img"
CMDLINE="earlyprintk=serial console=ttyS0 root=/dev/vda1 ro"

MEM="-m 1G"
#SMP="-c 2"
NET="-s 2:0,virtio-net"
#IMG_CD="-s 3,ahci-cd,mini.iso"
IMG_HDD="-s 4,virtio-blk,hdd.img"
PCI_DEV="-s 0:0,hostbridge -s 31,lpc"
LPC_DEV="-l com1,stdio"
ACPI="-A"
UUID="-U 0BA52110-CA52-4BF2-9891-28EE12F80E8A"

xhyve $ACPI $MEM $SMP $PCI_DEV $LPC_DEV $NET $IMG_CD $IMG_HDD $UUID \
      -f kexec,$KERNEL,$INITRD,"$CMDLINE"
```
