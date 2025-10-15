import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type PizzazWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

function widgetMeta(widget: PizzazWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true
  } as const;
}

const widgets: PizzazWidget[] = [
  {
    id: "pizza-map",
    title: "Show Pizza Map",
    templateUri: "ui://widget/pizza-map.html",
    invoking: "Hand-tossing a map",
    invoked: "Served a fresh map",
    html: `
<div id="pizzaz-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.js"></script>
    `.trim(),
    responseText: "Rendered a pizza map!"
  },
  {
    id: "pizza-carousel",
    title: "Show Pizza Carousel",
    templateUri: "ui://widget/pizza-carousel.html",
    invoking: "Carousel some spots",
    invoked: "Served a fresh carousel",
    html: `
<div id="pizzaz-carousel-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.js"></script>
    `.trim(),
    responseText: "Rendered a pizza carousel!"
  },
  {
    id: "pizza-albums",
    title: "Show Pizza Album",
    templateUri: "ui://widget/pizza-albums.html",
    invoking: "Hand-tossing an album",
    invoked: "Served a fresh album",
    html: `
<div id="pizzaz-albums-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.js"></script>
    `.trim(),
    responseText: "Rendered a pizza album!"
  },
  {
    id: "pizza-list",
    title: "Show Pizza List",
    templateUri: "ui://widget/pizza-list.html",
    invoking: "Hand-tossing a list",
    invoked: "Served a fresh list",
    html: `
<div id="pizzaz-list-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.js"></script>
    `.trim(),
    responseText: "Rendered a pizza list!"
  },
  {
    id: "pizza-video",
    title: "Show Pizza Video",
    templateUri: "ui://widget/pizza-video.html",
    invoking: "Hand-tossing a video",
    invoked: "Served a fresh video",
    html: `
<div id="pizzaz-video-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.js"></script>
    `.trim(),
    responseText: "Rendered a pizza video!"
  }
];

const widgetsById = new Map<string, PizzazWidget>();
const widgetsByUri = new Map<string, PizzazWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    pizzaTopping: {
      type: "string",
      description: "Topping to mention when rendering the widget."
    }
  },
  required: ["pizzaTopping"],
  additionalProperties: false
} as const;

const toolInputParser = z.object({
  pizzaTopping: z.string()
});

const textAnswerInputParser = z.object({
  question: z.string()
});

// 兵马俑问答工具
const terracottaWarriorsTool: Tool = {
  name: "兵马俑",
  description: "回答关于兵马俑的问题，返回Markdown格式（含表格与Mermaid图表）。",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "用户关于兵马俑的问题"
      }
    },
    required: ["question"],
    additionalProperties: false
  },
  title: "兵马俑问答",
  _meta: {
    "openai/toolInvocation/invoking": "查询兵马俑信息...",
    "openai/toolInvocation/invoked": "已找到答案"
  }
};

const tools: Tool[] = [
  ...widgets.map((widget) => ({
    name: widget.id,
    description: widget.title,
    inputSchema: toolInputSchema,
    title: widget.title,
    _meta: widgetMeta(widget)
  })),
  terracottaWarriorsTool
];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget)
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget)
}));

function createPizzazServer(): Server {
  const server = new Server(
    {
      name: "pizzaz-node",
      version: "0.1.0"
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async (_request: ListResourcesRequest) => ({
    resources
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    const widget = widgetsByUri.get(request.params.uri);

    if (!widget) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }

    return {
      contents: [
        {
          uri: widget.templateUri,
          mimeType: "text/html+skybridge",
          text: widget.html,
          _meta: widgetMeta(widget)
        }
      ]
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (_request: ListResourceTemplatesRequest) => ({
    resourceTemplates
  }));

  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
    tools
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    // 处理兵马俑问答工具
    if (request.params.name === "兵马俑") {
      const args = textAnswerInputParser.parse(request.params.arguments ?? {});

      // 生成Markdown分析内容（含表格与Mermaid图表）
      const markdown = `## 兵马俑类型概览\n\n` +
        `- **问题**: ${args.question}\n` +
        `- **简答**: 目前已知302种！\n\n` +
        `### 类型统计表\n` +
        `| 分类 | 子类数量 | 说明 |\n` +
        `| --- | ---: | --- |\n` +
        `| 军职类型 | 7 | 将军、军吏、骑兵、弩兵、步兵、车兵等 |\n` +
        `| 装束变化 | 12 | 发髻、铠甲、鞋履、披风等差异 |\n` +
        `| 姿态与持物 | 18 | 立射、跪射、执戟、执弓、驭手等 |\n` +
        `| 面相差异 | 20+ | 五官塑造、胡须形制、表情差异 |\n` +
        `| 匠作流派 | 若干 | 作坊标记、范模体系差异 |\n\n` +
        `> 注：综合考古分型与细分特征，目前统计口径约为302种。\n\n` +
        `### 类型关系（Mermaid）\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        `\n` +
        "```mermaid\nflowchart TD\n  A[兵马俑类型] --> B[军职类型]\n  A --> C[装束变化]\n  A --> D[姿态与持物]\n  A --> E[面相差异]\n  A --> F[匠作流派]\n  B --> B1[将军]\n  B --> B2[步兵]\n  B --> B3[骑兵]\n  D --> D1[立射]\n  D --> D2[跪射]\n```\n\n";

      return {
        content: [
          { type: "text", text: markdown }
        ]
      };
    }

    // 处理现有的widget工具
    const widget = widgetsById.get(request.params.name);

    if (!widget) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const args = toolInputParser.parse(request.params.arguments ?? {});

    return {
      content: [
        {
          type: "text",
          text: widget.responseText
        }
      ],
      structuredContent: {
        pizzaTopping: args.pizzaTopping
      },
      _meta: widgetMeta(widget)
    };
  });

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createPizzazServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && (url.pathname === ssePath || url.pathname === postPath)) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === ssePath) {
    await handleSseRequest(res);
    return;
  }

  if (req.method === "POST" && url.pathname === postPath) {
    await handlePostMessage(req, res, url);
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Pizzaz MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(`  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
});
