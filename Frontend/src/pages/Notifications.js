import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/recruiter/notifications');
      setNotifications(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError('Could not load notifications. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'document_upload':
        return '📄';
      case 'bulk_email':
        return '✉️';
      default:
        return '🔔';
    }
  };

  return (
    <section className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-dark">Notifications</h2>
        <button
          onClick={fetchNotifications}
          disabled={refreshing}
          className="bg-indigo-600 text-white border-none py-2 px-4 rounded-[12px] font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white rounded-12px shadow-custom mt-[15px]">
        <div className="p-6">
          {loading ? (
            <p>Loading notifications...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <ul className="list-none p-0">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className="p-[15px] border-b border-gray-200 flex items-center gap-3"
                >
                  <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                  <div className="flex-1">
                    <div>{notif.message}</div>
                    <small className="text-gray-500">{formatDate(notif.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default Notifications;