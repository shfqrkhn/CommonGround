import http.server
import socketserver

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    pass

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
