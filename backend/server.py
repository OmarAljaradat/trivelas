"""
Proxy backend for Trivela.
The Trivela Node.js app serves BOTH static assets and /api routes on port 3000.
Since Kubernetes ingress routes /api/* to this FastAPI backend on port 8001,
we forward every /api/* request to the Node.js server running on localhost:3000.
"""
import httpx
from fastapi import FastAPI, Request, Response
from starlette.middleware.cors import CORSMiddleware

TRIVELA_ORIGIN = "http://localhost:3000"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Long timeout because scraping FUT.GG may be slow
_client = httpx.AsyncClient(timeout=60.0)


@app.on_event("shutdown")
async def _shutdown():
    await _client.aclose()


HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding",
    "content-length",
}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    url = f"{TRIVELA_ORIGIN}/api/{path}"
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length"}}

    upstream = await _client.request(
        request.method,
        url,
        params=request.query_params,
        content=body,
        headers=headers,
    )

    resp_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/")
async def root():
    return {"message": "Trivela proxy backend running", "target": TRIVELA_ORIGIN}
