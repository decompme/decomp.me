FROM nginx:1.28-alpine

RUN apk add brotli nginx-mod-http-brotli

RUN sed -i '/^events/i\
load_module modules/ngx_http_brotli_filter_module.so;\
load_module modules/ngx_http_brotli_static_module.so;\
' /etc/nginx/nginx.conf

RUN mkdir -p /var/www/certbot/
RUN mkdir -p /var/www/decomp.me/
