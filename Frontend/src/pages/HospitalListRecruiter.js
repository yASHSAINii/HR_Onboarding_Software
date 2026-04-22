import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const HospitalListRecruiter = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const limit = 20;

  useEffect(() => {
    fetchHospitals();
  }, [page, search]);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/recruiter/hospitals?search=${search}&page=${page}&limit=${limit}`);
      setHospitals(res.data.hospitals);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      console.error('Failed to fetch hospitals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      alert('Please fill all fields');
      return;
    }
    try {
      if (editingHospital) {
        await api.put(`/recruiter/hospitals/${editingHospital.id}`, formData);
      } else {
        await api.post('/recruiter/hospitals', formData);
      }
      setShowModal(false);
      setEditingHospital(null);
      setFormData({ name: '', address: '' });
      fetchHospitals();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save hospital');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hospital?')) return;
    try {
      await api.delete(`/recruiter/hospitals/${id}`);
      fetchHospitals();
    } catch (err) {
      alert('Failed to delete hospital');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Please select a CSV file');
      return;
    }
    const formData = new FormData();
    formData.append('csv', uploadFile);
    setUploadStatus('Uploading...');
    try {
      const res = await api.post('/recruiter/hospitals/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus(`✅ ${res.data.message}`);
      fetchHospitals();
      setUploadFile(null);
    } catch (err) {
      setUploadStatus(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <section className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Hospital List</h2>
        <div className="flex gap-2.5">
          <input
            type="text"
            placeholder="Search by name or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2 px-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-indigo-600"
          />
          <button
            className="bg-indigo-600 text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5"
            onClick={() => { setEditingHospital(null); setFormData({ name: '', address: '' }); setShowModal(true); }}
          >
            + Add Hospital
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-[15px]">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
          <p className="text-sm text-gray-600">CSV must have columns: name, address</p>
          <input type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="mt-2" />
          <button onClick={handleFileUpload} className="bg-indigo-600 text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors mt-2.5">
            Upload CSV
          </button>
          {uploadStatus && <p className="mt-2.5">{uploadStatus}</p>}
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-[15px]">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">ID</th>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Name</th>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Address</th>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="py-4 px-3 text-center">Loading...</td></tr>
                ) : hospitals.length === 0 ? (
                  <tr><td colSpan="4" className="py-4 px-3 text-center">No hospitals found</td></tr>
                ) : (
                  hospitals.map(h => (
                    <tr key={h.id} className="hover:bg-[#F9FAFB]">
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">{h.id}</td>
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">{h.name}</td>
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">{h.address}</td>
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">
                        <button
                          onClick={() => { setEditingHospital(h); setFormData({ name: h.name, address: h.address }); setShowModal(true); }}
                          className="bg-indigo-600 text-white border-none py-1 px-2.5 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors mr-2.5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="bg-red-600 text-white border-none py-1 px-2.5 rounded-md cursor-pointer hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
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
        </div>
      </div>

      {/* Modal – fixed overlay with proper Tailwind classes */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-[12px] w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingHospital ? 'Edit Hospital' : 'Add Hospital'}</h3>
              <span
                className="text-3xl cursor-pointer text-[#6B7280] hover:text-[#1F2937] leading-none"
                onClick={() => setShowModal(false)}
              >
                &times;
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5 p-6">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex justify-end gap-3">
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-rose-800 text-white border border-[#E5E7EB] py-1.5 px-2.5 rounded-[12px] font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HospitalListRecruiter;