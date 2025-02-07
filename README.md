# divvy

## Development

```shell
docker-compose -f docker-compose-dev.yml up --build -d
docker-compose logs --tail=100 -f api
```

### Fix Filesystem Permissions

```shell
sudo chown $(whoami):$(whoami) -R *
```

## Run one-off SQL commands

```shell
TODO
```

## Packaging for Production

```shell
# API
TODO: work in progress...
# UI
TODO: work in progress...
```

## Usage
```shell
docker-compose up -d
```
