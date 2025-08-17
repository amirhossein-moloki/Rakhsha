# Rakhshan (رخشان)

Rakhshan is a secure messaging application designed with a strong focus on user privacy and metadata protection. It implements several advanced protocols to conceal user activity and protect against traffic analysis.

**Note:** This project is a proof-of-concept and contains critical security vulnerabilities. It is **not recommended for production use**.

## Features

*   **End-to-End Encryption:** The application is designed to use end-to-end encryption for all messages.
*   **Sealed Sender:** The server does not store the sender's identity with the message, protecting the sender's privacy.
*   **Traffic Obfuscation:** Implements multiple techniques to hide traffic patterns:
    *   **HTTP Padding:** All API requests are padded to a fixed size.
    *   **Random Delays:** Random delays are added to API responses.
    *   **Constant Bitrate WebSocket:** A constant stream of dummy traffic is sent over WebSockets to obscure real message traffic.
*   **Secret Mode:** A plausible deniability feature that allows users to hide conversations behind a secondary password.
*   **Group Chats & File Sharing:** Supports group conversations and secure file sharing.

## API

The project exposes a RESTful API for all its functionalities. For detailed information about the available endpoints, please refer to the [API.md](./API.md) file.

## Security

This project implements several advanced privacy-enhancing protocols, as detailed in [PROTOCOL.md](./PROTOCOL.md). The goal is to protect user metadata and provide strong privacy guarantees.

**⚠️ Security Warning**

A security analysis of the project has identified several **critical vulnerabilities**. These are documented in the [SECURITY_REPORT.md](./SECURITY_REPORT.md) file. The most critical issues include:

1.  **Broken End-to-End Encryption:** The key exchange implementation is flawed, rendering the E2EE ineffective.
2.  **Insecure Key Management:** The default setup might lead to storing sensitive keys in version control.
3.  **Missing Rate Limiting:** Authentication endpoints are vulnerable to brute-force attacks.

It is strongly advised to review the security report and fix these issues before considering any use of this application.

## Getting Started

You can run the application locally using Docker and Docker Compose.

### Prerequisites

*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/amirhossein-moloki/Rakhsha.git
    cd Rakhsha
    ```

2.  **Create an environment file:**
    Copy the example environment file to a new `.env` file.
    ```bash
    cp .env.example .env
    ```
    Review the `.env` file and fill in the required values. For security reasons, you should generate strong, random secrets.

3.  **Start the application:**
    ```bash
    docker-compose up -d
    ```
    The application server will be running on the port specified in your `.env` file (default is 3000).

## Testing

To run the test suite, you can execute the following command:

```bash
npm test
```

This will run all the Jest tests and provide a coverage report.
