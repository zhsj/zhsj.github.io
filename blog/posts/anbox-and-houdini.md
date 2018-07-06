# Run Arm apk on x86 with Anbox

Anbox supports [rootfs overlay](https://docs.anbox.io/userguide/advanced/rootfs_overlay.html)
since [PR-774](https://github.com/anbox/anbox/pull/774).

I will update soon to adjust this guide.

## Anbox

https://anbox.io/

## Houdini

A library developed by Intel, as Arm binary translator.

## Enable Houdini in Anbox's Android image

It was tested with Anbox's 20180523 image.

```bash
wget https://build.anbox.io/android-images/2018/05/23/android_amd64.img
# y stands for x86-64 & arm 32-bit
wget http://dl.android-x86.org/houdini/7_y/houdini.sfs
```

Then combine these two images.

```bash
sudo unsquashfs android.img
sudo unsquashfs -d squashfs-root/system/lib/arm houdini.sfs
```

Copy `libhoudini.so` to `/system/lib/`.

```
sudo cp squashfs-root/system/lib/arm/libhoudini.so squashfs-root/system/lib/
```

Now add some configuration. Remember to remove the old values, otherwise it won't take effect.

* File: `/default.prop`

```
# replace the old setting
ro.dalvik.vm.native.bridge=libhoudini.so
```

* File: `/system/build.prop`

```
# replace the old setting
ro.product.cpu.abilist=x86_64,x86,armeabi,armeabi-v7a
ro.product.cpu.abilist32=x86,armeabi,armeabi-v7a

ro.dalvik.vm.isa.arm=x86
ro.enable.native.bridge.exec=1
```

* File: `/anbox-init.sh`

```
# before the init
mount -t binfmt_misc none /proc/sys/fs/binfmt_misc
echo ':arm_exe:M::\\x7f\\x45\\x4c\\x46\\x01\\x01\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x02\\x00\\x28::/system/lib/arm/houdini:P' > /proc/sys/fs/binfmt_misc/register
echo ':arm_dyn:M::\\x7f\\x45\\x4c\\x46\\x01\\x01\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x03\\x00\\x28::/system/lib/arm/houdini:P' > /proc/sys/fs/binfmt_misc/register
```

Finally generate the new image.

```
sudo mksquashfs squashfs-root/ android-houdini.img -noappend -always-use-fragments
```

To start with the new image. You can use the `--android-image` option.

```
container-manager --daemon --privileged --data-path=/var/lib/anbox --android-image=/var/lib/anbox/android-houdini.img
```
