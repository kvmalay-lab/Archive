#!/usr/bin/env python3
import os
import sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f"Serving from: {os.getcwd()}")
import http.server
import socketserver
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", 8080), Handler) as httpd:
    print("Server running on http://localhost:8080")
    sys.stdout.flush()
    httpd.serve_forever()
