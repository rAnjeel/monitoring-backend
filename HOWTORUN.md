# HOW TO RUN THE PROJECT

This guide explains how to set up and run the Dockerized application with the required structure.

## Prerequisites
- Docker installed
- Docker Compose installed
- Git installed

## Project Setup

1. **Create the project structure**:
   ```bash
   mkdir Monitoring
   cd Monitoring

2. **Clone the git repository**:
    ```bash
    git clone <backend-repo-url> backend
    git clone <frontend-repo-url> frontend

3. **Verify the structure**:
    ```bash
    Monitoring/
    ├── backend/
    └── frontend/
    └── docker-compose.yml
    └── HOWTORUN.md

## Docker Setup

1. **Create a docker-compose.yml file in the root Monitoring directory with your service configurations**
    Requirement: docker-compose installed
    ```bash
    version: '3.8'

    services:
    mysql:
        image: mysql:8.0
        container_name: monitoring_4g_mysql
        restart: unless-stopped
        environment:
        MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
        MYSQL_DATABASE: ${MYSQL_DATABASE:-monitoring_4g}
        MYSQL_USER: ${MYSQL_USER:-monitoring_user}
        MYSQL_PASSWORD: ${MYSQL_PASSWORD:-monitoring_password}
        ports:
        - "3307:3306"
        volumes:
        - mysql_data:/var/lib/mysql
        - ./backend/mysql/init:/docker-entrypoint-initdb.d
        command: --default-authentication-plugin=mysql_native_password

    backend:
        build:
        context: ./backend
        dockerfile: Dockerfile
        container_name: monitoring_4g_backend
        depends_on:
        - mysql
        environment:
        PORT: 3000
        MYSQL_HOST: mysql
        MYSQL_PORT: 3306
        MYSQL_DATABASE: ${MYSQL_DATABASE:-monitoring_4g}
        MYSQL_USER: ${MYSQL_USER:-monitoring_user}
        MYSQL_PASSWORD: ${MYSQL_PASSWORD:-monitoring_password}
        CORS_ORIGIN: http://localhost:5173,http://localhost:4000
        NODE_ENV: development
        ports:
        - "3000:3000"
        volumes:
        - ./backend:/app
        - /app/node_modules


    frontend:
        build:
        context: ./frontend
        dockerfile: Dockerfile
        args:
            VITE_API_BASE_URL: http://localhost:4000
        container_name: monitoring_4g_frontend
        depends_on:
        - gateway
        ports:
        - "8080:80"

    volumes:
    mysql_data:
    backend_uploads:

2. **Build and run the containers**:
    ```bash
    docker-compose up --build
    docker-compose up

3. **Common Commandes**:
    ```bash
    docker-compose down -v 
    docker-compose build --no-cache
    docker-compose up --build

## Accessing the Application

Frontend: http://localhost:5173
Run with

    npm run dev

Backend: http://localhost:3000 Run automatically with docker

## Build dependencies
    npm run build