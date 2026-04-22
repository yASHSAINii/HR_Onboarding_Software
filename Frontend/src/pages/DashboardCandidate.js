import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import med from './stethoscope.png';
import si from './siren.png';
import li from './list.png';
import bri from './briefcase.png';

const DashboardCandidate = () => {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({ medical: false, police: false });
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState({ medical: null, police: null });
  const medicalInputRef = useRef(null);
  const policeInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/candidates/documents');
      setDocuments(res.data);
    } catch (err) {
      setError('Failed to load document status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type, file) => {
    setSelectedFile(prev => ({ ...prev, [type]: file }));
    setUploadSuccess(null);
  };

  const handleUpload = async (type) => {
    const file = selectedFile[type];
    if (!file) return alert('Please select a file first');
    setUploading(prev => ({ ...prev, [type]: true }));
    setUploadSuccess(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = type === 'medical' ? '/candidates/documents/medical' : '/candidates/documents/police';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess({ type, success: true });
      setSelectedFile(prev => ({ ...prev, [type]: null }));
      if (type === 'medical' && medicalInputRef.current) medicalInputRef.current.value = '';
      if (type === 'police' && policeInputRef.current) policeInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      setUploadSuccess({ type, success: false, error: msg });
      console.error(msg);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
      setTimeout(() => setUploadSuccess(null), 5000);
    }
  };

  if (loading) return <div className="p-4">Loading dashboard...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!documents) return null;

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-green-100 text-green-800">Completed</span>;
    if (status === 'rejected') return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-red-100 text-red-800">Rejected</span>;
    return <span className="py-1.5 px-3 rounded-full text-xs font-semibold inline-block bg-amber-100 text-amber-800">Pending</span>;
  };

  return (
    <section className="block">
      {/* Welcome banner – exact original gradient */}
      <div className="bg-[linear-gradient(135deg,#4F46E5_0%,#9F1239_70%)] text-white rounded-[12px] p-10 mb-8">
        <h2 className="text-3xl font-bold mb-3">Onboarding Progress</h2>
      </div>

      {/* Stats grid – responsive auto‑fit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Medical Examination Card */}
        <div className="bg-white rounded-[12px] p-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#e3f2fd]">
              <img src={med} height={30} alt="medical" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold">
              <p>Medical Examination</p>
              {getStatusBadge(documents.medical_status)}
            </div>
          </div>
          <div className="pt-[15px]">
            <h4 className="pb-2.5 font-semibold">Upload File</h4>
            <input
              ref={medicalInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => handleFileSelect('medical', e.target.files[0])}
              disabled={uploading.medical || !!documents.medical_file_path}
              className="mb-2 w-full"
            />
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => handleUpload('medical')}
                className="bg-[#4F46E5] text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading.medical || !selectedFile.medical || !!documents.medical_file_path}
              >
                {uploading.medical ? 'Uploading...' : 'Upload'}
              </button>
              {documents.medical_file_path && <span className="text-orange-500 text-sm">✅ Document already uploaded. Contact recruiter for changes.</span>}
              {uploading.medical && <span className="text-sm">Uploading...</span>}
              {uploadSuccess?.type === 'medical' && uploadSuccess.success && <span className="text-green-600 text-sm">✅ Upload successful!</span>}
              {uploadSuccess?.type === 'medical' && !uploadSuccess.success && <span className="text-red-600 text-sm">❌ {uploadSuccess.error}</span>}
            </div>
          </div>
          {documents.medical_reason && documents.medical_status === 'rejected' && (
            <div className="text-red-600 mt-2 text-sm">Reason: {documents.medical_reason}</div>
          )}
        </div>

        {/* Police Verification Card */}
        <div className="bg-white rounded-[12px] p-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#fff3e0]">
              <img src={si} height={30} alt="police" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold">
              <p>Police Verification</p>
              {getStatusBadge(documents.police_status)}
            </div>
          </div>
          <div className="pt-[15px]">
            <h4 className="pb-2.5 font-semibold">Upload File</h4>
            <input
              ref={policeInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => handleFileSelect('police', e.target.files[0])}
              disabled={uploading.police || !!documents.police_file_path}
              className="mb-2 w-full"
            />
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => handleUpload('police')}
                className="bg-[#4F46E5] text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading.police || !selectedFile.police || !!documents.police_file_path}
              >
                {uploading.police ? 'Uploading...' : 'Upload'}
              </button>
              {documents.police_file_path && <span className="text-orange-500 text-sm">✅ Document already uploaded. Contact recruiter for changes.</span>}
              {uploading.police && <span className="text-sm">Uploading...</span>}
              {uploadSuccess?.type === 'police' && uploadSuccess.success && <span className="text-green-600 text-sm">✅ Upload successful!</span>}
              {uploadSuccess?.type === 'police' && !uploadSuccess.success && <span className="text-red-600 text-sm">❌ {uploadSuccess.error}</span>}
            </div>
          </div>
          {documents.police_reason && documents.police_status === 'rejected' && (
            <div className="text-red-600 mt-2 text-sm">Reason: {documents.police_reason}</div>
          )}
        </div>

        {/* Final Clearance Card – status only */}
        <div className="bg-white rounded-[12px] p-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#e8f5e9]">
              <img src={li} height={30} alt="final" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold">
              <p>Final Clearance</p>
              {getStatusBadge(documents.final_status)}
            </div>
          </div>
        </div>

        {/* Joining Letter Card – status only */}
        <div className="bg-white rounded-[12px] p-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#f3e5f5]">
              <img src={bri} height={30} alt="joining" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold">
              <p>Joining Letter</p>
              {getStatusBadge(documents.joining_status)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


export default DashboardCandidate;