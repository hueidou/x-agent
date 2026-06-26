import { useState, useEffect } from "react"
import AgentList from "./components/AgentList"
import ToolPanel from "./components/ToolPanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs"
import { Badge } from "./components/ui/badge"
import { Bot, Wrench } from "lucide-react"

export default function App() {
  const [tab, setTab] = useState("agents")
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Agent Platform</h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                backendOk === null ? "bg-yellow-400" : backendOk ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {backendOk === null ? "Connecting..." : backendOk ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!backendOk && backendOk !== null && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6 text-sm text-red-700">
            Cannot connect to backend. Make sure it's running on port 8001.
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="agents" className="gap-2">
              <Bot className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Wrench className="h-4 w-4" />
              Tools &amp; MCP
            </TabsTrigger>
          </TabsList>
          <TabsContent value="agents">
            <AgentList />
          </TabsContent>
          <TabsContent value="tools">
            <ToolPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
