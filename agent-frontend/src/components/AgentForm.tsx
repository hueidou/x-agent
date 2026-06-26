import { useState } from "react"
import type { Agent } from "../types"
import { createAgent, updateAgent } from "../api/client"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

interface Props {
  onDone: () => void
  edit?: Agent
  onCancel?: () => void
}

const DEEPSEEK_BASE = "https://api.deepseek.com/v1"

export default function AgentForm({ onDone, edit, onCancel }: Props) {
  const [name, setName] = useState(edit?.name || "")
  const [sysPrompt, setSysPrompt] = useState(edit?.config.system_prompt || "You are a helpful assistant.")
  const [model, setModel] = useState(edit?.config.model.name || "deepseek-v4-flash")
  const [apiBase, setApiBase] = useState(edit?.config.model.api_base || DEEPSEEK_BASE)
  const [tools, setTools] = useState((edit?.config.tools || []).map((t) => t.name).join(", "))
  const [useTools, setUseTools] = useState((edit?.config.tools || []).length > 0)
  const [maxIter, setMaxIter] = useState(edit?.config.max_iterations || 10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const toolList = useTools
        ? tools.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
            if (t.startsWith("mcp:")) return { type: "mcp" as const, name: t.slice(4) }
            if (t === "*") return { type: "mcp" as const, name: "*" }
            return { type: "builtin" as const, name: t }
          })
        : []

      const config = {
        system_prompt: sysPrompt,
        model: { provider: "openai", name: model, api_base: apiBase, temperature: 0.7 },
        tools: toolList,
        memory: { max_history: 50 },
        max_iterations: maxIter,
      }

      if (edit) {
        await updateAgent(edit.id, { name, config })
      } else {
        await createAgent(name, config)
      }
      onDone()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">{edit ? "Edit Agent" : "Create Agent"}</h3>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sysPrompt">System Prompt</Label>
        <Textarea id="sysPrompt" rows={3} value={sysPrompt} onChange={(e) => setSysPrompt(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" placeholder="deepseek-v4-flash" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiBase">API Base URL</Label>
          <Input id="apiBase" placeholder="https://api.deepseek.com/v1" value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="useTools" checked={useTools} onChange={(e) => setUseTools(e.target.checked)} className="rounded border-gray-300" />
          <Label htmlFor="useTools" className="mb-0">Enable Tools</Label>
        </div>
        <Input
          placeholder="web_search, mcp:xxx"
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          disabled={!useTools}
        />
        <p className="text-xs text-muted-foreground">Comma-separated tool names (e.g. web_search, mcp:my-server)</p>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="maxIter" className="shrink-0">Max Iterations:</Label>
        <Input id="maxIter" type="number" min={1} max={100} value={maxIter} onChange={(e) => setMaxIter(Number(e.target.value))} className="w-20" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : edit ? "Update" : "Create"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  )
}
