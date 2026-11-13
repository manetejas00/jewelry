FROM golang:1.24-bookworm AS build
WORKDIR /src
ARG OTPGATEWAY_REF=84464195f7c18defb08faf77fd0d69fd61f315a8
ADD https://github.com/knadh/otpgateway/archive/${OTPGATEWAY_REF}.tar.gz /tmp/otpgateway.tar.gz
RUN tar -xzf /tmp/otpgateway.tar.gz --strip-components=1 \
 && CGO_ENABLED=0 go build -o /otpgateway -ldflags="-s -w -X main.buildString=veyora" ./cmd/otpgateway

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /otpgateway /app/otpgateway
COPY --from=build /src/static /app/static
COPY email.tpl sms.txt /app/templates/
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh /app/otpgateway
EXPOSE 9000
ENTRYPOINT ["/app/entrypoint.sh"]
