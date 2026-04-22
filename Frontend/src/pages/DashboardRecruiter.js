import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import med from './stethoscope.png';
import si from './siren.png';
import li from './list.png';
import bri from './briefcase.png';
import noti from './bell.svg';
import righ from './right.png';

const DashboardRecruiter = () => {
  const [batchStats, setBatchStats] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [batchOptions, setBatchOptions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedBatch !== 'all') {
      fetchRecentCandidatesByBatch(selectedBatch);
    } else {
      fetchRecentCandidates();
    }
  }, [selectedBatch]);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/recruiter/dashboard/stats');
      const stats = res.data.batchStats;
      setBatchStats(stats);
      const batches = stats.map(s => s.batch).sort((a, b) => b - a);
      setBatchOptions(batches);
      if (batches.length > 0) setSelectedBatch(batches[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCandidates = async () => {
    try {
      const res = await api.get('/recruiter/users?role=candidate&limit=3');
      setRecentCandidates(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentCandidatesByBatch = async (batch) => {
    try {
      const res = await api.get(`/recruiter/users?role=candidate&batch=${batch}&limit=3`);
      setRecentCandidates(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/recruiter/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRedirect = (statusKey, statusValue) => {
    let url = `/UserManagement?${statusKey}=${statusValue}`;
    if (selectedBatch !== 'all') url += `&batch=${selectedBatch}`;
    navigate(url);
  };

  const getCurrentStage = (candidate) => {
    if (candidate.medical_status !== 'completed') return 'medical';
    if (candidate.police_status !== 'completed') return 'police';
    if (candidate.final_status !== 'completed') return 'final';
    if (candidate.joining_status !== 'completed') return 'joining';
    return 'completed';
  };

  if (loading) return <div className="p-4">Loading dashboard...</div>;

  // Aggregate stats
  let totalCandidates = 0;
  let pendingMedical = 0, pendingPolice = 0, pendingFinal = 0, pendingJoining = 0;

  if (selectedBatch === 'all') {
    totalCandidates = batchStats.reduce((sum, b) => sum + b.total, 0);
    pendingMedical = batchStats.reduce((sum, b) => sum + b.medical.pending, 0);
    pendingPolice = batchStats.reduce((sum, b) => sum + b.police.pending, 0);
    pendingFinal = batchStats.reduce((sum, b) => sum + b.final.pending, 0);
    pendingJoining = batchStats.reduce((sum, b) => sum + b.joining.pending, 0);
  } else {
    const statsForBatch = batchStats.find(b => b.batch === parseInt(selectedBatch));
    if (statsForBatch) {
      totalCandidates = statsForBatch.total;
      pendingMedical = statsForBatch.medical.pending;
      pendingPolice = statsForBatch.police.pending;
      pendingFinal = statsForBatch.final.pending;
      pendingJoining = statsForBatch.joining.pending;
    }
  }

  return (
    <section className="block">

      <div className="bg-[linear-gradient(135deg,#4F46E5_0%,#9F1239_70%)] text-white rounded-[12px] p-10 mb-8">
        <h2 className="text-3xl font-bold mb-3">Recruitment Overview</h2>
        <div className="flex items-center gap-5 mt-2.5">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="py-2 px-3 rounded-lg border border-gray-300 bg-white text-[#1F2937] focus:outline-none"
          >
            <option value="all">All Batches</option>
            {batchOptions.map(batch => (
              <option key={batch} value={batch}>Batch {batch}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats grid – original .stats-grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Medical Card – original .stat-card */}
        <div className="bg-white rounded-[12px] p-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] border border-gray-200">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#e3f2fd]">
              <img src={med} height={30} alt="medical" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1">
              <p>Medical Examination</p>
              <h5 className="text-[#6B7280] text-sm pl-2 pt-1.5">{totalCandidates}</h5>
            </div>
          </div>
          <div className="text-gray-700 pt-4 flex justify-between border-t border-gray-100 mt-2">
            <p className="text-sm">Candidates Pending</p>
            <p className="font-semibold">{pendingMedical}</p>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <p className="text-sm">Manage Queue</p>
            <button className="cursor-pointer bg-transparent border-0 p-0" onClick={() => handleRedirect('medical_status', 'pending')}>
              <img src={righ} height={15} alt="arrow" className="h-[15px] w-auto" />
            </button>
          </div>
        </div>

        {/* Police Card */}
        <div className="bg-white rounded-[12px] p-[15px] border border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#fff3e0]">
              <img src={si} height={30} alt="police" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1">
              <p>Police Verification</p>
              <h5 className="text-[#6B7280] text-sm pl-2 pt-1.5">{totalCandidates}</h5>
            </div>
          </div>
          <div className="text-gray-700 pt-4 flex justify-between border-t border-gray-100 mt-2">
            <p className="text-sm">Candidates Pending</p>
            <p className="font-semibold">{pendingPolice}</p>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <p className="text-sm">Manage Queue</p>
            <button className="cursor-pointer bg-transparent border-0 p-0" onClick={() => handleRedirect('police_status', 'pending')}>
              <img src={righ} height={15} alt="arrow" className="h-[15px] w-auto" />
            </button>
          </div>
        </div>

        {/* Final Clearance Card */}
        <div className="bg-white rounded-[12px] p-[15px] border border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#e8f5e9]">
              <img src={li} height={30} alt="final" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1">
              <p>Final Clearance</p>
              <h5 className="text-[#6B7280] text-sm pl-2 pt-1.5">{totalCandidates}</h5>
            </div>
          </div>
          <div className="text-gray-700 pt-4 flex justify-between border-t border-gray-100 mt-2">
            <p className="text-sm">Candidates Pending</p>
            <p className="font-semibold">{pendingFinal}</p>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <p className="text-sm">Manage Queue</p>
            <button className="cursor-pointer bg-transparent border-0 p-0" onClick={() => handleRedirect('final_status', 'pending')}>
              <img src={righ} height={15} alt="arrow" className="h-[15px] w-auto" />
            </button>
          </div>
        </div>

        {/* Joining Letter Card */}
        <div className="bg-white rounded-[12px] p-[15px] border border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-[12px] flex items-center justify-center bg-[#f3e5f5]">
              <img src={bri} height={30} alt="joining" className="h-[30px] w-auto" />
            </div>
            <div className="text-[17.2px] font-bold mt-1.5 mb-1">
              <p>Joining Letter</p>
              <h5 className="text-[#6B7280] text-sm pl-2 pt-1.5">{totalCandidates}</h5>
            </div>
          </div>
          <div className="text-gray-700 pt-4 flex justify-between border-t border-gray-100 mt-2">
            <p className="text-sm">Candidates Pending</p>
            <p className="font-semibold">{pendingJoining}</p>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <p className="text-sm">Manage Queue</p>
            <button className="cursor-pointer bg-transparent border-0 p-0" onClick={() => handleRedirect('joining_status', 'pending')}>
              <img src={righ} height={15} alt="arrow" className="h-[15px] w-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom grid – original .content-grid */}
       <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Recent New Hires card – original .card */}
        <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] border border-gray-200">
          <div className="py-5 px-6 border-b border-[#E5E7EB] flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent New Hires</h3>
            <button
              onClick={() => navigate('/UserManagement')}
              className="text-[#4F46E5] no-underline font-medium text-sm bg-transparent border-0 cursor-pointer hover:underline"
            >
              View All
            </button>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Name</th>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Email</th>
                  <th className="text-left p-3 font-semibold text-[#6B7280] border-b-2 border-[#E5E7EB]">Current Stage</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map(candidate => {
                  const stage = getCurrentStage(candidate);
                  let stageText = '';
                  if (stage === 'medical') stageText = 'Medical Pending';
                  else if (stage === 'police') stageText = 'Police Pending';
                  else if (stage === 'final') stageText = 'Final Clearance Pending';
                  else if (stage === 'joining') stageText = 'Joining Letter Pending';
                  else stageText = 'Completed';
                  return (
                    <tr key={candidate.employee_id} className="hover:bg-[#F9FAFB]">
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">
                        <strong>{candidate.first_name} {candidate.last_name}</strong>
                      </td>
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">{candidate.email}</td>
                      <td className="py-4 px-3 border-b border-[#E5E7EB]">
                        <span className={`py-1.5 px-3 rounded-full text-xs font-semibold inline-block ${
                          stage === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {stageText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentCandidates.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 px-3 text-center text-gray-500">No candidates found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications card – original .noticard */}
        <div className="bg-white rounded-[12px] border border-gray-200 p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <img src={noti} height={18} alt="bell" className="h-[18px] w-auto" />
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="h-[280px] overflow-y-auto overflow-x-hidden">
            <ul className="list-none p-0 m-0">
              {notifications.length === 0 && <li className="p-2.5 text-gray-500">No notifications</li>}
              {notifications.map(notif => (
                <li key={notif.id} className="p-2.5 border-b border-gray-200 last:border-0">{notif.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardRecruiter;