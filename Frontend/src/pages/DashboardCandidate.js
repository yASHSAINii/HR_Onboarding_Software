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
      fetchDocuments(); // refresh
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
    <section id="dashboard" className="block">
      <div className="bg-gradient-to-br from-primary to-rose-800 text-white rounded-12px p-10 mb-8">
        <h2 className="text-3xl font-bold mb-3">Onboarding Progress</h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 mb-8">
        {/* Medical Examination Card */}
        <div className="bg-white rounded-12px p-[15px] items-center gap-5 shadow-custom">
          <div className="flex">
            <div className="w-15 h-15 rounded-12px flex items-center justify-center bg-blue-50">
              <img src={med} height={30} alt="medical" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1 pl-2">
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
              className="mb-2"
            />
            <div>
              <button
                onClick={() => handleUpload('medical')}
                className="bg-primary text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                disabled={uploading.medical || !selectedFile.medical || !!documents.medical_file_path}
              >
                {uploading.medical ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {documents.medical_file_path && <span className="text-orange-500 ml-2.5 inline-block mt-2">✅ Document already uploaded. Contact recruiter for changes.</span>}
            {uploading.medical && <span className="ml-2.5">Uploading...</span>}
            {uploadSuccess?.type === 'medical' && uploadSuccess.success && <span className="text-green-600 ml-2.5">✅ Upload successful!</span>}
            {uploadSuccess?.type === 'medical' && !uploadSuccess.success && <span className="text-red-600 ml-2.5">❌ {uploadSuccess.error}</span>}
          </div>
          {documents.medical_reason && documents.medical_status === 'rejected' && (
            <div className="text-red-600 mt-2 text-sm">Reason: {documents.medical_reason}</div>
          )}
        </div>

        {/* Police Verification Card */}
        <div className="bg-white rounded-12px p-[15px] items-center gap-5 shadow-custom">
          <div className="flex">
            <div className="w-15 h-15 rounded-12px flex items-center justify-center bg-amber-50">
              <img src={si} height={30} alt="police" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1 pl-2">
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
              className="mb-2"
            />
            <div>
              <button
                onClick={() => handleUpload('police')}
                className="bg-primary text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                disabled={uploading.police || !selectedFile.police || !!documents.police_file_path}
              >
                {uploading.police ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {documents.police_file_path && <span className="text-orange-500 ml-2.5 inline-block mt-2">✅ Document already uploaded. Contact recruiter for changes.</span>}
            {uploading.police && <span className="ml-2.5">Uploading...</span>}
            {uploadSuccess?.type === 'police' && uploadSuccess.success && <span className="text-green-600 ml-2.5">✅ Upload successful!</span>}
            {uploadSuccess?.type === 'police' && !uploadSuccess.success && <span className="text-red-600 ml-2.5">❌ {uploadSuccess.error}</span>}
          </div>
          {documents.police_reason && documents.police_status === 'rejected' && (
            <div className="text-red-600 mt-2 text-sm">Reason: {documents.police_reason}</div>
          )}
        </div>

        {/* Final Clearance Card – status only */}
        <div className="bg-white rounded-12px p-[15px] items-center gap-5 shadow-custom">
          <div className="flex">
            <div className="w-15 h-15 rounded-12px flex items-center justify-center bg-green-50">
              <img src={li} height={30} alt="final" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1 pl-2">
              <p>Final Clearance</p>
              {getStatusBadge(documents.final_status)}
            </div>
          </div>
        </div>

        {/* Joining Letter Card – status only */}
        <div className="bg-white rounded-12px p-[15px] items-center gap-5 shadow-custom">
          <div className="flex">
            <div className="w-15 h-15 rounded-12px flex items-center justify-center bg-purple-50">
              <img src={bri} height={30} alt="joining" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1 pl-2">
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