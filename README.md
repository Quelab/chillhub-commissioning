# ChillHub Commissioning
**A [Docker](https://www.docker.com) application to connect the  [ChillHub](https://firstbuild.com/bpwagner/chillhub) to a wireless network**

### Read metadata
Each ChillHub has a universally unique identifier, known as a [UUID](http://en.wikipedia.org/wiki/Universally_unique_identifier). The mobile application uses this identifier to differentiate between ChillHubs for a single user.

``` bash
$ curl http://192.168.10.1
{ "uuid":"8a8fa07c-8d54-470c-8643-095ee1dba7b2" }
```

### List the wireless networks
The ChillHub is capable of searching for wireless networks within range of the ChillHub.

``` bash
$ curl http://192.168.10.1/networks
[
  { "ssid": "Network 1" },
  { "ssid": "Network 2" },
  { "ssid": "Network 3" }
]
```

### Connect to a wireless network
In order to connect the ChillHub to a wireless network, it must be provided the SSID and a passphrase of the wireless network.

``` bash
$ curl -X POST -H "Content-Type: application/json" -d '{"ssid":"Network 1", "passphrase": "password"}' http://192.168.10.1/networks
{ "ssid": "Network 1" }
```

### Disconnect from a wireless network
The ChillHub can be disconnected from a wireless network. Once this is done, the ChillHub will revert back to hosting a wireless access point.

``` bash
$ curl -X DELETE http://192.168.10.1/networks
```
