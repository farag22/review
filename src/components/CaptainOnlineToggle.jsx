// src/components/CaptainOnlineToggle.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import CaptainTracker from './CaptainTracker';

export default function CaptainOnlineToggle({ driverId, initialOnlineState = false, onStateChange }) {
  const [isOnline, setIsOnline] = useState(initialOnlineState);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    try {
      setLoading(true);
      const newState = !isOnline;

      const { error } = await supabase
        .from('drivers')
        .update({ 
          is_online: newState,
          last_seen: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) throw error;

      setIsOnline(newState);
      if (onStateChange) onStateChange(newState);
    } catch (err) {
      console.error('Error toggling online status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Background Tracker Component */}
      <CaptainTracker isOnline={isOnline} />

      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">حالة المتصل (أونلاين)</span>
        <p className="text-xs text-gray-500">
          {isOnline ? 'أنت جاهز لاستقبال الطلبات الآن' : 'غير متصل حالياً'}
        </p>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          isOnline ? 'bg-green-600' : 'bg-gray-300'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isOnline ? 'translate-x-1' : 'translate-x-6'
          }`}
        />
      </button>
    </div>
  );
}
