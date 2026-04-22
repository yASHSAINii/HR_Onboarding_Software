import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const HospitalListCandidate = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchHospitals();
  }, [page, search]);

  const fetchHospitals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/candidates/hospitals', {
        params: { search, page, limit }
      });
      // Handle both possible response structures
      if (res.data && res.data.hospitals) {
        setHospitals(res.data.hospitals);
        setTotalPages(res.data.pagination?.pages || 1);
      } else if (Array.isArray(res.data)) {
        setHospitals(res.data);
        setTotalPages(1);
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      console.error('API Error:', err);
      const message = err.response?.data?.error || err.message || 'Failed to load hospitals';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <section id="hospital-list" className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-dark">Hospital List</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or address"
            value={search}
            onChange={handleSearch}
            className="py-2.5 px-4 border border-gray-light rounded-lg font-inherit w-[250px] focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-12px shadow-custom mt-[15px]">
        <div className="p-6">
          {loading && <p>Loading hospitals...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {!loading && !error && hospitals.length === 0 && <p>No hospitals found.</p>}
          {!loading && !error && hospitals.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray border-b-2 border-gray-light">ID</th>
                      <th className="text-left p-3 font-semibold text-gray border-b-2 border-gray-light">Name</th>
                      <th className="text-left p-3 font-semibold text-gray border-b-2 border-gray-light">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.map((hospital) => (
                      <tr key={hospital.id} className="hover:bg-light">
                        <td className="py-4 px-3 border-b border-gray-light">{hospital.id}</td>
                        <td className="py-4 px-3 border-b border-gray-light">{hospital.name}</td>
                        <td className="py-4 px-3 border-b border-gray-light">{hospital.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2.5 mt-5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="bg-rose-800 text-white border border-gray-light py-1.5 px-2.5 rounded-12px font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="py-1.5 px-2.5">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="bg-rose-800 text-white border border-gray-light py-1.5 px-2.5 rounded-12px font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default HospitalListCandidate;