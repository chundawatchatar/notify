# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

ARG BUILDER_IMAGE=hexpm/elixir:1.20.2-erlang-29.0.3-debian-bookworm-20260623-slim@sha256:4ced3cb72e20ff8ad8315ec05af520c43431ea2ae459a205f5217670df45f2cf
ARG RUNNER_IMAGE=debian:bookworm-slim@sha256:60eac759739651111db372c07be67863818726f754804b8707c90979bda511df

FROM ${BUILDER_IMAGE} AS build

WORKDIR /workspace/apps/api

ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force

COPY apps/api/mix.exs apps/api/mix.lock ./
COPY libs/domain/mix.exs /workspace/libs/domain/mix.exs
COPY libs/open_api/mix.exs /workspace/libs/open_api/mix.exs

RUN mix deps.get --only prod

COPY libs/domain /workspace/libs/domain
COPY libs/open_api /workspace/libs/open_api
COPY apps/api/config ./config

RUN mix deps.compile

COPY apps/api/lib ./lib
COPY apps/api/priv ./priv
COPY apps/api/rel ./rel

RUN mix compile && mix release

FROM ${RUNNER_IMAGE} AS runtime

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates libsctp1 libstdc++6 libncurses6 openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 notify \
    && useradd --system --uid 10001 --gid notify --home-dir /app notify

WORKDIR /app

ENV HOME=/tmp \
    ERL_CRASH_DUMP=/tmp/erl_crash.dump \
    LANG=C.UTF-8 \
    PORT=4100

COPY --from=build --chown=notify:notify /workspace/apps/api/_build/prod/rel/api ./

USER notify

EXPOSE 4100

CMD ["/app/bin/server"]
