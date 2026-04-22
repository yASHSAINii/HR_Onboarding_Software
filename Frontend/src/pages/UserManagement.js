import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const UserManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    batch: '',
    status: '',
    medical_status: '',
    police_status: '',
    final_status: '',
    joining_status: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);
  const [resendStatus, setResendStatus] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const limit = 20;
  const [batchOptions, setBatchOptions] = useState([]);
  const [resetPassword, setResetPassword] = useState(false);

  // Parse URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newFilters = {
      role: params.get('role') || '',
      batch: params.get('batch') || '',
      status: params.get('status') || '',
      medical_status: params.get('medical_status') || '',
      police_status: params.get('police_status') || '',
      final_status: params.get('final_status') || '',
      joining_status: params.get('joining_status') || '',
      search: params.get('search') || '',
    };
    setFilters(newFilters);
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    fetchUsers();
    fetchBatchOptions();
  }, [page, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (filters.role) params.append('role', filters.role);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.status !== '') params.append('status', filters.status);
      if (filters.medical_status) params.append('medical_status', filters.medical_status);
      if (filters.police_status) params.append('police_status', filters.police_status);
      if (filters.final_status) params.append('final_status', filters.final_status);
      if (filters.joining_status) params.append('joining_status', filters.joining_status);
      if (filters.search) params.append('search', filters.search);

      const res = await api.get(`/recruiter/users?${params.toString()}`);
      setUsers(res.data.users);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchOptions = async () => {
    try {
      const res = await api.get('/recruiter/users?limit=1000&role=candidate');
      const batches = [...new Set(res.data.users.filter(u => u.batch).map(u => u.batch))];
      setBatchOptions(batches.sort((a, b) => b - a));
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Please select a CSV file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('csv', uploadFile);
    try {
      const res = await api.post('/recruiter/candidates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult({ success: true, message: res.data.message });
      setUploadFile(null);
      document.getElementById('csv-upload-input').value = '';
      setTimeout(() => {
        fetchUsers();
        fetchBatchOptions();
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      setUploadResult({ success: false, message: msg });
    } finally {
      setUploading(false);
    }
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams();
    if (newFilters.role) params.set('role', newFilters.role);
    if (newFilters.batch) params.set('batch', newFilters.batch);
    if (newFilters.status !== '') params.set('status', newFilters.status);
    if (newFilters.medical_status) params.set('medical_status', newFilters.medical_status);
    if (newFilters.police_status) params.set('police_status', newFilters.police_status);
    if (newFilters.final_status) params.set('final_status', newFilters.final_status);
    if (newFilters.joining_status) params.set('joining_status', newFilters.joining_status);
    if (newFilters.search) params.set('search', newFilters.search);
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      ph_no: user.ph_no || '',
      batch: user.batch || '',
      role: user.role,
      status: user.status,
      medical_status: user.medical_status || 'pending',
      police_status: user.police_status || 'pending',
      final_status: user.final_status || 'pending',
      joining_status: user.joining_status || 'pending',
      medical_reason: user.medical_reason || '',
      police_reason: user.police_reason || '',
      final_reason: user.final_reason || '',
      joining_reason: user.joining_reason || '',
      medical_file_path: user.medical_file_path,
      medical_original_filename: user.medical_original_filename,
      police_file_path: user.police_file_path,
      police_original_filename: user.police_original_filename,
      medical_upload_allowed: user.medical_upload_allowed ?? true,
      police_upload_allowed: user.police_upload_allowed ?? true,
    });
    setResetPassword(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      await api.patch(`/recruiter/users/${editingUser.employee_id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        ph_no: editForm.ph_no,
        batch: editForm.batch === '' ? null : editForm.batch,
        role: editForm.role,
        status: editForm.status,
      });

      if (editForm.role === 'candidate') {
        const updates = [];
        if (editForm.medical_status !== editingUser.medical_status) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/documents/medical`, { status: editForm.medical_status, reason: editForm.medical_reason || '' }));
        }
        if (editForm.police_status !== editingUser.police_status) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/documents/police`, { status: editForm.police_status, reason: editForm.police_reason || '' }));
        }
        if (editForm.final_status !== editingUser.final_status) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/final-clearance`, { status: editForm.final_status, reason: editForm.final_reason || '' }));
        }
        if (editForm.joining_status !== editingUser.joining_status) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/joining-letter`, { status: editForm.joining_status, reason: editForm.joining_reason || '' }));
        }
        if (editForm.medical_upload_allowed !== (editingUser.medical_upload_allowed ?? true)) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/documents/medical/permission`, { allowed: editForm.medical_upload_allowed }));
        }
        if (editForm.police_upload_allowed !== (editingUser.police_upload_allowed ?? true)) {
          updates.push(api.patch(`/recruiter/candidates/${editingUser.employee_id}/documents/police/permission`, { allowed: editForm.police_upload_allowed }));
        }
        await Promise.all(updates);
      }

      if (resetPassword && editingUser.role === 'candidate') {
        await api.post(`/recruiter/candidates/${editingUser.employee_id}/reset-password`);
        alert('Password reset initiated. New OTP has been sent to the candidate.');
      }

      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update user';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleResendOtp = async (userId) => {
    if (!window.confirm('Resend OTP to this user?')) return;
    setResendStatus({ ...resendStatus, [userId]: 'sending' });
    try {
      await api.post(`/recruiter/candidates/${userId}/resend-otp`);
      setResendStatus({ ...resendStatus, [userId]: 'sent' });
      setTimeout(() => {
        setResendStatus(prev => ({ ...prev, [userId]: undefined }));
      }, 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resend OTP');
      setResendStatus({ ...resendStatus, [userId]: undefined });
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-amber-100 text-amber-800">—</span>;
    const s = status.toLowerCase();
    if (s === 'completed') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-green-100 text-green-800">Completed</span>;
    if (s === 'rejected') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-red-100 text-red-800">Rejected</span>;
    return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-amber-100 text-amber-800">Pending</span>;
  };

  const renderAccountStatus = (status) => {
    return status === 1 ? <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-green-100 text-green-800">Active</span> : <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-red-100 text-red-800">Inactive</span>;
  };

  return (
    <section className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">User Management</h2>
        <div className="flex gap-3">
          <button
            className="bg-[#4F46E5] text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 hover:bg-[#4338CA] hover:-translate-y-0.5"
            onClick={() => setShowUploadModal(true)}
          >
            Upload CSV
          </button>
        </div>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-[15px] mb-5">
        <div className="p-6">
          <div className="flex flex-wrap gap-[15px] items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => updateFilter('role', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batch</label>
              <select
                value={filters.batch}
                onChange={(e) => updateFilter('batch', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Medical</label>
              <select
                value={filters.medical_status}
                onChange={(e) => updateFilter('medical_status', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Police</label>
              <select
                value={filters.police_status}
                onChange={(e) => updateFilter('police_status', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Final</label>
              <select
                value={filters.final_status}
                onChange={(e) => updateFilter('final_status', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Joining</label>
              <select
                value={filters.joining_status}
                onChange={(e) => updateFilter('joining_status', e.target.value)}
                className="p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="Name or Email"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full p-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users table card */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-[15px]">
        <div className="p-6">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">ID</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Name</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Email</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Role</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Batch</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Status</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Medical</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Police</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Final</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Joining</th>
                      <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.employee_id} className="hover:bg-[#F9FAFB]">
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{user.employee_id}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]"><strong>{user.first_name} {user.last_name}</strong></td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{user.email}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{user.role === 'candidate' ? 'Candidate' : 'Recruiter'}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{user.batch || '—'}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderAccountStatus(user.status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(user.medical_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(user.police_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(user.final_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">{renderStatusBadge(user.joining_status)}</td>
                        <td className="py-4 px-3 border-b border-[#E5E7EB]">
                          <button
                            onClick={() => handleEdit(user)}
                            className="bg-[#4F46E5] text-white border-none mb-1 py-1 px-2.5 rounded-md cursor-pointer hover:bg-[#4338CA] transition-colors mr-2"
                          >
                            Edit
                          </button>
                          {user.role === 'candidate' && user.first_login_pending && (
                            <button
                              onClick={() => handleResendOtp(user.employee_id)}
                              className="bg-amber-500 text-white border-none py-1 px-2.5 rounded-md cursor-pointer hover:bg-amber-600 transition-colors"
                            >
                              {resendStatus[user.employee_id] === 'sending' ? '...' : 'Resend OTP'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="11" className="py-4 px-3 text-center">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2.5 mt-5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="bg-rose-800 text-white border border-[#E5E7EB] py-1.5 px-2.5 rounded-[12px] font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="py-1.5 px-2.5">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="bg-rose-800 text-white border border-[#E5E7EB] py-1.5 px-2.5 rounded-[12px] font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-[12px] w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <span
                className="text-3xl cursor-pointer text-[#6B7280] hover:text-[#1F2937] leading-none"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5 p-6">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">First Name</label>
                <input type="text" value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Last Name</label>
                <input type="text" value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Email</label>
                <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Phone</label>
                <input type="text" value={editForm.ph_no || ''} onChange={(e) => setEditForm({ ...editForm, ph_no: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Batch</label>
                <input type="number" value={editForm.batch || ''} onChange={(e) => setEditForm({ ...editForm, batch: e.target.value ? parseInt(e.target.value) : '' })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                  <option value="candidate">Candidate</option>
                  <option value="recruiter">Recruiter</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Account Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: parseInt(e.target.value) })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              {editForm.role === 'candidate' && (
                <>
                  <div className="col-span-2 mb-2.5 p-2.5 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2.5">Uploaded Documents</h4>
                    <div className="flex gap-5 flex-wrap">
                      <div>
                        <strong>Medical:</strong><br/>
                        {editForm.medical_file_path ? (
                          <a href={`http://localhost:5000/api/recruiter/candidates/${editingUser?.employee_id}/documents/medical`} target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline">
                            {editForm.medical_original_filename || 'View File'}
                          </a>
                        ) : (
                          <span>No file uploaded</span>
                        )}
                      </div>
                      <div>
                        <strong>Police:</strong><br/>
                        {editForm.police_file_path ? (
                          <a href={`http://localhost:5000/api/recruiter/candidates/${editingUser?.employee_id}/documents/police`} target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline">
                            {editForm.police_original_filename || 'View File'}
                          </a>
                        ) : (
                          <span>No file uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Medical Upload Allowed</label>
                    <input type="checkbox" checked={editForm.medical_upload_allowed} onChange={(e) => setEditForm({ ...editForm, medical_upload_allowed: e.target.checked })} className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Police Upload Allowed</label>
                    <input type="checkbox" checked={editForm.police_upload_allowed} onChange={(e) => setEditForm({ ...editForm, police_upload_allowed: e.target.checked })} className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col gap-2 border-2 border-red-500 rounded-sm p-2 mb-5">
                    <label className="flex items-center font-bold">
                      <input type="checkbox" checked={resetPassword} onChange={(e) => setResetPassword(e.target.checked)} className="mr-2" />
                      Reset Password (Send new OTP)
                    </label>
                    <small className="text-red-500 ml-[15px]">This will invalidate current password and allow candidate to set a new one via OTP.</small>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Medical Status</label>
                    <select value={editForm.medical_status} onChange={(e) => setEditForm({ ...editForm, medical_status: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {editForm.medical_status === 'rejected' && (
                    <div className="flex flex-col gap-2">
                      <label className="font-medium text-sm">Medical Rejection Reason</label>
                      <input type="text" value={editForm.medical_reason} onChange={(e) => setEditForm({ ...editForm, medical_reason: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Police Status</label>
                    <select value={editForm.police_status} onChange={(e) => setEditForm({ ...editForm, police_status: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {editForm.police_status === 'rejected' && (
                    <div className="flex flex-col gap-2">
                      <label className="font-medium text-sm">Police Rejection Reason</label>
                      <input type="text" value={editForm.police_reason} onChange={(e) => setEditForm({ ...editForm, police_reason: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Final Clearance Status</label>
                    <select value={editForm.final_status} onChange={(e) => setEditForm({ ...editForm, final_status: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {editForm.final_status === 'rejected' && (
                    <div className="flex flex-col gap-2">
                      <label className="font-medium text-sm">Final Clearance Rejection Reason</label>
                      <input type="text" value={editForm.final_reason} onChange={(e) => setEditForm({ ...editForm, final_reason: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-sm">Joining Letter Status</label>
                    <select value={editForm.joining_status} onChange={(e) => setEditForm({ ...editForm, joining_status: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {editForm.joining_status === 'rejected' && (
                    <div className="flex flex-col gap-2">
                      <label className="font-medium text-sm">Joining Letter Rejection Reason</label>
                      <input type="text" value={editForm.joining_reason} onChange={(e) => setEditForm({ ...editForm, joining_reason: e.target.value })} className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#4F46E5]" />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex justify-end gap-3">
              <button onClick={handleSaveEdit} className="bg-[#4F46E5] text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#4338CA] disabled:opacity-50" disabled={updating}>
                {updating ? 'Updating...' : 'Save'}
              </button>
              <button onClick={() => setShowEditModal(false)} className="bg-rose-800 text-white border border-[#E5E7EB] py-1.5 px-2.5 rounded-[12px] font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-[12px] w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="text-lg font-semibold">Upload CSV</h3>
              <span
                className="text-3xl cursor-pointer text-[#6B7280] hover:text-[#1F2937] leading-none"
                onClick={() => setShowUploadModal(false)}
              >
                &times;
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5 p-6">
              <div className="col-span-2 flex flex-col gap-2">
                <label className="font-medium text-sm">CSV File</label>
                <input id="csv-upload-input" type="file" accept=".csv" onChange={handleFileChange} />
                <small className="text-gray-500">CSV must have columns: first_name, last_name, email, ph_no (optional), batch, role (candidate/recruiter)</small>
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex justify-end gap-3">
              <button onClick={handleUpload} className="bg-[#4F46E5] text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#4338CA] disabled:opacity-50" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => setShowUploadModal(false)} className="bg-rose-800 text-white border border-[#E5E7EB] py-1.5 px-2.5 rounded-[12px] font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900">Cancel</button>
            </div>
            {uploadResult && (
              <div className={`px-6 pb-6 ${uploadResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {uploadResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserManagement;