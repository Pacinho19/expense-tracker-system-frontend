FROM httpd:2.4.53-alpine 
LABEL maintainer="Pacinho"
ADD . /usr/local/apache2/htdocs

WORKDIR /app
ADD . .

EXPOSE 80