FROM nginx:1.28.1-alpine AS build

RUN apk add --no-cache \
    bash \
    brotli-dev \
    build-base \
    git \
    linux-headers \
    openssl-dev \
    pcre-dev \
    zlib-dev

RUN wget http://nginx.org/download/nginx-1.28.1.tar.gz && \
    tar zxvf nginx-1.28.1.tar.gz

RUN git clone --depth=1 --recursive https://github.com/google/ngx_brotli.git

RUN cd nginx-1.28.1 && \
    ./configure --with-compat --add-dynamic-module=../ngx_brotli && \
    make modules && \
    cp objs/ngx_http_brotli_filter_module.so /etc/nginx/modules/ && \
    cp objs/ngx_http_brotli_static_module.so /etc/nginx/modules/


FROM nginx:1.28.1-alpine

COPY --from=build /nginx-1.28.1/objs/ngx_http_brotli_filter_module.so /etc/nginx/modules/
COPY --from=build /nginx-1.28.1/objs/ngx_http_brotli_static_module.so /etc/nginx/modules/

RUN sed -i '/^events/i\
load_module modules/ngx_http_brotli_filter_module.so;\
load_module modules/ngx_http_brotli_static_module.so;\
' /etc/nginx/nginx.conf

RUN mkdir -p /var/www/certbot/
RUN mkdir -p /var/www/decomp.me/
