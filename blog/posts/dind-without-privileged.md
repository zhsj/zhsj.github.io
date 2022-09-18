# Run Docker in Docker without Privileged

TL;DR

```bash
docker run --rm -it \
  --security-opt apparmor=unconfined \
  --cap-add SYS_ADMIN \
  zhusj/dind:202209090250
```

The dockerfile is located at
<https://github.com/zhsj/dockerfile/tree/master/dind>

## Why not privileged

With the above command, apparmor is disabled and `CAP_SYS_ADMIN` is added.
The container is already not secure. So why would I still be bothered with the
`privileged` option?

It matters when I want to run it on Kubernetes, and use the device plugin to
manage devices, for example allocating 1 GPU when the host has 8.

If I use the `privileged` option, then all devices on the host are added to the
container.

## The tricks

The setup script is almost same as [the normal DinD][1].

But few tricks are:

- Remount proc and sysfs

  ```bash
  mkdir -p /unmasked-proc
  mount -t proc proc /unmasked-proc
  mkdir -p /unmasked-sys
  mount -t sysfs sysfs /unmasked-sys
  ```

  I got this trick from
  <https://lists.linuxfoundation.org/pipermail/containers/2018-April/038840.html>.

  Without this, I got errors like:

  ```
  failed to share mount point: /: permission denied
  ```

- Create tun device

  So it's possible to use slirp4netns or vpnkit for rootless docker.

  `tun/tap` is [allowed][2] by default, but the char device is not created.

  ```bash
  mkdir -p /dev/net
  mknod /dev/net/tun c 10 200 || :
  chmod 666 /dev/net/tun
  ```

  However this will not work in the future, because `runc`/`containerd` has
  [removed][3] tun/tap from their default configurations. Thus
  `--device /dev/net/tun` option will be needed for `docker`, or tun device
  plugin for Kubernetes.

[1]: https://github.com/docker-library/docker/blob/04ae082f/20.10/dind/dockerd-entrypoint.sh#L180-L188
[2]: https://github.com/opencontainers/runc/blob/d66943e6/libcontainer/specconv/spec_linux.go#L310-L315
[3]: https://github.com/opencontainers/runc/pull/3468
