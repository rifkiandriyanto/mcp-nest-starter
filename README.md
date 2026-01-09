# MCP Nest Starter

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A starter template for building <a href="https://modelcontextprotocol.io">Model Context Protocol (MCP)</a> servers with NestJS.</p>

## Description

This starter project allows you to effortlessly expose tools, resources, and prompts for AI using the **Model Context Protocol (MCP)**. It is built on top of [NestJS](https://github.com/nestjs/nest) and utilizes the [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest) library.

**Author**: Rifki Andriyanto  
**Repository**: [https://github.com/rifkiandriyanto/mcp-nest-starter](https://github.com/rifkiandriyanto/mcp-nest-starter)

## Features

- 🚀 **MCP Server**: Built-in MCP server setup.
- 🔧 **Tools**: Example `greeting-tool` implementation.
- 📁 **Resources**: Example `content` resource backed by PostgreSQL.
- 🗄️ **Database**: PostgreSQL integration with TypeORM.
- ⚙️ **Config**: Environment variable management with `@nestjs/config`.

## Project setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rifkiandriyanto/mcp-nest-starter.git
    cd mcp-nest-starter
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file and update it with your credentials:
    ```bash
    cp .env.example .env
    ```
    
    Update `.env` with your PostgreSQL configuration:
    ```env
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_USERNAME=your_username
    DATABASE_PASSWORD=your_password
    DATABASE_NAME=your_database
    ```

## Compile and run the project

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## How to use this MCP

### 1. Using MCP Inspector (Recommended)

The inspector provides a web interface to interact with your tools and resources.

Run the following command in a new terminal:

```bash
npx @modelcontextprotocol/inspector@latest http://localhost:3030/sse
```

-   **Tools**: Go to the "Tools" tab to see `greeting-tool`.
-   **Resources**: Go to the "Resources" tab to fetch content (e.g., `content://1`).

### 2. Using Curl

You can also test the endpoints directly via HTTP.

**List Tools:**
```bash
curl -X POST http://localhost:3030/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**Call Greeting Tool:**
```bash
curl -X POST http://localhost:3030/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "greeting-tool",
      "arguments": {
        "name": "Developer"
      }
    }
  }'
```

**Get Content Resource:**
(Ensure you have data in your database first)
```bash
curl -X POST http://localhost:3030/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/read",
    "params": {
      "uri": "content://1"
    }
  }'
```

## License

This project is open source and available under the [MIT license](LICENSE).
