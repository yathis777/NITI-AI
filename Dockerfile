FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
COPY data/creators.csv /usr/share/nginx/html/data/creators.csv

EXPOSE 80
