# Spring Boot and Spring AI Demo Chatbot

A full-stack chatbot application demonstrating Spring Boot AI, Ollama (local LLM), PgVector (Vector Database), and a React + TypeScript frontend.

## Features

*   **Backend**: Spring Boot 3.3, Spring AI, PostgreSQL (pgvector).
*   **Frontend**: React, TypeScript, Vite, React Bootstrap.
*   **AI Models**: Uses local Ollama instance with `llama3` (Chat) and `mxbai-embed-large` (Embeddings).
*   **RAG (Retrieval Augmented Generation)**: Ingest documents to provide context for the AI.
*   **Document Support**: Ingests Text, PDF, Word, etc. using Apache Tika.
*   **Internationalization**: English, Portuguese (BR), Spanish.
*   **Monitoring**: Spring Boot Actuator metrics and a frontend dashboard.

## Prerequisites

1.  **Docker & Docker Compose**: Ensure Docker Desktop or Docker Engine is installed.
2.  **Ollama**: This project relies on a local Ollama instance running on your host machine.
    *   Download Ollama
    *   Pull the required models:
        ```bash
        ollama pull llama3
        ollama pull mxbai-embed-large
        ```
    *   Ensure Ollama is running and accessible on port `11434`.
    *   *Note for Linux users*: You might need to configure Ollama to listen on `0.0.0.0` or ensure Docker can access the host network. The docker-compose uses `host.docker.internal` which works out-of-the-box on Docker Desktop (Mac/Windows). For Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to the docker command or compose file if not using Docker Desktop.

## Project Structure

```text
.
├── backend/            # Spring Boot Application
├── frontend/           # React Application
├── docker-compose.yml  # Orchestration
└── README.md
```

## How to Run

1.  **Build and Start Services**:
    Run the following command from the root directory:

    ```bash
    docker-compose up --build
    ```

    This will:
    *   Start a PostgreSQL container with the `pgvector` extension.
    *   Build the Spring Boot backend image.
    *   Build the React frontend image (using Nginx).
    *   Start all services.

2.  **Access the Application**:
    *   **Frontend**: Open http://localhost:5173 in your browser.
    *   **Backend API**: Accessible at http://localhost:8080.
    *   **Actuator Endpoints**: http://localhost:8080/actuator.

## Usage

1.  **Chat**: Type messages to chat with the Llama 3 model.
2.  **Ingest Documents**: Upload text, PDF, or Word documents to provide context (RAG).
3.  **Dashboard**: Click the chart icon 📊 to view application metrics.
4.  **Settings**: Toggle Dark Mode 🌙 or change Language 🌐.
