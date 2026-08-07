import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { processComplaint, correctField, messageAdded } from '../features/complaint/complaintSlice'

export default function CopilotChat() {
  const dispatch = useDispatch()
  const { chatMessages, fields, loading } = useSelector((s) => s.complaint)
  const [input, setInput] = useState('')
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return

    dispatch(messageAdded({ role: 'user', text }))
    setInput('')

    if (!hasSubmittedOnce) {
      // First message = the raw complaint to extract from.
      dispatch(processComplaint({ text }))
      setHasSubmittedOnce(true)
    } else {
      // Later messages = corrections to the already-filled form.
      dispatch(correctField({ message: text, currentFields: fields }))
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    dispatch(messageAdded({ role: 'user', text: `📄 ${file.name}` }))
    dispatch(processComplaint({ file }))
    setHasSubmittedOnce(true)
    e.target.value = '' // allow re-uploading the same file later
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>🧪 AIVOA Copilot</h2>
        <p>Drop complaint files or paste text below.</p>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {chatMessages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : m.role === 'error' ? 'msg-error' : 'msg-ai'}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="msg msg-ai">Thinking…</div>}
      </div>

      <div className="chat-input-row">
        <label className="file-label">
          📎
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.txt,.eml"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>
        <input
          type="text"
          placeholder={hasSubmittedOnce ? 'Type a correction...' : 'Paste a complaint email or text...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
