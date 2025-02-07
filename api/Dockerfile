FROM python:3.13.2-slim-bullseye

RUN apt-get update && apt-get upgrade -y
RUN pip install --upgrade pip

WORKDIR /app

COPY ./requirements.txt requirements.txt
RUN pip install -r requirements.txt
