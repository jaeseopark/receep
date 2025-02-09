# divvy

## Development

```shell
docker-compose -f docker-compose-dev.yml up --build -d

# See API logs
docker-compose logs --tail=100 -f api

# Add ShadCN components
docker-compose exec ui npx -y shadcn@latest add COMP_NAME

# Run Prettier against the UI code
docker-compose exec ui npx prettier --write .

# Invoke yarn
docker-compose exec ui yarn add # ...
```

### Fix Filesystem Permissions

```shell
sudo chown $(whoami):$(whoami) -R *
```

## Run one-off SQL commands

```shell
TODO
```

## Ongoing SQL Schema Migration

TODO: add `alembic`

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
