import { useState, useEffect, useRef } from "react"
import type { Agent, Session, StreamEvent } from "../types"
import { createSession, listSessions, deleteSession, chat, parseSSEStream } from "../api/client"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Plus, Trash2, X, Send, Bot, User, Terminal, MessageSquare } from "lucide-react"

interface Props {
  agentId: string
  agents: Agent[]
  onClose: () => void
}

export default function SessionPanel({ agentId, agents, onClose }: Props) {
  const agent = agents.find((a) => a.id === agentId)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [toolLog, setToolLog] = useState<string[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listSessions(agentId).then((res) => setSessions(res.sessions))
  }, [agentId])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamText, toolLog])

  async function handleNewSession() {
    const s = await createSession(agentId)
    setSessions((prev) => [s, ...prev])
    setActiveSession(s)
    setMessages([])
    setStreamText("")
    setToolLog([])
  }

  async function handleSelectSession(s: Session) {
    setActiveSession(s)
    setMessages([])
    setStreamText("")
    setToolLog([])
  }

  async function handleDeleteSession(sid: string) {
    await deleteSession(agentId, sid)
    setSessions((prev) => prev.filter((s) => s.id !== sid))
    if (activeSession?.id === sid) {
      setActiveSession(null)
      setMessages([])
    }
  }

  function handleSend() {
    if (!input.trim() || !activeSession || streaming) return
    const userMsg = { role: "user" as const, content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreamText("")
    setToolLog([])
    setStreaming(true)

    const allMsgs = newMessages.map((m) => ({ role: m.role, content: m.content }))
    const streamTextRef = { current: "" }

    chat(agentId, activeSession.id, allMsgs, true).then((reader) => {
      if (reader instanceof ReadableStreamDefaultReader) {
        parseSSEStream(reader, (ev: StreamEvent) => {
          if (ev.type === "delta" && ev.content) {
            streamTextRef.current += ev.content
            setStreamText((prev) => prev + ev.content)
          } else if (ev.type === "tool_call") {
            setToolLog((prev) => [...prev, `Tool: ${ev.name}`])
          } else if (ev.type === "tool_result") {
            setToolLog((prev) => [...prev, `Result: ${ev.content?.slice(0, 60)}...`])
          } else if (ev.type === "done") {
            setMessages((prev) => [...prev, { role: "assistant", content: streamTextRef.current }])
            setStreamText("")
            setToolLog([])
            setStreaming(false)
          }
        })
      }
    })
  }

  function getModelDisplay(agentId: string) {
    const a = agents.find((ag) => ag.id === agentId)
    return a ? `${a.name} (${a.config.model.name})` : agentId.slice(0, 8)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl border shadow-lg w-full max-w-4xl h-[85vh] flex flex-col mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Chat - {getModelDisplay(agentId)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleNewSession} className="gap-1">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r bg-muted/30 flex flex-col">
            <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessions</div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2 rounded-md cursor-pointer text-sm transition-colors ${
                      activeSession?.id === s.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    }`}
                    onClick={() => handleSelectSession(s)}
                  >
                    <div className="truncate font-mono text-xs">{s.id.slice(0, 8)}...</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.created_at).toLocaleTimeString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 mt-1"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id) }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {!activeSession && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <MessageSquare className="h-8 w-8" />
                  <p className="text-sm">Select or create a session</p>
                </div>
              )}
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      {msg.role === "user" ? (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground"><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted"><Bot className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {toolLog.length > 0 && (
                  <div className="bg-muted/50 border rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground font-medium mb-1">
                      <Terminal className="h-3 w-3" />
                      Tool Calls
                    </div>
                    {toolLog.map((log, i) => (
                      <div key={i} className="text-muted-foreground">{log}</div>
                    ))}
                  </div>
                )}

                {streaming && streamText && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[80%]">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted"><Bot className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                        {streamText}
                        <span className="animate-pulse">▌</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
            </ScrollArea>

            {activeSession && (
              <div className="border-t p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder={streaming ? "Waiting for response..." : "Type a message..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={streaming}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={streaming || !input.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
