import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fieldChanged, commitComplaint, formReset, checkDuplicate, messageAdded } from '../features/complaint/complaintSlice'

// One row of the form. Keeps ComplaintForm below short and readable.
function Field({ label, name, value, onChange, textarea, placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={value || ''}
          placeholder={placeholder || 'Awaiting AI extraction...'}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          placeholder={placeholder || 'Awaiting AI extraction...'}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </div>
  )
}

const statusClass = {
  'Pending Triage': 'status-pending',
  'Ready to Commit': 'status-ready',
  Committed: 'status-committed',
}

export default function ComplaintForm() {
  const dispatch = useDispatch()
  const { fields, risk, status, loading } = useSelector((s) => s.complaint)

  const handleChange = (field, value) => dispatch(fieldChanged({ field, value }))
  
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  const handleCommit = async () => {
    if (!duplicateWarning) {
      try {
        const result = await dispatch(
          checkDuplicate({ productName: fields.product_name, batchNumber: fields.batch_number })
        ).unwrap()

        if (result.duplicate_count > 0) {
          setDuplicateWarning(result)
          dispatch(
            messageAdded({
              role: 'ai',
              text: `⚠️ Found ${result.duplicate_count} existing complaint(s) for this product + batch number (ID(s): ${result.matches
                .map((m) => m.id)
                .join(', ')}). Click "Commit Anyway" if this is genuinely a new complaint.`,
            })
          )
          return
        }
      } catch (e) {
        // if the check itself fails, don't block the user
      }
    }
    dispatch(commitComplaint({ ...fields, ...risk }))
  }

  const handleReset = () => dispatch(formReset())

  return (
    <div className="form-panel">
      <div className="form-header">
        <div>
          <h1>Log Customer Complaint</h1>
          <p>API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className={`status-pill ${statusClass[status]}`}>{status}</span>
      </div>

      <div className="form-section">
        <h2>1. Origin &amp; Customer Details</h2>
        <div className="form-grid">
          <Field label="Complaint Source" name="complaint_source" value={fields.complaint_source} onChange={handleChange} />
          <Field label="Customer Name" name="customer_name" value={fields.customer_name} onChange={handleChange} />
        </div>
      </div>

      <div className="form-section">
        <h2>2. Product &amp; Batch Identification</h2>
        <div className="form-grid">
          <Field label="Product Name" name="product_name" value={fields.product_name} onChange={handleChange} />
          <Field label="Product Strength" name="product_strength" value={fields.product_strength} onChange={handleChange} />
          <Field label="Batch / Lot Number" name="batch_number" value={fields.batch_number} onChange={handleChange} />
          <Field label="Affected Quantity" name="affected_quantity" value={fields.affected_quantity} onChange={handleChange} />
          <Field label="Manufacturing Date" name="manufacturing_date" value={fields.manufacturing_date} onChange={handleChange} />
          <Field label="Expiry Date" name="expiry_date" value={fields.expiry_date} onChange={handleChange} />
        </div>
      </div>

      <div className="form-section">
        <h2>3. Facility &amp; Material Impact</h2>
        <div className="form-grid">
          <Field label="Originating Site Block" name="originating_site_block" value={fields.originating_site_block} onChange={handleChange} />
          <Field label="Impacted Non-Product Materials" name="impacted_npm" value={fields.impacted_npm} onChange={handleChange} placeholder="e.g., Primary packaging" />
        </div>
      </div>

      <div className="form-section">
        <h2>4. Defect Analysis</h2>
        <Field label="Complaint Category" name="complaint_category" value={fields.complaint_category} onChange={handleChange} />
        <div style={{ height: 12 }} />
        <Field
          label="Complaint Description"
          name="complaint_description"
          value={fields.complaint_description}
          onChange={handleChange}
          textarea
          placeholder="AI will synthesize the complaint into a formal QMS description..."
        />
      </div>

      <div className="risk-box">
        <h3>🛡 AI Copilot Risk Assessment</h3>
        <div className="form-grid">
          <Field label="Severity (Suggested)" name="severity_suggested" value={risk.severity_suggested}
            onChange={(name, value) => dispatch(fieldChanged({ field: name, value }))} />
          <Field label="Suggested Next Action" name="suggested_next_action" value={risk.suggested_next_action}
            onChange={(name, value) => dispatch(fieldChanged({ field: name, value }))} />
        </div>
        <div style={{ height: 12 }} />
        <Field label="Initial Risk Assessment" name="initial_risk_assessment" value={risk.initial_risk_assessment}
          onChange={(name, value) => dispatch(fieldChanged({ field: name, value }))} textarea />
      </div>

      <button className="commit-btn" disabled={status !== 'Ready to Commit' || loading} onClick={handleCommit}>
        {loading ? 'Working...' : duplicateWarning ? 'Commit Anyway' : 'Commit to QMS Ledger'}
      </button>

      {status === 'Committed' && (
        <button className="commit-btn" style={{ background: '#e5e7eb', color: '#1a1a2e', marginTop: 10 }} onClick={handleReset}>
          Log Another Complaint
        </button>
      )}
    </div>
  )
}
