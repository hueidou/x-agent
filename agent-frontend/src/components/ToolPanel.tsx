import { useState, useEffect } from "react"
import type { ToolInfo } from "../types"
import { listTools, registerMCPServer } from "../api/client"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Badge } from "./ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select"
import { Separator } from "./ui/separator"
import { Wrench, RefreshCw, Puzzle, Server } from "lucide-react"

export default function ToolPanel() {
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [mcpId, setMcpId] = useState("")
  const [mcpName, setMcpName] = useState("")
  const [mcpTransport, setMcpTransport] = useState("sse")
  const [mcpUrl, setMcpUrl] = useState("")
  const [mcpMsg, setMcpMsg] = useState("")

  async function fetch() {
    setLoading(true)
    try {
      const res = await listTools()
      setTools(res.tools)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setMcpMsg("")
    try {
      const config = mcpTransport === "sse"
        ? { url: mcpUrl }
        : { command: mcpUrl.split(" ")[0], args: mcpUrl.split(" ").slice(1) }
      await registerMCPServer({ id: mcpId, name: mcpName, transport: mcpTransport, config })
      setMcpMsg("MCP server registered successfully")
      setMcpId("")
      setMcpName("")
      setMcpUrl("")
      fetch()
    } catch (err: any) {
      setMcpMsg(`Failed: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tools &amp; MCP</h2>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-primary" />
            <CardTitle>Registered Tools ({tools.length})</CardTitle>
          </div>
          <CardDescription>Built-in and MCP tools available to agents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tools registered yet.</p>
          ) : (
            <div className="space-y-2">
              {tools.map((tool, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tool.name}</span>
                      <Badge variant="secondary" className="text-xs">{tool.source}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle>Register MCP Server</CardTitle>
          </div>
          <CardDescription>Connect external MCP-compatible tool servers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">MCP ID</label>
                <Input placeholder="my-server" value={mcpId} onChange={(e) => setMcpId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="My Server" value={mcpName} onChange={(e) => setMcpName(e.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-32">
                <label className="text-sm font-medium block mb-2">Transport</label>
                <Select value={mcpTransport} onValueChange={setMcpTransport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sse">SSE</SelectItem>
                    <SelectItem value="stdio">STDIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Endpoint</label>
                <Input
                  placeholder={mcpTransport === "sse" ? "https://..." : "command arg1 arg2"}
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="gap-1">
              <Server className="h-4 w-4" />
              Register
            </Button>
            {mcpMsg && (
              <p className={`text-sm ${mcpMsg.includes("Failed") ? "text-destructive" : "text-green-600"}`}>
                {mcpMsg}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
