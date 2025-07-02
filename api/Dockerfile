FROM python:3.13.2-slim-bullseye

RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y netcat-traditional poppler-utils
RUN pip install --upgrade pip

WORKDIR /tmp

COPY ./requirements.txt requirements.txt
RUN pip install -r requirements.txt

WORKDIR /app/api

CMD ["./start.sh"]
