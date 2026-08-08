import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL

const emptyFields = {
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_number: '',
  affected_quantity: '',
  manufacturing_date: '',
  expiry_date: '',
  originating_site_block: '',
  impacted_npm: '',
  complaint_category: '',
  complaint_description: '',
}

const emptyRisk = {
  severity_suggested: '',
  suggested_next_action: '',
  initial_risk_assessment: '',
}

const initialState = {
  fields: { ...emptyFields },
  risk: { ...emptyRisk },
  chatMessages: [
    {
      role: 'ai',
      text: 'Ready to process new complaints. Paste the raw complaint email/text below, or upload a PDF, and I will extract the details and run an initial risk assessment.',
    },
  ],
  status: 'Pending Triage', // Pending Triage -> Ready to Commit -> Committed
  loading: false,
  error: null,
}

// --- Async thunks: these are the calls to our FastAPI backend ---

export const processComplaint = createAsyncThunk(
  'complaint/processComplaint',
  async ({ text, file }) => {
    const formData = new FormData()
    if (text) formData.append('text', text)
    if (file) formData.append('file', file)
    const res = await axios.post(`${API_BASE}/api/process-complaint`, formData)
    return res.data
  }
)

export const correctField = createAsyncThunk(
  'complaint/correctField',
  async ({ message, currentFields }) => {
    const formData = new FormData()
    formData.append('message', message)
    formData.append('current_form', JSON.stringify(currentFields))
    const res = await axios.post(`${API_BASE}/api/correct-field`, formData)
    return res.data
  }
)

export const checkDuplicate = createAsyncThunk(
  'complaint/checkDuplicate',
  async ({ productName, batchNumber }) => {
    const res = await axios.get(`${API_BASE}/api/check-duplicate`, {
      params: { product_name: productName, batch_number: batchNumber },
    })
    return res.data
  }
)

export const commitComplaint = createAsyncThunk(
  'complaint/commitComplaint',
  async (payload) => {
    const res = await axios.post(`${API_BASE}/api/commit-complaint`, payload)
    return res.data
  }
)

function isFormComplete(fields) {
  // "Ready to Commit" once the essentials are filled in.
  const required = ['customer_name', 'product_name', 'batch_number', 'complaint_description']
  return required.every((key) => fields[key] && fields[key].trim() !== '')
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    fieldChanged(state, action) {
      const { field, value } = action.payload
      // Route the update to the right slice of state depending on which field it is.
      if (field in emptyRisk) {
        state.risk[field] = value
      } else {
        state.fields[field] = value
      }
      if (isFormComplete(state.fields) && state.status === 'Pending Triage') {
        state.status = 'Ready to Commit'
      }
    },
    messageAdded(state, action) {
      state.chatMessages.push(action.payload)
    },
    formReset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      // --- process-complaint (initial extraction from text/PDF) ---
      .addCase(processComplaint.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(processComplaint.fulfilled, (state, action) => {
        state.loading = false
        const data = action.payload
        Object.keys(emptyFields).forEach((key) => {
          if (data[key] !== undefined && data[key] !== null) state.fields[key] = data[key]
        })
        Object.keys(emptyRisk).forEach((key) => {
          if (data[key] !== undefined && data[key] !== null) state.risk[key] = data[key]
        })
        state.chatMessages.push({
          role: 'ai',
          text: 'Complaint parsed successfully. I\'ve extracted the details and generated an initial risk assessment — check the form on the left.',
        })
        if (isFormComplete(state.fields)) state.status = 'Ready to Commit'
      })
      .addCase(processComplaint.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
        state.chatMessages.push({
          role: 'error',
          text: `Sorry, I couldn't process that: ${action.error.message}`,
        })
      })

      // --- correct-field (chat-based corrections) ---
      .addCase(correctField.pending, (state) => {
        state.loading = true
      })
      .addCase(correctField.fulfilled, (state, action) => {
        state.loading = false
        const updates = action.payload
        const changed = []
        Object.keys(updates).forEach((key) => {
          if (key in state.fields) {
            state.fields[key] = updates[key]
            changed.push(key)
          }
        })
        state.chatMessages.push({
          role: 'ai',
          text: changed.length
            ? `Got it — updated ${changed.join(', ')} in the form.`
            : "I didn't find a field to update from that message — could you be more specific?",
        })
      })
      .addCase(correctField.rejected, (state, action) => {
        state.loading = false
        state.chatMessages.push({ role: 'error', text: `Correction failed: ${action.error.message}` })
      })

      // --- commit-complaint (save to DB) ---
      .addCase(commitComplaint.pending, (state) => {
        state.loading = true
      })
      .addCase(commitComplaint.fulfilled, (state) => {
        state.loading = false
        state.status = 'Committed'
        state.chatMessages.push({ role: 'ai', text: 'Complaint committed to the QMS ledger. ✅' })
      })
      .addCase(commitComplaint.rejected, (state, action) => {
        state.loading = false
        state.chatMessages.push({ role: 'error', text: `Commit failed: ${action.error.message}` })
      })
  },
})

export const { fieldChanged, messageAdded, formReset } = complaintSlice.actions
export default complaintSlice.reducer
