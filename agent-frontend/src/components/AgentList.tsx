import { useState, useEffect } from "react"
import type { Agent } from "../types"
import { listAgents, deleteAgent, getAgent } from "../api/client"
import AgentForm from "./AgentForm"
import SessionPanel from "./SessionPanel"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Skeleton } from "./ui/skeleton"
import { Plus, MessageSquare, Info, Pencil, Trash2 } from "lucide-react"

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Agent | null>(null)
  const [sessionAgentId, setSessionAgentId] = useState<string | null>(null)

  async function fetch() {
    setLoading(true)
    try {
      const res = await listAgents()
      setAgents(res.agents)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this agent?")) return
    try {
      await deleteAgent(id)
      setDetail(null)
      fetch()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleView(id: string) {
    try {
      const agent = await getAgent(id)
      setDetail(agent)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const editAgent = editId ? agents.find((a) => a.id === editId) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Agents</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <AgentForm onDone={() => { setShowCreate(false); fetch() }} onCancel={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      )}

      {editId && editAgent && (
        <Card>
          <CardContent className="pt-6">
            <AgentForm edit={editAgent} onDone={() => { setEditId(null); fetch() }} onCancel={() => setEditId(null)} />
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && agents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No agents yet. Click "Create Agent" to get started.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{agent.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{agent.config.model.name}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {agent.config.tools.length > 0
                          ? `${agent.config.tools.length} tool(s)`
                          : "no tools"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setSessionAgentId(agent.id)} className="gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleView(agent.id)}>
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditId(agent.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>Agent configuration details</DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[50vh]">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      {sessionAgentId && (
        <SessionPanel
          agentId={sessionAgentId}
          agents={agents}
          onClose={() => setSessionAgentId(null)}
        />
      )}
    </div>
  )
}
