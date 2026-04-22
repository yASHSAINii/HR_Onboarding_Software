import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const BulkEmailSender = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    medical_status: '',
    police_status: '',
    final_status: '',
    joining_status: '',
    search: '',
  });
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // Load candidates when batch or filters change
  useEffect(() => {
    if (selectedBatch) {
      loadCandidates();
    }
  }, [selectedBatch, filters]);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/recruiter/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await api.get('/recruiter/users?limit=1000&role=candidate');
      const users = res.data.users;
      const uniqueBatches = [...new Set(users.filter(u => u.batch).map(u => u.batch))];
      setBatches(uniqueBatches.sort((a, b) => b - a));
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('role', 'candidate');
      params.append('batch', selectedBatch);
      if (filters.medical_status) params.append('medical_status', filters.medical_status);
      if (filters.police_status) params.append('police_status', filters.police_status);
      if (filters.final_status) params.append('final_status', filters.final_status);
      if (filters.joining_status) params.append('joining_status', filters.joining_status);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', '1000');

      const res = await api.get(`/recruiter/users?${params.toString()}`);
      setCandidates(res.data.users);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c.employee_id));
    }
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      alert('Please select a template');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Please select at least one candidate');
      return;
    }

    setLoading(true);
    setSendStatus('');
    try {
      const response = await api.post('/recruiter/emails/bulk', {
        templateId: parseInt(selectedTemplateId),
        recipientIds: selectedIds,
      });
      setSendStatus(`✅ ${response.data.message} (Sent to ${response.data.successCount} recipients)`);
    } catch (err) {
      setSendStatus(`❌ Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-amber-100 text-amber-800">—</span>;
    const lower = status.toLowerCase();
    if (lower === 'completed') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-green-100 text-green-800">Completed</span>;
    if (lower === 'rejected') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-red-100 text-red-800">Rejected</span>;
    return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-amber-100 text-amber-800">Pending</span>;
  };

  return (
    <section className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Bulk Email Sender</h2>
      </div>

      {/* Choose Template Card – original .cards */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] m-2">
        <div className="p-[15px]">
          <h3 className="font-semibold text-lg mb-2">Choose Template</h3>
          <div className="w-full pt-2">
            <select
              className="w-full p-[0.8%] rounded-md mb-2 hover:bg-[#e0e0e0] border border-[#E5E7EB] focus:outline-none focus:border-[#4F46E5]"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Select Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Choose Batch Card */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] m-2">
        <div className="p-[15px]">
          <h3 className="font-semibold text-lg mb-2">Choose Batch</h3>
          <div className="w-full pt-2">
            <select
              className="w-full p-[0.8%] rounded-md mb-2 hover:bg-[#e0e0e0] border border-[#E5E7EB] focus:outline-none focus:border-[#4F46E5]"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedBatch && (
        <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] m-2">
          <div className="p-[15px]">
            <h3 className="font-semibold text-lg mb-3">Filters</h3>
            <div className="flex flex-wrap gap-[15px] mb-5">
              <div>
                <label className="text-sm font-medium">Medical:</label>
                <select
                  value={filters.medical_status}
                  onChange={(e) => setFilters({ ...filters, medical_status: e.target.value })}
                  className="ml-2 p-1 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Police:</label>
                <select
                  value={filters.police_status}
                  onChange={(e) => setFilters({ ...filters, police_status: e.target.value })}
                  className="ml-2 p-1 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Final Clearance:</label>
                <select
                  value={filters.final_status}
                  onChange={(e) => setFilters({ ...filters, final_status: e.target.value })}
                  className="ml-2 p-1 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Joining Letter:</label>
                <select
                  value={filters.joining_status}
                  onChange={(e) => setFilters({ ...filters, joining_status: e.target.value })}
                  className="ml-2 p-1 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Search:</label>
                <input
                  type="text"
                  placeholder="Name or Email"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="ml-2 p-1 border border-[#E5E7EB] rounded w-[200px] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div className="mb-2.5">
              <button
                onClick={handleSelectAll}
                className="bg-[#4F46E5] text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-[#4338CA] transition-colors"
              >
                {selectedIds.length === candidates.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="ml-[15px] text-[#6B7280]">
                {selectedIds.length} of {candidates.length} selected
              </span>
            </div>

            {loading ? (
              <p className="text-[#6B7280]">Loading candidates...</p>
            ) : (
              <div className="bg-white w-full max-w-[1120px] h-[180px] overflow-y-auto overflow-x-auto p-4 border border-[#E5E7EB] rounded-md">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB] w-[40px]">Select</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Name</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Email</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Medical</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Police</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Final</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Joining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(candidate => (
                      <tr key={candidate.employee_id} className="hover:bg-[#F9FAFB]">
                        <td className="py-4 px-3 border-b border-[#E5E7EB] text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(candidate.employee_id)}
                            onChange={() => {
                              if (selectedIds.includes(candidate.employee_id)) {
                                setSelectedIds(selectedIds.filter(id => id !== candidate.employee_id));
                              } else {
                                setSelectedIds([...selectedIds, candidate.employee_id]);
                              }
                            }}
                          />
                        </td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">
                          <strong>{candidate.first_name} {candidate.last_name}</strong>
                        </td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{candidate.email}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(candidate.medical_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(candidate.police_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(candidate.final_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(candidate.joining_status)}</td>
                      </tr>
                    ))}
                    {candidates.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-4 px-3 text-center text-[#6B7280]">No candidates found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={loading || selectedIds.length === 0}
              className="mt-5 py-2.5 px-5 bg-[#4F46E5] text-white border-none cursor-pointer rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4338CA] transition-colors"
            >
              {loading ? 'Sending...' : 'Send Emails'}
            </button>
            {sendStatus && <p className="mt-2.5 text-sm">{sendStatus}</p>}
          </div>
        </div>
      )}
    </section>
  );
};

export default BulkEmailSender;