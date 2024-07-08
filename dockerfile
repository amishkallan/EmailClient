# FROM python:3.9-slim

# WORKDIR /app

# COPY requirements.txt requirements.txt
# RUN pip install -r requirements.txt

# COPY . .

# CMD ["python", "app.py"]
# Dockerfile
FROM node:22.3.0
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon
COPY . .
CMD ["nodemon", "server"]
# CMD ["bash"]
