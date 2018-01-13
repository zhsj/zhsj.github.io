# Install Kubernetes in Systemd Container

## Env

| Side      | Software   |             |
| --------- | ---------- | ----------- |
| Host OS   | CentOS 7   | systemd 219 |
| Guest OS  | Debian Sid | systemd 236 |
|           | rkt        | 1.29.0      |
|           | kubernetes | 1.9.1      |

## Host side

### Start systemd-nspawn

1. bootstrap a mini Debian environment.

    ``` bash
    debootstrap --variant=minbase --include=systemd,dbus \
      unstable /var/lib/machines/k8s \
      https://deb.debian.org/debian/
    ```

2. change root password.

    ``` bash
    systemd-nspawn -D /var/lib/machines/k8s
    passwd
    ```

3. remove /etc/securetty so that you can login via `machinectl`.

    ``` bash
    rm /var/lib/machines/k8s/etc/securetty
    ```

4. enable systemd-nspawn service.

    ``` bash
    machinectl enable k8s
    ```

    ``` bash
    # if want to change parameters
    systemctl edit systemd-nspawn@k8s

    # cat /etc/systemd/system/systemd-nspawn@k8s.service.d/override.conf
    [Service]
    ExecStart=
    ExecStart=/usr/bin/systemd-nspawn \
      --quiet --keep-unit --link-journal=try-guest \
      --boot --network-macvlan=eno1 --machine=%I
    ```

5. start it.

    ```
    machinectl start k8s
    ```

### Change sysctl conf

In order to run container inside systemd-nspawn, we need to enable several sysctl parameters.

systemd-nspawn will mount /proc/sys read-only inside guest, so we change these parameters on host side.

``` bash
# cat /etc/sysctl.d/99-k8s.conf
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.conf.all.route_localnet = 1
net.ipv4.conf.default.route_localnet = 1
vm.overcommit_memory = 1
kernel.panic = 10
```

## Guest side

### Deploy rkt

1. we have to patch rkt 1.29.0 so it can work on read only `/proc/sys`.

    https://github.com/rkt/rkt/pull/3897
    ``` diff
    diff --git a/networking/networking.go b/networking/networking.go
    index 64cd56d8..764814f4 100644
    --- a/networking/networking.go
    +++ b/networking/networking.go
    @@ -165,7 +165,7 @@ func (n *Networking) enableDefaultLocalnetRouting() error {
                    if err != nil {
                            return err
                    }
    -               if string(routeLocalnetValue) != "1" {
    +               if strings.TrimSpace(string(routeLocalnetValue)) != "1" {
                            routeLocalnetFile, err := os.OpenFile(routeLocalnetPath, os.O_WRONLY, 0)
                            if err != nil {
                                    return err
    ```

    https://github.com/containernetworking/plugins/pull/107
    ``` diff
    diff --git a/vendor/github.com/containernetworking/cni/pkg/ip/ipforward.go b/vendor/github.com/containernetworking/cni/pkg/ip/ipforward.go
    index 77ee7463..0d0056a9 100644
    --- a/vendor/github.com/containernetworking/cni/pkg/ip/ipforward.go
    +++ b/vendor/github.com/containernetworking/cni/pkg/ip/ipforward.go
    @@ -16,6 +16,7 @@ package ip

    import (
            "io/ioutil"
    +       "strings"
    )

    func EnableIP4Forward() error {
    @@ -27,5 +28,10 @@ func EnableIP6Forward() error {
    }

    func echo1(f string) error {
    +       if content, err := ioutil.ReadFile(f); err == nil {
    +               if strings.TrimSpace(string(content)) == "1" {
    +                       return nil
    +               }
    +       }
            return ioutil.WriteFile(f, []byte("1"), 0644)
    }
    ```

2. build it with following configuration, so it uses `stage1-host` flavor by default.

    ``` bash
    ./configure --enable-tpm=no --with-stage1-flavors=host,coreos,fly \
    --with-stage1-default-location=/usr/local/lib/rkt/stage1-images/stage1-host.aci
    ```

    ``` bash
    cp build-rkt-1.29.0+git/target/bin/rkt /usr/local/bin/
    cp build-rkt-1.29.0+git/target/bin/stage1-*.aci /usr/local/lib/rkt/stage1-images/
    ```

3. create a network configuration which will be used by kubernetes as well.

    ``` bash
    # cat /etc/rkt/net.d/10-k8s.conf
    {
    "name": "rkt.kubernetes.io",
    "type": "bridge",
    "bridge": "k8s-bridge",
    "mtu": 1460,
    "addIf": "true",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "subnet": "10.22.0.0/16",
        "gateway": "10.22.0.1",
        "routes": [
        { "dst": "0.0.0.0/0" }
        ]
    }
    }
    ```

4. enable rkt related systemd service.

    ``` bash
    cp -r dist/init/systemd/* /etc/systemd/system/
    systemctl enable rkt-api-tcp.socket
    systemctl enable rkt-metadata.socket
    ```

    Don't forget to change the rkt path in systemd service files.

### Deploy Etcd

We can run etcd with rkt, so that we can also ensure rkt working properly.

``` bash
# cat /etc/systemd/system/etcd.service
[Unit]
Description=etcd
Documentation=https://github.com/coreos

[Service]
ExecStart=/usr/local/bin/rkt run \
  --stage1-from-dir=stage1-host.aci \
  --net=rkt.kubernetes.io \
  --no-overlay=true \
  --volume=data-dir,kind=host,source=/data/etcd,readOnly=false \
  --port=client:127.0.0.1:2379 \
  coreos.com/etcd:v3.2.14 -- \
  -listen-client-urls=http://0.0.0.0:2379 \
  -advertise-client-urls=http://localhost:2379

[Install]
WantedBy=multi-user.target
```

### Deploy kubernetes

1. key and configuration files.

2. start kubernetes via systemd services.

    * k8s-kube-apiserver.service

    ```
    [Unit]
    Description=Kubernetes API Server
    Documentation=https://github.com/kubernetes/kubernetes

    [Service]
    ExecStart=/usr/local/bin/kube-apiserver \
        --etcd-servers=http://127.0.0.1:2379 \
        --secure-port=443 \
        --tls-cert-file=/srv/kubernetes/server.crt \
        --tls-private-key-file=/srv/kubernetes/server.key \
        --client-ca-file=/srv/kubernetes/ca.crt \
        --token-auth-file=/srv/kubernetes/known_token.csv \
        --admission-control=NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,ResourceQuota,DefaultTolerationSeconds

    [Install]
    WantedBy=k8s.target
    ```

    * k8s-kube-controller-manager.service

    ```
    [Unit]
    Description=Kubernetes Controller Manager
    Documentation=https://github.com/kubernetes/kubernetes

    [Service]
    ExecStart=/usr/local/bin/kube-controller-manager \
        --master=127.0.0.1:8080 \
        --service-account-private-key-file=/srv/kubernetes/server.key

    [Install]
    WantedBy=k8s.target
    ```

    * k8s-kube-scheduler.service

    ```
    [Unit]
    Description=Kubernetes Scheduler
    Documentation=https://github.com/kubernetes/kubernetes

    [Service]
    ExecStart=/usr/local/bin/kube-scheduler \
        --master=http://127.0.0.1:8080

    [Install]
    WantedBy=k8s.target
    ```

    * k8s-kube-proxy.service

    ```
    [Unit]
    Description=Kubernetes Kube Proxy
    Documentation=https://github.com/kubernetes/kubernetes

    [Service]
    ExecStart=/usr/local/bin/kube-proxy \
        --kubeconfig=/var/lib/kube-proxy/kubeconfig \
        --proxy-mode=userspace --conntrack-max-per-core=0 \
        --conntrack-tcp-timeout-established=0 --conntrack-tcp-timeout-close-wait=0

    [Install]
    WantedBy=k8s.target
    ```

    * k8s-kubelet.servic

    ```
    [Unit]
    Description=Kubernetes Kubelet
    Documentation=https://github.com/kubernetes/kubernetes

    [Service]
    ExecStart=/usr/local/bin/kubelet \
        --container-runtime=rkt \
        --fail-swap-on=false \
        --kubeconfig=/var/lib/kubelet/kubeconfig \
        --protect-kernel-defaults --cgroups-per-qos=false \
        --enforce-node-allocatable=''

    [Install]
    WantedBy=k8s.target
    ```

    * k8s.target

    ```
    [Unit]
    Description=Kubernetes
    [Install]
    WantedBy=multi-user.target
    ```
