RUN apt-get update && apt-get install -y \
    nginx \
    openssl \
    netcat \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/ssl /var/www/html /var/run/nginx /var/log/nginx

COPY ./conf/default.conf /etc/nginx/sites-available/default
COPY ./tools/setup_ssl.sh /usr/local/bin/setup_ssl.sh
RUN chmod +x /usr/local/bin/setup_ssl.sh

RUN ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/setup_ssl.sh"]
CMD ["nginx", "-g", "daemon off;"]